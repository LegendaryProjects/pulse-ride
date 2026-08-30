#include "fleet_optimizer.hpp"

#include <algorithm>
#include <limits>
#include <sstream>
#include <string>

namespace
{
std::string vehicleStateName(VehicleState state)
{
    switch (state)
    {
    case VehicleState::IDLE:
        return "IDLE";
    case VehicleState::ASSIGNED:
        return "ASSIGNED";
    case VehicleState::ON_TRIP:
        return "ON_TRIP";
    case VehicleState::RETURNING:
        return "RETURNING";
    case VehicleState::MAINTENANCE:
        return "MAINTENANCE";
    default:
        return "UNKNOWN";
    }
}

std::string stopTypeName(Stop::Type type)
{
    return type == Stop::Type::PICKUP ? "PICKUP" : "DROP";
}

std::string explainRoute(const std::vector<Stop>& route)
{
    if (route.empty())
    {
        return "[]";
    }

    std::ostringstream stream;
    for (std::size_t i = 0; i < route.size(); ++i)
    {
        if (i > 0)
        {
            stream << ", ";
        }
        const Stop& stop = route[i];
        stream << stopTypeName(stop.type) << " rider=" << stop.riderId << " @" << stop.location;
    }
    return stream.str();
}

bool preservesExistingRouteOrder(const std::vector<Stop>& originalRoute, const std::vector<Stop>& candidateRoute)
{
    if (originalRoute.empty())
    {
        return true;
    }

    std::size_t originalIndex = 0;
    for (const Stop& candidateStop : candidateRoute)
    {
        if (originalIndex < originalRoute.size() &&
            candidateStop.location == originalRoute[originalIndex].location &&
            candidateStop.riderId == originalRoute[originalIndex].riderId &&
            candidateStop.type == originalRoute[originalIndex].type)
        {
            ++originalIndex;
        }
    }

    return originalIndex == originalRoute.size();
}
}

FleetOptimizer::FleetOptimizer(const CampusGraph& graph,
                             const Weights& weights,
                             const FleetOptimizerConfig& config)
    : campusGraph_(graph),
      weights_(weights),
      config_(config),
      candidateGenerator_(config.shortlistLimit),
      routeInsertionEngine_(graph, weights)
{
}

