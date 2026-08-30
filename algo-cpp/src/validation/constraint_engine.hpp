#pragma once

#include "../core/models.hpp"
#include "../graph/campus_routing.hpp"

#include <string>
#include <unordered_map>
#include <vector>

struct ValidationResult
{
    bool feasible;
    std::string reason;

    ValidationResult() : feasible(true), reason("valid") {}
    ValidationResult(bool feasible, std::string reason)
        : feasible(feasible), reason(std::move(reason))
    {
    }
};

class ConstraintEngine
{
public:
    explicit ConstraintEngine(const CampusGraph& graph);

    ValidationResult validate(const Vehicle& vehicle, const std::vector<Stop>& candidateRoute) const;

private:
    CampusGraph campusGraph_;

    static int passengerCountAfterPrefix(const Vehicle& vehicle,
                                        const std::vector<Stop>& route,
                                        std::size_t prefixLength);
    static bool hasDuplicateStopTypeForRider(const std::vector<Stop>& route, int riderId, Stop::Type type);
};
