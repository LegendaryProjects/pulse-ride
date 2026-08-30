#include "scoring/cost_engine.hpp"

#include <cassert>
#include <cmath>
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

static void test_cost_scoring_basic()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle vehicle(42, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    std::vector<Stop> oldRoute;
    std::vector<Stop> newRoute = {
        Stop(0, 100, Stop::Type::PICKUP),
        Stop(1, 100, Stop::Type::DROP),
    };

    RideRequest request(100, 0, 1, 0, 100, RequestStatus::WAITING);
    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.5;
    weights.detour = 2.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    CostBreakdown breakdown = CostEngine().calculateCost(vehicle, oldRoute, newRoute, request, engine, weights);

    assert(breakdown.total >= 0.0);
    assert(breakdown.vehiclePenalty > 0.0);
    assert(breakdown.waiting == 0.0);
    assert(breakdown.travelTime >= 0.0);
}

static void test_waiting_includes_vehicle_to_first_stop_leg()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle vehicle(43, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    std::vector<Stop> oldRoute;
    std::vector<Stop> newRoute = {
        Stop(1, 101, Stop::Type::PICKUP),
        Stop(2, 101, Stop::Type::DROP),
    };

    RideRequest request(101, 1, 2, 0, 100, RequestStatus::WAITING);
    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.5;
    weights.detour = 2.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    CostBreakdown breakdown = CostEngine().calculateCost(vehicle, oldRoute, newRoute, request, engine, weights);

    assert(breakdown.waiting > 0.0);
    assert(breakdown.waiting == 10.0);
}

static void test_waiting_zero_when_vehicle_already_at_pickup()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle vehicle(44, VehicleType::BUGGY, 2, 1, VehicleState::IDLE);
    std::vector<Stop> oldRoute;
    std::vector<Stop> newRoute = {
        Stop(1, 102, Stop::Type::PICKUP),
        Stop(2, 102, Stop::Type::DROP),
    };

    RideRequest request(102, 1, 2, 0, 100, RequestStatus::WAITING);
    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.5;
    weights.detour = 2.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    CostBreakdown breakdown = CostEngine().calculateCost(vehicle, oldRoute, newRoute, request, engine, weights);

    assert(breakdown.waiting == 0.0);
}

static void test_waiting_is_derived_from_request_time_and_converts_to_minutes()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle vehicle(45, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    std::vector<Stop> oldRoute;
    std::vector<Stop> newRoute = {
        Stop(1, 103, Stop::Type::PICKUP),
        Stop(2, 103, Stop::Type::DROP),
    };

    const double travelTimeToPickupMinutes = engine.travelTime(vehicle.currentLocation, newRoute[0].location);
    const double travelTimeUnitMs = 60000.0;

    RideRequest requestA(103, 1, 2, 0, 100, RequestStatus::WAITING);
    RideRequest requestB(103, 1, 2, 500000, 100, RequestStatus::WAITING);
    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.5;
    weights.detour = 2.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    CostBreakdown breakdownA = CostEngine().calculateCost(vehicle, oldRoute, newRoute, requestA, engine, weights);
    CostBreakdown breakdownB = CostEngine().calculateCost(vehicle, oldRoute, newRoute, requestB, engine, weights);

    assert(std::abs(breakdownA.waiting - breakdownB.waiting) < 1e-9);
    assert(std::abs(breakdownA.waiting - travelTimeToPickupMinutes) < 1e-9);
    assert(std::abs(breakdownA.waiting - (static_cast<double>(std::llround(travelTimeToPickupMinutes * travelTimeUnitMs)) / travelTimeUnitMs) ) < 1e-9);
}

