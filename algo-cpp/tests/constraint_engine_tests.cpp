#include "validation/constraint_engine.hpp"

#include <cassert>
#include <iostream>
#include <vector>

static void test_capacity_exceeded()
{
    CampusGraph graph(4);
    Vehicle vehicle(1, VehicleType::BUGGY, 1, 0, VehicleState::IDLE);
    std::vector<Stop> route = {
        Stop(0, 10, Stop::Type::PICKUP),
        Stop(1, 20, Stop::Type::PICKUP),
    };

    ValidationResult result = ConstraintEngine(graph).validate(vehicle, route);
    assert(!result.feasible);
    assert(result.reason.find("Capacity exceeded") != std::string::npos);
}

static void test_drop_before_pickup()
{
    CampusGraph graph(3);
    Vehicle vehicle(2, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    std::vector<Stop> route = {
        Stop(1, 7, Stop::Type::DROP),
        Stop(2, 7, Stop::Type::PICKUP),
    };

    ValidationResult result = ConstraintEngine(graph).validate(vehicle, route);
    assert(!result.feasible);
    assert(result.reason.find("DROP before PICKUP") != std::string::npos ||
           result.reason.find("drop before pickup") != std::string::npos);
}

static void test_duplicate_stops()
{
    CampusGraph graph(4);
    Vehicle vehicle(3, VehicleType::BUS, 3, 0, VehicleState::IDLE);
    std::vector<Stop> route = {
        Stop(0, 4, Stop::Type::PICKUP),
        Stop(1, 4, Stop::Type::PICKUP),
        Stop(2, 4, Stop::Type::DROP),
    };

    ValidationResult result = ConstraintEngine(graph).validate(vehicle, route);
    assert(!result.feasible);
    assert(result.reason.find("duplicate") != std::string::npos ||
           result.reason.find("multiple") != std::string::npos);
}

static void test_valid_route()
{
    CampusGraph graph(4);
    Vehicle vehicle(4, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    std::vector<Stop> route = {
        Stop(0, 10, Stop::Type::PICKUP),
        Stop(1, 20, Stop::Type::PICKUP),
        Stop(2, 10, Stop::Type::DROP),
        Stop(3, 20, Stop::Type::DROP),
    };

    ValidationResult result = ConstraintEngine(graph).validate(vehicle, route);
    assert(result.feasible);
    assert(result.reason == "valid");
}

static void test_current_riders_counted_towards_capacity()
{
    CampusGraph graph(5);
    Vehicle vehicle(5, VehicleType::BUGGY, 1, 0, VehicleState::IDLE, {}, {50});
    std::vector<Stop> route = {
        Stop(0, 60, Stop::Type::PICKUP),
        Stop(1, 50, Stop::Type::DROP),
        Stop(2, 60, Stop::Type::DROP),
    };

    ValidationResult result = ConstraintEngine(graph).validate(vehicle, route);
    assert(!result.feasible);
    assert(result.reason.find("Capacity exceeded") != std::string::npos);
}

static void test_current_riders_counted_towards_capacity_when_capacity_allows()
{
    CampusGraph graph(5);
    Vehicle vehicle(6, VehicleType::BUGGY, 2, 0, VehicleState::IDLE, {}, {50});
    std::vector<Stop> route = {
        Stop(0, 60, Stop::Type::PICKUP),
        Stop(1, 50, Stop::Type::DROP),
        Stop(2, 60, Stop::Type::DROP),
    };

    ValidationResult result = ConstraintEngine(graph).validate(vehicle, route);
    assert(result.feasible);
    assert(result.reason == "valid");
}

int main()
{
    test_capacity_exceeded();
    test_drop_before_pickup();
    test_duplicate_stops();
    test_valid_route();
    test_current_riders_counted_towards_capacity();
    test_current_riders_counted_towards_capacity_when_capacity_allows();

    std::cout << "All ConstraintEngine tests passed." << std::endl;
    return 0;
}
