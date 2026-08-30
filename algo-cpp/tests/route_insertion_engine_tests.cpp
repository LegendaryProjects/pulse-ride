#include "routing/route_insertion_engine.hpp"

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

static void test_return_trip_sharing_append_after_existing_drop()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle car(7, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    car.route = {
        Stop(0, 1, Stop::Type::PICKUP),
        Stop(1, 1, Stop::Type::DROP),
    };

    RideRequest request(2, 0, 3, 0, 600000, RequestStatus::WAITING);
    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.2;
    weights.detour = 1.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    RouteInsertionEngine insertionEngine(graph, weights);
    std::vector<CandidateRoute> candidates = insertionEngine.generateCandidates(car, request, engine);

    assert(!candidates.empty());

    bool foundAppendAfterExistingDrop = false;
    for (const CandidateRoute& candidate : candidates)
    {
        const std::vector<Stop>& route = candidate.route;
        bool sawOldPickup = false;
        bool sawOldDrop = false;
        bool sawNewPickup = false;
        bool sawNewDrop = false;
        for (const Stop& stop : route)
        {
            if (stop.riderId == 1 && stop.type == Stop::Type::PICKUP)
            {
                sawOldPickup = true;
            }
            if (stop.riderId == 1 && stop.type == Stop::Type::DROP)
            {
                sawOldDrop = true;
            }
            if (stop.riderId == 2 && stop.type == Stop::Type::PICKUP)
            {
                sawNewPickup = true;
            }
            if (stop.riderId == 2 && stop.type == Stop::Type::DROP)
            {
                sawNewDrop = true;
            }
        }

        if (sawOldPickup && sawOldDrop && sawNewPickup && sawNewDrop)
        {
            foundAppendAfterExistingDrop = true;
            break;
        }
    }

    assert(foundAppendAfterExistingDrop);
}

static void test_latest_pickup_deadline_rejects_late_candidates()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle car(8, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    RideRequest request(3, 4, 9, 0, 10, RequestStatus::WAITING);

    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.2;
    weights.detour = 1.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    RouteInsertionEngine insertionEngine(graph, weights);
    std::vector<CandidateRoute> candidates = insertionEngine.generateCandidates(car, request, engine);

    assert(candidates.empty());
}

static void test_latest_pickup_deadline_allows_generous_deadline()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle car(9, VehicleType::BUGGY, 2, 0, VehicleState::IDLE);
    RideRequest request(4, 0, 4, 0, 600000, RequestStatus::WAITING);

    Weights weights;
    weights.waiting = 1.0;
    weights.travelTime = 1.0;
    weights.distance = 0.2;
    weights.detour = 1.0;
    weights.vehiclePenalty = 1.0;
    weights.underUtilization = 1.0;

    RouteInsertionEngine insertionEngine(graph, weights);
    std::vector<CandidateRoute> candidates = insertionEngine.generateCandidates(car, request, engine);

    assert(!candidates.empty());
}

int main()
{
    test_return_trip_sharing_append_after_existing_drop();
    test_latest_pickup_deadline_rejects_late_candidates();
    test_latest_pickup_deadline_allows_generous_deadline();
    std::cout << "All RouteInsertionEngine tests passed." << std::endl;
    return 0;
}
