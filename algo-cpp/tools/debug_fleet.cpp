#include "optimizer/fleet_optimizer.hpp"
#include <iostream>
#include <vector>

CampusGraph buildCampusGraph(){
    CampusGraph graph(10);
    graph.setNodeName(0,"NITK Beach");
    graph.setNodeName(1,"LHC-C");
    graph.setNodeName(2,"LHC-D");
    graph.setNodeName(3,"Guest House");
    graph.setNodeName(4,"Girls Hostel");
    graph.setNodeName(5,"Girls Co-Op");
    graph.setNodeName(6,"Adke Circle");
    graph.setNodeName(7,"Karavali Hostel");
    graph.setNodeName(8,"Mega Towers");
    graph.setNodeName(9,"Library");
    graph.addEdge(0,1,120.0,10.0,false);
    graph.addEdge(1,2,80.0,6.0,false);
    graph.addEdge(2,3,90.0,7.0,false);
    graph.addEdge(3,4,95.0,7.0,false);
    graph.addEdge(4,5,80.0,6.0,false);
    graph.addEdge(5,6,90.0,7.0,false);
    graph.addEdge(6,7,100.0,8.0,false);
    graph.addEdge(7,8,120.0,9.0,false);
    graph.addEdge(8,9,110.0,8.0,false);
    graph.addEdge(0,6,180.0,15.0,false);
    graph.addEdge(1,7,170.0,14.0,false);
    graph.addEdge(3,9,210.0,17.0,false);
    graph.addEdge(4,8,150.0,12.0,false);
    graph.addEdge(2,6,150.0,12.0,false);
    graph.addEdge(2,8,160.0,13.0,false);
    return graph;
}

int main(){
    auto graph = buildCampusGraph();
    RoutingEngine engine(graph, true);
    Vehicle idleFarAway(998, VehicleType::TWO_WHEELER, 1, 5, VehicleState::IDLE);
    Vehicle returningVehicle(999, VehicleType::BUGGY, 3, 2, VehicleState::RETURNING);
    returningVehicle.route = { Stop(5, 300, Stop::Type::PICKUP), Stop(2, 300, Stop::Type::DROP) };
    std::vector<Vehicle> fleet = { idleFarAway, returningVehicle };
    RideRequest r5(5, 2, 0, 0, 500, RequestStatus::WAITING);
    CandidateVehicleGenerator gen(10);
    auto shortlist = gen.generate(fleet, r5, engine);
    std::cout << "shortlist:";
    for (auto id : shortlist) std::cout << " " << id;
    std::cout << "\n";
    RouteInsertionEngine rie(graph, Weights());
    for (const auto& v : fleet) {
        auto cand = rie.generateCandidates(v, r5, engine);
        std::cout << "vehicle " << v.id << " candidates=" << cand.size() << "\n";
        for (const auto& c : cand) {
            std::cout << "  cost=" << c.cost.total << " route:";
            for (const auto& s : c.route) { std::cout << " (" << s.riderId << "," << (s.type == Stop::Type::PICKUP ? "P" : "D") << "," << s.location << ")"; }
            std::cout << "\n";
        }
    }
    return 0;
}
