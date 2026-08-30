#pragma once

#include "../core/models.hpp"
#include "../graph/campus_routing.hpp"

#include <vector>

struct VehicleShortlistEntry
{
    int vehicleId;
    double score;
};

class CandidateVehicleGenerator
{
public:
    explicit CandidateVehicleGenerator(std::size_t maxCandidates = 10);

    std::vector<int> generate(const std::vector<Vehicle>& fleet,
                              const RideRequest& request,
                              const RoutingEngine& engine) const;

    std::vector<int> shortlistVehicles(const std::vector<Vehicle>& fleet,
                                       const RideRequest& request,
                                       const RoutingEngine& engine) const;

    std::vector<int> shortlistVehicles(const std::vector<Vehicle>& fleet,
                                       const RideRequest& request,
                                       const RoutingEngine& engine,
                                       std::size_t maxCandidates) const;

private:
    std::size_t maxCandidates_;

    static bool isVehicleEligible(const Vehicle& vehicle,
                                 const RideRequest& request,
                                 const RoutingEngine& engine,
                                 const std::vector<Stop>& routeForCheck,
                                 double& heuristicScore);
};
