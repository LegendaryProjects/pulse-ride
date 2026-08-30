#include "candidate_vehicle_generator.hpp"

#include <algorithm>
#include <cmath>
#include <limits>
#include <unordered_set>
#include <utility>
#include <vector>

namespace
{
    double routeDistanceFromVehicleToPickup(const Vehicle& vehicle,
                                           const RideRequest& request,
                                           const RoutingEngine& engine)
    {
        if (!vehicle.route.empty())
        {
            const Stop& nextStop = vehicle.route.front();
            return engine.distance(nextStop.location, request.pickupLocation);
        }

        return engine.distance(vehicle.currentLocation, request.pickupLocation);
    }

    double routeDirectionCompatibilityScore(const Vehicle& vehicle,
                                           const RideRequest& request,
                                           const RoutingEngine& engine)
    {
        if (vehicle.route.size() < 2)
        {
            return 0.0;
        }

        const int firstStopLocation = vehicle.route.front().location;
        const int lastStopLocation = vehicle.route.back().location;
        const double firstDistance = engine.distance(firstStopLocation, request.pickupLocation);
        const double lastDistance = engine.distance(lastStopLocation, request.pickupLocation);

        return std::max(0.0, firstDistance - lastDistance);
    }

    int capacityClassRank(const Vehicle& vehicle)
    {
        if (vehicle.capacity <= 2)
        {
            return 0;
        }
        if (vehicle.capacity <= 4)
        {
            return 1;
        }
        if (vehicle.capacity <= 8)
        {
            return 2;
        }
        return 3;
    }

    bool routeHasAvailableCapacity(const Vehicle& vehicle, const RideRequest& request)
    {
        if (vehicle.route.empty())
        {
            return vehicle.currentRiders.size() < vehicle.capacity;
        }

        std::unordered_set<int> onboardRiders(vehicle.currentRiders.begin(), vehicle.currentRiders.end());
        for (const Stop& stop : vehicle.route)
        {
            if (stop.type == Stop::Type::PICKUP && onboardRiders.count(stop.riderId) > 0)
            {
                onboardRiders.erase(stop.riderId);
            }
        }

        int runningOccupancy = static_cast<int>(onboardRiders.size());
        for (const Stop& stop : vehicle.route)
        {
            if (stop.type == Stop::Type::PICKUP)
            {
                ++runningOccupancy;
            }
            else if (stop.type == Stop::Type::DROP)
            {
                --runningOccupancy;
            }

            if (runningOccupancy > vehicle.capacity)
            {
                return false;
            }
        }

        return true;
    }
}

CandidateVehicleGenerator::CandidateVehicleGenerator(std::size_t maxCandidates)
    : maxCandidates_(maxCandidates)
{
}

bool CandidateVehicleGenerator::isVehicleEligible(const Vehicle& vehicle,
                                                 const RideRequest& request,
                                                 const RoutingEngine& engine,
                                                 const std::vector<Stop>& routeForCheck,
                                                 double& heuristicScore)
{
    if (vehicle.state == VehicleState::MAINTENANCE)
    {
        return false;
    }

    if (!routeHasAvailableCapacity(vehicle, request))
    {
        return false;
    }

    const double distanceToPickup = routeDistanceFromVehicleToPickup(vehicle, request, engine);
    const double directionBonus = routeDirectionCompatibilityScore(vehicle, request, engine);
    const int capacityRank = capacityClassRank(vehicle);

    double score = distanceToPickup - (directionBonus * 0.2);
    if (vehicle.state == VehicleState::IDLE)
    {
        score -= static_cast<double>(capacityRank) * 25.0;
    }
    if (vehicle.state == VehicleState::RETURNING)
    {
        score -= 30.0;
    }

    heuristicScore = score;
    return true;
}

std::vector<int> CandidateVehicleGenerator::generate(const std::vector<Vehicle>& fleet,
                                                    const RideRequest& request,
                                                    const RoutingEngine& engine) const
{
    return shortlistVehicles(fleet, request, engine, maxCandidates_);
}

std::vector<int> CandidateVehicleGenerator::shortlistVehicles(const std::vector<Vehicle>& fleet,
                                                             const RideRequest& request,
                                                             const RoutingEngine& engine) const
{
    return shortlistVehicles(fleet, request, engine, maxCandidates_);
}

std::vector<int> CandidateVehicleGenerator::shortlistVehicles(const std::vector<Vehicle>& fleet,
                                                             const RideRequest& request,
                                                             const RoutingEngine& engine,
                                                             std::size_t maxCandidates) const
{
    std::vector<std::pair<int, double>> ranked;

    for (const Vehicle& vehicle : fleet)
    {
        double score = 0.0;
        if (isVehicleEligible(vehicle, request, engine, vehicle.route, score))
        {
            ranked.emplace_back(vehicle.id, score);
        }
    }

    std::sort(ranked.begin(), ranked.end(), [](const std::pair<int, double>& lhs,
                                              const std::pair<int, double>& rhs)
              {
                  return lhs.second < rhs.second;
              });

    std::vector<int> shortlist;
    shortlist.reserve(std::min(maxCandidates, ranked.size()));
    for (const auto& entry : ranked)
    {
        shortlist.push_back(entry.first);
        if (shortlist.size() >= maxCandidates)
        {
            break;
        }
    }

    return shortlist;
}
