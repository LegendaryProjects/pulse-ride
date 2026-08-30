#include "cost_engine.hpp"

#include <cmath>
#include <fstream>
#include <sstream>
#include <stdexcept>
#include <unordered_map>
#include <vector>

namespace
{
    double legFromVehicleToFirstStop(const RoutingEngine& engine, const Vehicle& vehicle, const std::vector<Stop>& route)
    {
        if (route.empty())
        {
            return 0.0;
        }
        return engine.distance(vehicle.currentLocation, route.front().location);
    }

    double legTravelTimeFromVehicleToFirstStop(const RoutingEngine& engine, const Vehicle& vehicle, const std::vector<Stop>& route)
    {
        if (route.empty())
        {
            return 0.0;
        }
        return engine.travelTime(vehicle.currentLocation, route.front().location);
    }

    double routeDistance(const RoutingEngine& engine, const Vehicle& vehicle, const std::vector<Stop>& route)
    {
        if (route.empty())
        {
            return 0.0;
        }

        double total = legFromVehicleToFirstStop(engine, vehicle, route);
        for (std::size_t i = 0; i + 1 < route.size(); ++i)
        {
            const int from = route[i].location;
            const int to = route[i + 1].location;
            total += engine.distance(from, to);
        }
        return total;
    }

    double routeTravelTime(const RoutingEngine& engine, const Vehicle& vehicle, const std::vector<Stop>& route)
    {
        if (route.empty())
        {
            return 0.0;
        }

        double total = legTravelTimeFromVehicleToFirstStop(engine, vehicle, route);
        for (std::size_t i = 0; i + 1 < route.size(); ++i)
        {
            const int from = route[i].location;
            const int to = route[i + 1].location;
            total += engine.travelTime(from, to);
        }
        return total;
    }

    double arrivalTimeAtDrop(const RoutingEngine& engine,
                             const Vehicle& vehicle,
                             const std::vector<Stop>& route,
                             int riderId,
                             int stopIndexOffset)
    {
        double total = legTravelTimeFromVehicleToFirstStop(engine, vehicle, route);
        bool found = false;
        for (std::size_t i = 0; i + 1 < route.size(); ++i)
        {
            const Stop& current = route[i];
            const Stop& next = route[i + 1];
            total += engine.travelTime(current.location, next.location);
            if (i + 1 == static_cast<std::size_t>(stopIndexOffset) && current.riderId == riderId && current.type == Stop::Type::DROP)
            {
                found = true;
            }
        }
        if (!found)
        {
            return 0.0;
        }
        return total;
    }
}

double cumulativeTravelTimeToStop(const RoutingEngine& engine,
                                 const Vehicle& vehicle,
                                 const std::vector<Stop>& route,
                                 std::size_t stopIndex)
{
    if (route.empty())
    {
        return 0.0;
    }

    double total = legTravelTimeFromVehicleToFirstStop(engine, vehicle, route);
    if (stopIndex == 0)
    {
        return total;
    }

    for (std::size_t i = 0; i + 1 <= stopIndex && i + 1 < route.size(); ++i)
    {
        total += engine.travelTime(route[i].location, route[i + 1].location);
    }
    return total;
}

Weights Weights::fromFile(const std::string& path)
{
    std::ifstream file(path);
    if (!file.is_open())
    {
        return defaultWeights();
    }

    Weights weights;
    std::unordered_map<std::string, double> values;
    std::string line;
    while (std::getline(file, line))
    {
        if (line.empty() || line[0] == '#')
        {
            continue;
        }
        std::istringstream stream(line);
        std::string key;
        if (std::getline(stream, key, '='))
        {
            double value = 0.0;
            stream >> value;
            values[key] = value;
        }
    }

    auto readValue = [&](const std::string& key, double& target)
    {
        const auto it = values.find(key);
        if (it != values.end())
        {
            target = it->second;
        }
    };

    readValue("w_w", weights.waiting);
    readValue("w_t", weights.travelTime);
    readValue("w_d", weights.distance);
    readValue("w_r", weights.detour);
    readValue("w_v", weights.vehiclePenalty);
    readValue("w_u", weights.underUtilization);
    readValue("busActivationPenalty", weights.busActivationPenalty);
    readValue("buggyActivationPenalty", weights.buggyActivationPenalty);
    readValue("carActivationPenalty", weights.carActivationPenalty);
    readValue("twoWheelerActivationPenalty", weights.twoWheelerActivationPenalty);

    if (weights.buggyActivationPenalty <= 0.0 && weights.carActivationPenalty > 0.0)
    {
        weights.buggyActivationPenalty = weights.carActivationPenalty;
    }
    if (weights.carActivationPenalty <= 0.0 && weights.buggyActivationPenalty > 0.0)
    {
        weights.carActivationPenalty = weights.buggyActivationPenalty;
    }

    return weights;
}

Weights Weights::defaultWeights()
{
    return Weights();
}