AssignmentResult FleetOptimizer::optimizeForRequest(std::vector<Vehicle>& fleet,
                                                    RideRequest& request,
                                                    const RoutingEngine& routingEngine) const
{
    const std::vector<int> shortlist = candidateGenerator_.generate(fleet, request, routingEngine);
    if (shortlist.empty())
    {
        request.status = RequestStatus::WAITING;
        AssignmentResult result;
        result.assigned = false;
        result.vehicleId = -1;
        result.explanation.vehicleId = -1;
        result.explanation.reason = "no feasible vehicle: all at capacity";
        result.explanation.vehicleStateBefore = "N/A";
        result.explanation.totalCost = std::numeric_limits<double>::infinity();
        return result;
    }

    const auto estimateCurrentRouteCost = [&](const Vehicle& vehicle)
    {
        if (vehicle.route.empty())
        {
            return 0.0;
        }

        double cost = 0.0;
        if (vehicle.route.size() >= 1)
        {
            cost += routingEngine.travelTime(vehicle.currentLocation, vehicle.route.front().location);
        }
        for (std::size_t i = 0; i + 1 < vehicle.route.size(); ++i)
        {
            cost += routingEngine.travelTime(vehicle.route[i].location, vehicle.route[i + 1].location);
        }
        return cost;
    };

    const auto bestByVehicle = [&](Vehicle& vehicle) -> std::pair<bool, CandidateRoute>
    {
        std::vector<CandidateRoute> insertions = routeInsertionEngine_.generateCandidates(vehicle, request, routingEngine);
        if (insertions.empty())
        {
            return {false, CandidateRoute{}};
        }
        return {true, insertions.front()};
    };

    bool foundBest = false;
    int bestVehicleIndex = -1;
    CandidateRoute bestCandidate;
    double bestCost = std::numeric_limits<double>::infinity();

    for (int vehicleId : shortlist)
    {
        auto it = std::find_if(fleet.begin(), fleet.end(), [vehicleId](const Vehicle& v)
                               {
                                   return v.id == vehicleId;
                               });
        if (it == fleet.end())
        {
            continue;
        }

        Vehicle& vehicle = *it;
        const auto insertionResult = bestByVehicle(vehicle);
        if (!insertionResult.first)
        {
            continue;
        }

        const CandidateRoute& candidate = insertionResult.second;
        if (candidate.cost.total < bestCost)
        {
            bestCost = candidate.cost.total;
            bestCandidate = candidate;
            foundBest = true;
            bestVehicleIndex = static_cast<int>(std::distance(fleet.begin(), it));
        }
    }

    if (!foundBest)
    {
        request.status = RequestStatus::WAITING;
        AssignmentResult result;
        result.assigned = false;
        result.vehicleId = -1;
        result.explanation.vehicleId = -1;
        result.explanation.reason = request.latestPickupTime > 0 ?
                                       "no feasible vehicle: all at capacity or latest pickup deadline exceeded" :
                                       "no feasible vehicle: all at capacity";
        result.explanation.vehicleStateBefore = "N/A";
        result.explanation.totalCost = std::numeric_limits<double>::infinity();
        return result;
    }

    Vehicle& selectedVehicle = fleet[static_cast<std::size_t>(bestVehicleIndex)];
    const double previousCost = estimateCurrentRouteCost(selectedVehicle);
    const double switchingPenalty = config_.switchingPenalty;
    const bool allowReoptimization = config_.allowReoptimization;

    if (allowReoptimization && selectedVehicle.route.size() > 0)
    {
        const double candidateTravelTime = bestCandidate.cost.travelTime;
        const double churnThreshold = previousCost + switchingPenalty;
        if (candidateTravelTime >= churnThreshold)
        {
            request.status = RequestStatus::WAITING;
            AssignmentResult result;
            result.assigned = false;
            result.vehicleId = selectedVehicle.id;
            result.explanation.vehicleId = selectedVehicle.id;
            result.explanation.reason = "re-optimization guard blocked route churn";
            result.explanation.vehicleStateBefore = vehicleStateName(selectedVehicle.state);
            result.explanation.totalCost = bestCandidate.cost.total;
            return result;
        }
    }

    selectedVehicle.route = bestCandidate.route;
    if (selectedVehicle.state == VehicleState::IDLE)
    {
        selectedVehicle.state = VehicleState::ASSIGNED;
    }
    request.status = RequestStatus::ASSIGNED;

    AssignmentResult result;
    result.assigned = true;
    result.vehicleId = selectedVehicle.id;
    result.route = bestCandidate.route;
    result.cost = bestCandidate.cost;
    result.explanation.vehicleId = selectedVehicle.id;
    result.explanation.totalCost = bestCandidate.cost.total;
    result.explanation.breakdown = bestCandidate.cost;
    result.explanation.vehicleStateBefore = vehicleStateName(selectedVehicle.state == VehicleState::ASSIGNED ? VehicleState::IDLE : selectedVehicle.state);
    result.explanation.reason = "assigned by lowest-cost feasible insertion";

    std::ostringstream stream;
    stream << "vehicle=" << selectedVehicle.id
           << ", totalCost=" << bestCandidate.cost.total
           << ", waiting=" << bestCandidate.cost.waiting
           << ", travelTime=" << bestCandidate.cost.travelTime
           << ", addDistance=" << bestCandidate.cost.addDistance
           << ", detour=" << bestCandidate.cost.detour
           << ", vehiclePenalty=" << bestCandidate.cost.vehiclePenalty
           << ", underUtil=" << bestCandidate.cost.underUtil
           << ", route=" << explainRoute(bestCandidate.route);
    result.explanation.reason = stream.str();

    return result;
}
