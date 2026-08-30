#pragma once

#include "../../third_party/json.hpp"
#include "../core/models.hpp"
#include "../graph/campus_routing.hpp"
#include "../optimizer/fleet_optimizer.hpp"
#include "../scoring/cost_engine.hpp"

using json = nlohmann::json;

VehicleType vehicleTypeFromString(const std::string& value, const std::string& field);
std::string vehicleTypeToString(VehicleType type);

VehicleState vehicleStateFromString(const std::string& value, const std::string& field);
std::string vehicleStateToString(VehicleState state);

RequestStatus requestStatusFromString(const std::string& value, const std::string& field);
std::string requestStatusToString(RequestStatus status);

Stop::Type stopTypeFromString(const std::string& value, const std::string& field);
std::string stopTypeToString(Stop::Type type);

Vehicle vehicleFromJson(const json& j);
json vehicleToJson(const Vehicle& v);

RideRequest rideRequestFromJson(const json& j);
json rideRequestToJson(const RideRequest& r);

Stop stopFromJson(const json& j);
json stopToJson(const Stop& s);

CampusGraph campusGraphFromJson(const json& j);
json campusGraphToJson(const CampusGraph& graph);

Weights weightsFromJson(const json& j);
json weightsToJson(const Weights& weights);

FleetOptimizerConfig fleetOptimizerConfigFromJson(const json& j);
json fleetOptimizerConfigToJson(const FleetOptimizerConfig& config);

AssignmentResult assignmentResultFromJson(const json& j);
json assignmentResultToJson(const AssignmentResult& r);

CostBreakdown costBreakdownFromJson(const json& j);
json costBreakdownToJson(const CostBreakdown& c);
