#include "constraint_engine.hpp"

#include <sstream>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>
#include <utility>

ConstraintEngine::ConstraintEngine(const CampusGraph& graph)
    : campusGraph_(graph)
{
}

int ConstraintEngine::passengerCountAfterPrefix(const Vehicle& vehicle,
                                               const std::vector<Stop>& route,
                                               std::size_t prefixLength)
{
    std::unordered_set<int> onboardRiders(vehicle.currentRiders.begin(), vehicle.currentRiders.end());

    for (std::size_t i = 0; i < prefixLength && i < route.size(); ++i)
    {
        const Stop& stop = route[i];
        if (stop.type == Stop::Type::PICKUP && onboardRiders.count(stop.riderId) > 0)
        {
            onboardRiders.erase(stop.riderId);
        }
    }

    int count = static_cast<int>(onboardRiders.size());
    for (std::size_t i = 0; i < prefixLength && i < route.size(); ++i)
    {
        if (route[i].type == Stop::Type::PICKUP)
        {
            ++count;
        }
        else if (route[i].type == Stop::Type::DROP)
        {
            --count;
        }
    }
    return count;
}

bool ConstraintEngine::hasDuplicateStopTypeForRider(const std::vector<Stop>& route,
                                                    int riderId,
                                                    Stop::Type type)
{
    int occurrences = 0;
    for (const Stop& stop : route)
    {
        if (stop.riderId == riderId && stop.type == type)
        {
            ++occurrences;
            if (occurrences > 1)
            {
                return true;
            }
        }
    }
    return false;
}

ValidationResult ConstraintEngine::validate(const Vehicle& vehicle, const std::vector<Stop>& candidateRoute) const
{
    if (vehicle.state == VehicleState::MAINTENANCE)
    {
        return {false, "Vehicle is in MAINTENANCE state."};
    }

    for (std::size_t i = 0; i < candidateRoute.size(); ++i)
    {
        const Stop& stop = candidateRoute[i];
        if (stop.location < 0 || stop.location >= campusGraph_.nodeCount())
        {
            std::ostringstream reason;
            reason << "Unknown location " << stop.location << " at route index " << i << ".";
            return {false, reason.str()};
        }

        const int passengersAfterStop = passengerCountAfterPrefix(vehicle, candidateRoute, i + 1);
        if (passengersAfterStop > vehicle.capacity)
        {
            std::ostringstream reason;
            reason << "Capacity exceeded at route index " << i << ": " << passengersAfterStop
                   << " passengers > capacity " << vehicle.capacity << ".";
            return {false, reason.str()};
        }
    }

    std::unordered_map<int, std::pair<int, int>> riderEvents;
    for (std::size_t i = 0; i < candidateRoute.size(); ++i)
    {
        const Stop& stop = candidateRoute[i];
        if (stop.riderId < 0)
        {
            continue;
        }

        auto it = riderEvents.find(stop.riderId);
        if (it == riderEvents.end())
        {
            riderEvents[stop.riderId] = {0, 0};
            it = riderEvents.find(stop.riderId);
        }

        if (stop.type == Stop::Type::PICKUP)
        {
            if (it->second.first > 0)
            {
                std::ostringstream reason;
                reason << "Rider " << stop.riderId << " has duplicate PICKUP stop.";
                return {false, reason.str()};
            }
            it->second.first = static_cast<int>(i + 1);
        }
        else
        {
            if (it->second.second > 0)
            {
                std::ostringstream reason;
                reason << "Rider " << stop.riderId << " has duplicate DROP stop.";
                return {false, reason.str()};
            }
            it->second.second = static_cast<int>(i + 1);
        }

        if (it->second.first > 0 && it->second.second > 0 && it->second.first >= it->second.second)
        {
            std::ostringstream reason;
            reason << "Rider " << stop.riderId << " has DROP before PICKUP or same-index ordering issue.";
            return {false, reason.str()};
        }
    }

    std::unordered_set<int> ridersWithPickup;
    std::unordered_set<int> ridersWithDrop;
    for (const Stop& stop : candidateRoute)
    {
        if (stop.riderId < 0)
        {
            continue;
        }

        if (stop.type == Stop::Type::PICKUP)
        {
            if (!ridersWithPickup.insert(stop.riderId).second)
            {
                std::ostringstream reason;
                reason << "Rider " << stop.riderId << " has multiple PICKUP stops.";
                return {false, reason.str()};
            }
        }
        else if (stop.type == Stop::Type::DROP)
        {
            if (!ridersWithDrop.insert(stop.riderId).second)
            {
                std::ostringstream reason;
                reason << "Rider " << stop.riderId << " has multiple DROP stops.";
                return {false, reason.str()};
            }
        }
    }

    std::unordered_map<int, int> firstPickupIndex;
    std::unordered_map<int, int> firstDropIndex;
    for (std::size_t i = 0; i < candidateRoute.size(); ++i)
    {
        const Stop& stop = candidateRoute[i];
        if (stop.riderId < 0)
        {
            continue;
        }

        if (stop.type == Stop::Type::PICKUP)
        {
            if (firstPickupIndex.count(stop.riderId) == 0)
            {
                firstPickupIndex[stop.riderId] = static_cast<int>(i);
            }
        }
        else
        {
            if (firstDropIndex.count(stop.riderId) == 0)
            {
                firstDropIndex[stop.riderId] = static_cast<int>(i);
            }
        }

        if (firstPickupIndex.count(stop.riderId) > 0 && firstDropIndex.count(stop.riderId) > 0 &&
            firstPickupIndex.at(stop.riderId) >= firstDropIndex.at(stop.riderId))
        {
            std::ostringstream reason;
            reason << "Rider " << stop.riderId << " appears to drop before pickup in the route sequence.";
            return {false, reason.str()};
        }
    }

    return {true, "valid"};
}
