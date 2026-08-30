#include "routing/candidate_vehicle_generator.hpp"

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

static void test_shortlist_filters_and_ranks()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle idleSmall(10, VehicleType::TWO_WHEELER, 1, 0, VehicleState::IDLE);
    Vehicle idleBus(11, VehicleType::BUS, 12, 0, VehicleState::IDLE);
    Vehicle maintVehicle(12, VehicleType::BUGGY, 3, 1, VehicleState::MAINTENANCE);
    Vehicle busyCar(13, VehicleType::BUGGY, 2, 2, VehicleState::ASSIGNED);
    busyCar.route = { Stop(2, 20, Stop::Type::PICKUP), Stop(3, 20, Stop::Type::DROP) };
    Vehicle returningVan(14, VehicleType::BUGGY, 4, 4, VehicleState::RETURNING);
    returningVan.route = { Stop(4, 21, Stop::Type::PICKUP), Stop(6, 21, Stop::Type::DROP) };

    std::vector<Vehicle> fleet = { idleSmall, idleBus, maintVehicle, busyCar, returningVan };
    RideRequest request(99, 0, 4, 0, 1000, RequestStatus::WAITING);

    CandidateVehicleGenerator generator(5);
    std::vector<int> shortlist = generator.shortlistVehicles(fleet, request, engine);

    assert(std::find(shortlist.begin(), shortlist.end(), maintVehicle.id) == shortlist.end());
    assert(std::find(shortlist.begin(), shortlist.end(), idleSmall.id) != shortlist.end());
    assert(std::find(shortlist.begin(), shortlist.end(), returningVan.id) != shortlist.end());

    if (!shortlist.empty())
    {
        assert(shortlist.size() <= 5);
    }
}

static void test_vehicle_full_with_current_riders_is_rejected()
{
    CampusGraph graph = buildCampusGraph();
    RoutingEngine engine(graph, true);

    Vehicle fullVehicle(15, VehicleType::BUGGY, 2, 0, VehicleState::IDLE, {}, {1, 2});
    RideRequest request(100, 0, 4, 0, 1000, RequestStatus::WAITING);

    CandidateVehicleGenerator generator(10);
    std::vector<int> shortlist = generator.shortlistVehicles({fullVehicle}, request, engine);
    assert(shortlist.empty());
}

int main()
{
    test_shortlist_filters_and_ranks();
    test_vehicle_full_with_current_riders_is_rejected();
    std::cout << "All CandidateVehicleGenerator tests passed." << std::endl;
    return 0;
}
