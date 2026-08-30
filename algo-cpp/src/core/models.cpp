#include "models.hpp"

int Vehicle::passengerCountAt(std::size_t index) const
{
    return passengerCountAtRouteIndex(*this, index);
}

std::string Vehicle::debugRouteText() const
{
    std::ostringstream stream;
    stream << "Vehicle{id=" << id << ", type=" << static_cast<int>(type)
           << ", capacity=" << capacity << ", currentLocation=" << currentLocation
           << ", state=" << static_cast<int>(state) << ", routeSize=" << route.size()
           << "}";

    if (route.empty())
    {
        stream << " [no stops]";
        return stream.str();
    }

    stream << "\n  route:";
    for (std::size_t i = 0; i < route.size(); ++i)
    {
        const Stop& stop = route[i];
        stream << "\n    [" << i << "] " << stop.toString()
               << ", runningPassengers=" << passengerCountAtRouteIndex(*this, i + 1);
    }

    return stream.str();
}
