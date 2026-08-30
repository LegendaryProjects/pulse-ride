#pragma once

#include "../core/models.hpp"
#include "../graph/campus_routing.hpp"

#include <string>
#include <vector>

inline constexpr double TRAVEL_TIME_UNIT_MS = 60000.0;

struct Weights
{
    double waiting;
    double travelTime;
    double distance;
    double detour;
    double vehiclePenalty;
    double underUtilization;
    double busActivationPenalty;
    double buggyActivationPenalty;
    double carActivationPenalty;
    double twoWheelerActivationPenalty;

    Weights()
        : waiting(1.0),
          travelTime(1.0),
          distance(0.5),
          detour(2.0),
          vehiclePenalty(1.0),
          underUtilization(1.0),
          busActivationPenalty(20.0),
          buggyActivationPenalty(12.0),
          carActivationPenalty(12.0),
          twoWheelerActivationPenalty(6.0)
    {
    }

    static Weights fromFile(const std::string& path);
    static Weights defaultWeights();

    double activationPenaltyFor(VehicleType type) const;
};

struct CostBreakdown
{
    double waiting;
    double travelTime;
    double addDistance;
    double detour;
    double vehiclePenalty;
    double underUtil;
    double total;

    CostBreakdown()
        : waiting(0.0),
          travelTime(0.0),
          addDistance(0.0),
          detour(0.0),
          vehiclePenalty(0.0),
          underUtil(0.0),
          total(0.0)
    {
    }
};

class CostEngine
{
public:
    CostBreakdown calculateCost(const Vehicle& vehicle,
                                const std::vector<Stop>& oldRoute,
                                const std::vector<Stop>& newRoute,
                                const RideRequest& newRequest,
                                const RoutingEngine& engine,
                                const Weights& weights) const;
};

double cumulativeTravelTimeToStop(const RoutingEngine& engine,
                                 const Vehicle& vehicle,
                                 const std::vector<Stop>& route,
                                 std::size_t stopIndex);