double Weights::activationPenaltyFor(VehicleType type) const
{
    switch (type)
    {
    case VehicleType::TWO_WHEELER:
        return twoWheelerActivationPenalty;
    case VehicleType::BUGGY:
        return buggyActivationPenalty > 0.0 ? buggyActivationPenalty : carActivationPenalty;
    case VehicleType::BUS:
        return busActivationPenalty;
    default:
        return 0.0;
    }
}

CostBreakdown CostEngine::calculateCost(const Vehicle& vehicle,
                                       const std::vector<Stop>& oldRoute,
                                       const std::vector<Stop>& newRoute,
                                       const RideRequest& newRequest,
                                       const RoutingEngine& engine,
                                       const Weights& weights) const
{
    CostBreakdown breakdown;

    const double oldDistance = routeDistance(engine, vehicle, oldRoute);
    const double newDistance = routeDistance(engine, vehicle, newRoute);
    const double newTravelTime = routeTravelTime(engine, vehicle, newRoute);

    breakdown.addDistance = newDistance - oldDistance;
    breakdown.travelTime = newTravelTime;

    std::size_t newPickupIndex = std::string::npos;
    for (std::size_t i = 0; i < newRoute.size(); ++i)
    {
        if (newRoute[i].riderId == newRequest.id && newRoute[i].type == Stop::Type::PICKUP)
        {
            newPickupIndex = i;
            break;
        }
    }

    if (newPickupIndex != std::string::npos)
    {
        const double travelTimeToPickupMinutes = cumulativeTravelTimeToStop(engine, vehicle, newRoute, newPickupIndex);
        const long long actualPickupTimeMs = newRequest.requestTime +
                                            static_cast<long long>(std::llround(travelTimeToPickupMinutes * TRAVEL_TIME_UNIT_MS));
        const long long waitingMs = actualPickupTimeMs - newRequest.requestTime;
        breakdown.waiting = static_cast<double>(waitingMs) / TRAVEL_TIME_UNIT_MS;
    }
    else
    {
        breakdown.waiting = 0.0;
    }

    breakdown.detour = 0.0;
    std::vector<int> oldRidersWithDrop;
    for (const Stop& stop : oldRoute)
    {
        if (stop.riderId <= 0 || stop.type != Stop::Type::DROP)
        {
            continue;
        }

        bool alreadySeen = false;
        for (const int riderId : oldRidersWithDrop)
        {
            if (riderId == stop.riderId)
            {
                alreadySeen = true;
                break;
            }
        }
        if (!alreadySeen)
        {
            oldRidersWithDrop.push_back(stop.riderId);
        }
    }

    for (const int riderId : oldRidersWithDrop)
    {
        if (riderId == newRequest.id)
        {
            continue;
        }

        std::size_t oldDropIndex = std::string::npos;
        for (std::size_t i = 0; i < oldRoute.size(); ++i)
        {
            if (oldRoute[i].riderId == riderId && oldRoute[i].type == Stop::Type::DROP)
            {
                oldDropIndex = i;
                break;
            }
        }

        if (oldDropIndex == std::string::npos)
        {
            continue;
        }

        std::size_t newDropIndex = std::string::npos;
        for (std::size_t i = 0; i < newRoute.size(); ++i)
        {
            if (newRoute[i].riderId == riderId && newRoute[i].type == Stop::Type::DROP)
            {
                newDropIndex = i;
                break;
            }
        }

        if (newDropIndex == std::string::npos)
        {
            continue;
        }

        const double baselineDropTime = cumulativeTravelTimeToStop(engine, vehicle, oldRoute, oldDropIndex);
        const double newDropTime = cumulativeTravelTimeToStop(engine, vehicle, newRoute, newDropIndex);
        const double detourDelta = newDropTime - baselineDropTime;
        if (std::isfinite(detourDelta))
        {
            breakdown.detour += std::max(0.0, detourDelta);
        }
    }

    const bool wasIdle = vehicle.state == VehicleState::IDLE;
    const bool willActivate = oldRoute.empty() && !newRoute.empty() && wasIdle;
    if (willActivate)
    {
        breakdown.vehiclePenalty = weights.activationPenaltyFor(vehicle.type);
    }
    else
    {
        breakdown.vehiclePenalty = 0.0;
    }

    double occupancy = 0.0;
    double maxOccupancy = 0.0;
    for (const Stop& stop : newRoute)
    {
        if (stop.type == Stop::Type::PICKUP)
        {
            ++occupancy;
            maxOccupancy = std::max(maxOccupancy, occupancy);
        }
        else if (stop.type == Stop::Type::DROP)
        {
            --occupancy;
            maxOccupancy = std::max(maxOccupancy, occupancy);
        }
    }

    const double utilization = vehicle.capacity > 0 ? (maxOccupancy / static_cast<double>(vehicle.capacity)) : 0.0;
    breakdown.underUtil = std::max(0.0, 1.0 - utilization);

    breakdown.total = weights.waiting * breakdown.waiting +
                      weights.travelTime * breakdown.travelTime +
                      weights.distance * breakdown.addDistance +
                      weights.detour * breakdown.detour +
                      weights.vehiclePenalty * breakdown.vehiclePenalty +
                      weights.underUtilization * breakdown.underUtil;

    return breakdown;
}
