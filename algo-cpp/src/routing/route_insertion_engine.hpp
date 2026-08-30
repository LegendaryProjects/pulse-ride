#pragma once

#include "../scoring/cost_engine.hpp"
#include "../validation/constraint_engine.hpp"

#include <vector>

struct CandidateRoute
{
    std::vector<Stop> route;
    CostBreakdown cost;
};

class RouteInsertionEngine
{
public:
    RouteInsertionEngine(const CampusGraph& graph, const Weights& weights = Weights());

    std::vector<CandidateRoute> generateCandidates(const Vehicle& vehicle,
                                                  const RideRequest& request,
                                                  const std::vector<Stop>& oldRoute,
                                                  const RoutingEngine& engine) const;

    std::vector<CandidateRoute> generateCandidates(const Vehicle& vehicle,
                                                  const RideRequest& request,
                                                  const RoutingEngine& engine) const;

private:
    CampusGraph campusGraph_;
    Weights weights_;
    ConstraintEngine constraintEngine_;
    CostEngine costEngine_;
};
