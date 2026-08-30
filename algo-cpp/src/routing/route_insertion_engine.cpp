#include "route_insertion_engine.hpp"

#include <algorithm>
#include <cmath>
#include <sstream>

namespace
{
std::vector<Stop> insertStops(const std::vector<Stop>& baseRoute,
                             std::size_t pickupPos,
                             std::size_t dropPos,
                             int riderId,
                             int pickupLocation,
                             int dropLocation)
{
    std::vector<Stop> candidate = baseRoute;
    candidate.insert(candidate.begin() + static_cast<std::ptrdiff_t>(pickupPos),
                    Stop(pickupLocation, riderId, Stop::Type::PICKUP));
    candidate.insert(candidate.begin() + static_cast<std::ptrdiff_t>(dropPos + 1),
                    Stop(dropLocation, riderId, Stop::Type::DROP));
    return candidate;
}

bool routeContainsRider(const std::vector<Stop>& route, int riderId)
{
    for (const Stop& stop : route)
    {
        if (stop.riderId == riderId)
        {
            return true;
        }
    }
    return false;
}

double cumulativeTravelTimeToPickup(const Vehicle& vehicle,
                                    const std::vector<Stop>& route,
                                    const RoutingEngine& engine,
                                    std::size_t pickupIndex)
{
    if (route.empty())
    {
        return 0.0;
    }

    double total = 0.0;
    if (pickupIndex == 0)
    {
        return engine.travelTime(vehicle.currentLocation, route.front().location);
    }

    total += engine.travelTime(vehicle.currentLocation, route.front().location);
    for (std::size_t i = 0; i + 1 <= pickupIndex && i + 1 < route.size(); ++i)
    {
        total += engine.travelTime(route[i].location, route[i + 1].location);
    }
    return total;
}
}

RouteInsertionEngine::RouteInsertionEngine(const CampusGraph& graph, const Weights& weights)
    : campusGraph_(graph),
      weights_(weights),
      constraintEngine_(graph)
{
}

std::vector<CandidateRoute> RouteInsertionEngine::generateCandidates(const Vehicle& vehicle,
                                                                    const RideRequest& request,
                                                                    const std::vector<Stop>& oldRoute,
                                                                    const RoutingEngine& engine) const
{
    if (request.latestPickupTime <= request.requestTime)
    {
        return {};
    }

    std::vector<CandidateRoute> candidates;
    const std::vector<Stop>& baseRoute = oldRoute.empty() ? vehicle.route : oldRoute;
    const std::size_t routeSize = baseRoute.size();

    for (std::size_t pickupPos = 0; pickupPos <= routeSize; ++pickupPos)
    {
        for (std::size_t dropPos = pickupPos; dropPos <= routeSize; ++dropPos)
        {
            std::vector<Stop> candidateRoute = baseRoute;
            candidateRoute.insert(candidateRoute.begin() + static_cast<std::ptrdiff_t>(pickupPos),
                                  Stop(request.pickupLocation, request.id, Stop::Type::PICKUP));
            candidateRoute.insert(candidateRoute.begin() + static_cast<std::ptrdiff_t>(dropPos + 1),
                                  Stop(request.dropLocation, request.id, Stop::Type::DROP));

            const ValidationResult validation = constraintEngine_.validate(vehicle, candidateRoute);
            if (!validation.feasible)
            {
                continue;
            }

            std::size_t pickupIndex = std::string::npos;
            for (std::size_t i = 0; i < candidateRoute.size(); ++i)
            {
                if (candidateRoute[i].riderId == request.id && candidateRoute[i].type == Stop::Type::PICKUP)
                {
                    pickupIndex = i;
                    break;
                }
            }

            if (pickupIndex != std::string::npos)
            {
                const double actualPickupTimeMinutes = cumulativeTravelTimeToPickup(vehicle, candidateRoute, engine, pickupIndex);
                const long long actualPickupTimeMs = request.requestTime +
                                                    static_cast<long long>(std::llround(actualPickupTimeMinutes * TRAVEL_TIME_UNIT_MS));
                if (actualPickupTimeMs > request.latestPickupTime)
                {
                    // TODO: support a soft-penalty latestPickupTime variant behind a FleetOptimizerConfig flag once that config exists.
                    continue;
                }
            }

            CandidateRoute candidate;
            candidate.route = candidateRoute;
            candidate.cost = costEngine_.calculateCost(vehicle, oldRoute.empty() ? vehicle.route : oldRoute, candidateRoute, request, engine, weights_);
            candidates.push_back(candidate);
        }
    }

    std::sort(candidates.begin(), candidates.end(), [](const CandidateRoute& lhs, const CandidateRoute& rhs)
              {
                  return lhs.cost.total < rhs.cost.total;
              });

    return candidates;
}

std::vector<CandidateRoute> RouteInsertionEngine::generateCandidates(const Vehicle& vehicle,
                                                                    const RideRequest& request,
                                                                    const RoutingEngine& engine) const
{
    return generateCandidates(vehicle, request, vehicle.route, engine);
}
