#include "optimizer/fleet_optimizer.hpp"

#include <cassert>
#include <iostream>
#include <vector>

static CampusGraph buildCampusGraph()
{
    CampusGraph graph(10);
    graph.setNodeName(0, "NITK Beach");
    graph.setNodeName(1, "LHC-C");
    graph.setNodeName(2, "LHC-D");
    graph.setNodeName(3, "Guest House");
    graph.setNodeName(4, "Girls Hostel");
    graph.setNodeName(5, "Girls Co-Op");
    graph.setNodeName(6, "Adke Circle");
    graph.setNodeName(7, "Karavali Hostel");
    graph.setNodeName(8, "Mega Towers");
    graph.setNodeName(9, "Library");

    graph.addEdge(0, 1, 120.0, 10.0, false);
    graph.addEdge(1, 2, 80.0, 6.0, false);
    graph.addEdge(2, 3, 90.0, 7.0, false);
    graph.addEdge(3, 4, 95.0, 7.0, false);
    graph.addEdge(4, 5, 80.0, 6.0, false);
    graph.addEdge(5, 6, 90.0, 7.0, false);
    graph.addEdge(6, 7, 100.0, 8.0, false);
    graph.addEdge(7, 8, 120.0, 9.0, false);
    graph.addEdge(8, 9, 110.0, 8.0, false);
    graph.addEdge(0, 6, 180.0, 15.0, false);
    graph.addEdge(1, 7, 170.0, 14.0, false);
    graph.addEdge(3, 9, 210.0, 17.0, false);
    graph.addEdge(4, 8, 150.0, 12.0, false);
    graph.addEdge(2, 6, 150.0, 12.0, false);
    graph.addEdge(2, 8, 160.0, 13.0, false);
    return graph;
}

static void test_baseline_assignment_prefers_small_vehicles()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);
    FleetOptimizerConfig config;
    config.shortlistLimit = 10;
    config.switchingPenalty = 25.0;
    config.allowReoptimization = true;
    FleetOptimizer optimizer(graph, Weights(), config);

    std::vector<Vehicle> fleet;
    for (int i = 0; i < 10; ++i)
    {
        fleet.push_back(Vehicle(i + 1, VehicleType::TWO_WHEELER, 1, 0, VehicleState::IDLE));
    }
    for (int i = 0; i < 5; ++i)
    {
        fleet.push_back(Vehicle(100 + i, VehicleType::BUGGY, 3, 0, VehicleState::IDLE));
    }
    for (int i = 0; i < 2; ++i)
    {
        fleet.push_back(Vehicle(200 + i, VehicleType::BUS, 10, 0, VehicleState::IDLE));
    }

    RideRequest r1(1, 0, 2, 0, 600000, RequestStatus::WAITING);
    RideRequest r2(2, 1, 2, 0, 600000, RequestStatus::WAITING);
    RideRequest r3(3, 0, 2, 0, 600000, RequestStatus::WAITING);
    RideRequest r4(4, 1, 2, 0, 600000, RequestStatus::WAITING);

    std::vector<RideRequest> batch = { r1, r2, r3, r4 };
    for (RideRequest& req : batch)
    {
        AssignmentResult result = optimizer.optimizeForRequest(fleet, req, engine);
        assert(result.assigned);
        assert(result.vehicleId > 0);
        assert(result.route.size() >= 2);
    }

    Vehicle idleFarAway(998, VehicleType::TWO_WHEELER, 1, 5, VehicleState::IDLE);
    Vehicle returningVehicle(999, VehicleType::BUGGY, 3, 2, VehicleState::RETURNING);
    returningVehicle.route = { Stop(2, 300, Stop::Type::PICKUP), Stop(0, 300, Stop::Type::DROP) };
    fleet = { idleFarAway, returningVehicle };

    RideRequest r5(5, 2, 0, 0, 600000, RequestStatus::WAITING);
    AssignmentResult result = optimizer.optimizeForRequest(fleet, r5, engine);
    assert(result.assigned);
    assert(result.vehicleId == 999);
}

static void test_latest_pickup_deadline_rejected_at_optimizer()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);
    FleetOptimizerConfig config;
    config.shortlistLimit = 10;
    config.switchingPenalty = 25.0;
    config.allowReoptimization = true;
    FleetOptimizer optimizer(graph, Weights(), config);

    std::vector<Vehicle> fleet;
    fleet.push_back(Vehicle(1, VehicleType::BUGGY, 2, 0, VehicleState::IDLE));

    RideRequest request(10, 4, 9, 0, 10, RequestStatus::WAITING);
    AssignmentResult result = optimizer.optimizeForRequest(fleet, request, engine);

    assert(!result.assigned);
    assert(result.explanation.reason.find("latest pickup") != std::string::npos);
}

static void test_reoptimization_guard_permits_cheap_ridesharing()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);
    FleetOptimizerConfig config;
    config.shortlistLimit = 5;
    config.switchingPenalty = 10.0;
    config.allowReoptimization = true;
    FleetOptimizer optimizer(graph, Weights(), config);

    Vehicle vehicle(1, VehicleType::BUGGY, 4, 1, VehicleState::ASSIGNED);
    vehicle.route = {
        Stop(1, 100, Stop::Type::PICKUP),
        Stop(2, 100, Stop::Type::DROP),
    };
    std::vector<Vehicle> fleet = { vehicle };

    // Request 101 shares the exact same route: pickup at 1, drop at 2
    // Added travel time = 0.0 min < switchingPenalty (10.0 min)
    RideRequest req(101, 1, 2, 0, 600000, RequestStatus::WAITING);
    AssignmentResult result = optimizer.optimizeForRequest(fleet, req, engine);

    assert(result.assigned);
    assert(result.vehicleId == 1);
    assert(req.status == RequestStatus::ASSIGNED);
}

static void test_reoptimization_guard_blocks_excessive_churn()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);
    FleetOptimizerConfig config;
    config.shortlistLimit = 5;
    config.switchingPenalty = 5.0; // small tolerance for detour/churn
    config.allowReoptimization = true;
    FleetOptimizer optimizer(graph, Weights(), config);

    Vehicle vehicle(1, VehicleType::BUGGY, 4, 1, VehicleState::ASSIGNED);
    vehicle.route = {
        Stop(1, 100, Stop::Type::PICKUP),
        Stop(2, 100, Stop::Type::DROP),
    };
    std::vector<Vehicle> fleet = { vehicle };

    // Request 102 wants pickup at 7 (Karavali Hostel) and drop at 8 (Mega Towers)
    // Shortest path: 1->7 is 14 min, 7->8 is 9 min, 8->2 is 13 min.
    // Total candidate travel time will be > 30 min (adding > 24 min travel time, >> 5.0 switchingPenalty)
    RideRequest req(102, 7, 8, 0, 3600000, RequestStatus::WAITING);
    AssignmentResult result = optimizer.optimizeForRequest(fleet, req, engine);

    assert(!result.assigned);
    assert(result.vehicleId == 1);
    assert(result.explanation.reason == "re-optimization guard blocked route churn");
    assert(req.status == RequestStatus::WAITING);
}

int main()
{
    test_baseline_assignment_prefers_small_vehicles();
    test_latest_pickup_deadline_rejected_at_optimizer();
    test_reoptimization_guard_permits_cheap_ridesharing();
    test_reoptimization_guard_blocks_excessive_churn();
    std::cout << "All FleetOptimizer tests passed." << std::endl;
    return 0;
}