static void test_detour_uses_each_existing_rider_own_baseline_drop_time()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle vehicle(46, VehicleType::BUGGY, 4, 0, VehicleState::IDLE);
    std::vector<Stop> oldRoute = {
        Stop(1, 200, Stop::Type::PICKUP),
        Stop(2, 200, Stop::Type::DROP),
        Stop(2, 201, Stop::Type::PICKUP),
        Stop(3, 201, Stop::Type::DROP),
    };
    std::vector<Stop> newRoute = {
        Stop(1, 200, Stop::Type::PICKUP),
        Stop(7, 999, Stop::Type::PICKUP),
        Stop(2, 200, Stop::Type::DROP),
        Stop(2, 201, Stop::Type::PICKUP),
        Stop(8, 999, Stop::Type::DROP),
        Stop(3, 201, Stop::Type::DROP),
    };

    const RideRequest request(999, 7, 8, 0, 600000, RequestStatus::WAITING);
    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.5;
    weights.detour = 2.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    CostBreakdown breakdown = CostEngine().calculateCost(vehicle, oldRoute, newRoute, request, engine, weights);

    const double oldDropA = cumulativeTravelTimeToStop(engine, vehicle, oldRoute, 1);
    const double oldDropB = cumulativeTravelTimeToStop(engine, vehicle, oldRoute, 3);
    const double newDropA = cumulativeTravelTimeToStop(engine, vehicle, newRoute, 2);
    const double newDropB = cumulativeTravelTimeToStop(engine, vehicle, newRoute, 5);
    const double detourA = std::max(0.0, newDropA - oldDropA);
    const double detourB = std::max(0.0, newDropB - oldDropB);

    assert(detourA > 0.0);
    assert(detourB > 0.0);
    assert(std::abs(detourA - detourB) > 1e-9);
    assert(std::abs(breakdown.detour - (detourA + detourB)) < 1e-9);
    // Future explainability enhancement: expose per-rider detour deltas in the JSON contract instead of only the summed total.
}

static void test_under_utilization_derived_from_max_occupancy()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle vehicle(50, VehicleType::BUGGY, 4, 0, VehicleState::ASSIGNED);
    std::vector<Stop> oldRoute;
    Weights weights;

    // Route A: only carries at most 1 passenger simultaneously (P100->D100, P101->D101, P102->D102)
    std::vector<Stop> route1Peak = {
        Stop(0, 100, Stop::Type::PICKUP),
        Stop(1, 100, Stop::Type::DROP),
        Stop(1, 101, Stop::Type::PICKUP),
        Stop(2, 101, Stop::Type::DROP),
        Stop(2, 102, Stop::Type::PICKUP),
        Stop(3, 102, Stop::Type::DROP),
    };
    RideRequest req1(102, 2, 3, 0, 600000, RequestStatus::WAITING);
    CostBreakdown breakdown1Peak = CostEngine().calculateCost(vehicle, oldRoute, route1Peak, req1, engine, weights);

    // Route B: carries 3 passengers simultaneously at peak (P200, P201, P202, then drops)
    std::vector<Stop> route3Peak = {
        Stop(0, 200, Stop::Type::PICKUP),
        Stop(1, 201, Stop::Type::PICKUP),
        Stop(2, 202, Stop::Type::PICKUP),
        Stop(3, 200, Stop::Type::DROP),
        Stop(4, 201, Stop::Type::DROP),
        Stop(5, 202, Stop::Type::DROP),
    };
    RideRequest req2(202, 2, 5, 0, 600000, RequestStatus::WAITING);
    CostBreakdown breakdown3Peak = CostEngine().calculateCost(vehicle, oldRoute, route3Peak, req2, engine, weights);

    // 1-peak on capacity 4: maxOccupancy=1, utilization=1/4=0.25, underUtil=1-0.25=0.75
    // 3-peak on capacity 4: maxOccupancy=3, utilization=3/4=0.75, underUtil=1-0.75=0.25
    assert(breakdown1Peak.underUtil > breakdown3Peak.underUtil);
    assert(std::abs(breakdown1Peak.underUtil - 0.75) < 1e-9);
    assert(std::abs(breakdown3Peak.underUtil - 0.25) < 1e-9);
}

int main()
{
    test_cost_scoring_basic();
    test_waiting_includes_vehicle_to_first_stop_leg();
    test_waiting_zero_when_vehicle_already_at_pickup();
    test_waiting_is_derived_from_request_time_and_converts_to_minutes();
    test_detour_uses_each_existing_rider_own_baseline_drop_time();
    test_under_utilization_derived_from_max_occupancy();
    std::cout << "All CostEngine tests passed." << std::endl;
    return 0;
}
