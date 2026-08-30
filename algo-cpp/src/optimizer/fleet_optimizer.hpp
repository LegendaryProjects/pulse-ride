#pragma once

#include "../routing/candidate_vehicle_generator.hpp"
#include "../routing/route_insertion_engine.hpp"
#include "../scoring/cost_engine.hpp"

#include <string>
#include <vector>

struct AssignmentExplanation
{
    int vehicleId;
    double totalCost;
    std::string vehicleStateBefore;
    std::string reason;
    CostBreakdown breakdown;
};

struct AssignmentResult
{
    bool assigned;
    int vehicleId;
    std::vector<Stop> route;
    CostBreakdown cost;
    AssignmentExplanation explanation;
};

struct FleetOptimizerConfig
{
    std::size_t shortlistLimit;
    double switchingPenalty;
    bool allowReoptimization;

    FleetOptimizerConfig()
        : shortlistLimit(10),
          switchingPenalty(25.0),
          allowReoptimization(true)
    {
    }
};

class FleetOptimizer
{
public:
    FleetOptimizer(const CampusGraph& graph,
                   const Weights& weights = Weights(),
                   const FleetOptimizerConfig& config = FleetOptimizerConfig());

    AssignmentResult optimizeForRequest(std::vector<Vehicle>& fleet,
                                        RideRequest& request,
                                        const RoutingEngine& routingEngine) const;

private:
    CampusGraph campusGraph_;
    Weights weights_;
    FleetOptimizerConfig config_;
    CandidateVehicleGenerator candidateGenerator_;
    RouteInsertionEngine routeInsertionEngine_;
};
