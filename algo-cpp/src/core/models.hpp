#pragma once

#include <algorithm>
#include <cstddef>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

enum class VehicleType
{
    TWO_WHEELER,
    BUGGY,
    BUS
};

enum class VehicleState
{
    IDLE,
    ASSIGNED,
    ON_TRIP,
    RETURNING,
    MAINTENANCE
};

enum class RequestStatus
{
    WAITING,
    ASSIGNED,
    PICKED_UP,
    COMPLETED,
    CANCELLED
};

struct Stop
{
    enum class Type
    {
        PICKUP,
        DROP
    };

    int location;
    int riderId;
    Type type;

    Stop() : location(0), riderId(-1), type(Type::PICKUP) {}
    Stop(int location, int riderId, Type type)
        : location(location), riderId(riderId), type(type)
    {
    }

    std::string toString() const
    {
        std::ostringstream stream;
        stream << (type == Type::PICKUP ? "PICKUP" : "DROP")
               << " @ location=" << location << ", riderId=" << riderId;
        return stream.str();
    }
};

struct RideRequest
{
    int id;
    int pickupLocation;
    int dropLocation;
    long long requestTime;
    long long latestPickupTime;
    RequestStatus status;

    RideRequest()
        : id(0),
          pickupLocation(0),
          dropLocation(0),
          requestTime(0),
          latestPickupTime(0),
          status(RequestStatus::WAITING)
    {
    }

    RideRequest(int id,
                int pickupLocation,
                int dropLocation,
                long long requestTime,
                long long latestPickupTime,
                RequestStatus status = RequestStatus::WAITING)
        : id(id),
          pickupLocation(pickupLocation),
          dropLocation(dropLocation),
          requestTime(requestTime),
          latestPickupTime(latestPickupTime),
          status(status)
    {
    }
};

struct Vehicle
{
    int id;
    VehicleType type;
    int capacity;
    int currentLocation;
    VehicleState state;
    std::vector<Stop> route;
    std::vector<int> currentRiders;

    Vehicle()
        : id(0),
          type(VehicleType::TWO_WHEELER),
          capacity(1),
          currentLocation(0),
          state(VehicleState::IDLE),
          route(),
          currentRiders()
    {
    }

    Vehicle(int id,
            VehicleType type,
            int capacity,
            int currentLocation = 0,
            VehicleState state = VehicleState::IDLE,
            std::vector<Stop> route = {},
            std::vector<int> currentRiders = {})
        : id(id),
          type(type),
          capacity(capacity),
          currentLocation(currentLocation),
          state(state),
          route(std::move(route)),
          currentRiders(std::move(currentRiders))
    {
    }

    int passengerCountAt(std::size_t index) const;
    std::string debugRouteText() const;
};

inline int passengerCountAtRouteIndex(const Vehicle& vehicle, std::size_t index)
{
    int passengerCount = 0;
    const std::size_t limit = std::min(index, vehicle.route.size());

    for (std::size_t i = 0; i < limit; ++i)
    {
        const Stop& stop = vehicle.route[i];
        if (stop.type == Stop::Type::PICKUP)
        {
            ++passengerCount;
        }
        else if (stop.type == Stop::Type::DROP)
        {
            --passengerCount;
        }
    }

    return passengerCount;
}
