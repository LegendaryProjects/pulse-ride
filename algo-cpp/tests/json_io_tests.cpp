#include "io/json_io.hpp"

#include <cassert>
#include <iostream>
#include <vector>

static void test_vehicle_round_trip()
{
    Vehicle original(
        7,
        VehicleType::BUGGY,
        3,
        4,
        VehicleState::ASSIGNED,
        {Stop(0, 11, Stop::Type::PICKUP), Stop(2, 11, Stop::Type::DROP)},
        {11, 12});

    const json j = vehicleToJson(original);
    const Vehicle parsed = vehicleFromJson(j);

    assert(parsed.id == original.id);
    assert(parsed.type == original.type);
    assert(parsed.capacity == original.capacity);
    assert(parsed.currentLocation == original.currentLocation);
    assert(parsed.state == original.state);
    assert(parsed.route.size() == original.route.size());
    assert(parsed.route[0].location == original.route[0].location);
    assert(parsed.route[0].riderId == original.route[0].riderId);
    assert(parsed.route[0].type == original.route[0].type);
    assert(parsed.currentRiders == original.currentRiders);
}

static void test_ride_request_round_trip()
{
    RideRequest original(42, 1, 8, 100, 150, RequestStatus::PICKED_UP);

    const json j = rideRequestToJson(original);
    const RideRequest parsed = rideRequestFromJson(j);

    assert(parsed.id == original.id);
    assert(parsed.pickupLocation == original.pickupLocation);
    assert(parsed.dropLocation == original.dropLocation);
    assert(parsed.requestTime == original.requestTime);
    assert(parsed.latestPickupTime == original.latestPickupTime);
    assert(parsed.status == original.status);
}

static void test_graph_round_trip()
{
    CampusGraph original(3);
    original.setNodeName(0, "NITK Beach");
    original.setNodeName(1, "Library");
    original.setNodeName(2, "Guest House");
    original.addEdge(0, 1, 120.0, 10.0, false);
    original.addEdge(1, 2, 80.0, 6.0, true);

    const json j = campusGraphToJson(original);
    const CampusGraph parsed = campusGraphFromJson(j);

    assert(parsed.nodeCount() == original.nodeCount());
    assert(parsed.nodeName(0) == original.nodeName(0));
    assert(parsed.nodeName(1) == original.nodeName(1));
    assert(parsed.nodeName(2) == original.nodeName(2));
    assert(parsed.adjacency[0].size() == original.adjacency[0].size());
    assert(parsed.adjacency[0][0].destination == original.adjacency[0][0].destination);
    assert(parsed.adjacency[0][0].distance == original.adjacency[0][0].distance);
    assert(parsed.adjacency[0][0].travelTime == original.adjacency[0][0].travelTime);
}

static void test_assignment_result_round_trip()
{
    AssignmentResult original;
    original.assigned = true;
    original.vehicleId = 9;
    original.route = {Stop(1, 5, Stop::Type::PICKUP), Stop(2, 5, Stop::Type::DROP)};
    original.cost = CostBreakdown();
    original.cost.waiting = 4.0;
    original.cost.travelTime = 8.0;
    original.cost.addDistance = 12.0;
    original.cost.detour = 2.0;
    original.cost.vehiclePenalty = 1.5;
    original.cost.underUtil = 0.4;
    original.cost.total = 19.9;
    original.explanation.vehicleId = 9;
    original.explanation.totalCost = 19.9;
    original.explanation.vehicleStateBefore = "IDLE";
    original.explanation.reason = "lowest cost feasible route";
    original.explanation.breakdown = original.cost;

    const json j = assignmentResultToJson(original);
    const AssignmentResult parsed = assignmentResultFromJson(j);

    assert(parsed.assigned == original.assigned);
    assert(parsed.vehicleId == original.vehicleId);
    assert(parsed.route.size() == original.route.size());
    assert(parsed.route[0].location == original.route[0].location);
    assert(parsed.route[0].type == original.route[0].type);
    assert(parsed.cost.total == original.cost.total);
    assert(parsed.explanation.vehicleId == original.explanation.vehicleId);
    assert(parsed.explanation.totalCost == original.explanation.totalCost);
    assert(parsed.explanation.vehicleStateBefore == original.explanation.vehicleStateBefore);
    assert(parsed.explanation.reason == original.explanation.reason);
    assert(parsed.explanation.breakdown.total == original.explanation.breakdown.total);
}

int main()
{
    test_vehicle_round_trip();
    test_ride_request_round_trip();
    test_graph_round_trip();
    test_assignment_result_round_trip();

    std::cout << "All JSON I/O tests passed." << std::endl;
    return 0;
}
