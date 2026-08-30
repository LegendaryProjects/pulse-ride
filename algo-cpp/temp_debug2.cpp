#include "src/optimizer/fleet_optimizer.hpp"
#include <iostream>
#include <vector>

static CampusGraph buildCampusGraph() {
    CampusGraph graph(10); graph.setNodeName(0, "NITK Beach"); graph.setNodeName(1, "LHC-C"); graph.setNodeName(2, "LHC-D"); graph.setNodeName(3, "Guest House"); graph.setNodeName(4, "Girls Hostel"); graph.setNodeName(5, "Girls Co-Op"); graph.setNodeName(6, "Adke Circle"); graph.setNodeName(7, "Karavali Hostel"); graph.setNodeName(8, "Mega Towers"); graph.setNodeName(9, "Library");
    graph.addEdge(0,1,120.0,10.0,false); graph.addEdge(1,2,80.0,6.0,false); graph.addEdge(2,3,90.0,7.0,false); graph.addEdge(3,4,95.0,7.0,false); graph.addEdge(4,5,80.0,6.0,false); graph.addEdge(5,6,90.0,7.0,false); graph.addEdge(6,7,100.0,8.0,false); graph.addEdge(7,8,120.0,9.0,false); graph.addEdge(8,9,110.0,8.0,false); graph.addEdge(0,6,180.0,15.0,false); graph.addEdge(1,7,170.0,14.0,false); graph.addEdge(3,9,210.0,17.0,false); graph.addEdge(4,8,150.0,12.0,false); graph.addEdge(2,6,150.0,12.0,false); graph.addEdge(2,8,160.0,13.0,false); return graph;
}

int main(){
    CampusGraph graph = buildCampusGraph(); RoutingEngine engine(graph,true);
    Vehicle vehicle(9, VehicleType::TWO_WHEELER, 1, 0, VehicleState::IDLE);
    vehicle.route = { Stop(0,1,Stop::Type::PICKUP), Stop(2,1,Stop::Type::DROP) };
    RideRequest req(2,1,2,0,500,RequestStatus::WAITING);
    RouteInsertionEngine rie(graph, Weights());
    auto cands = rie.generateCandidates(vehicle, req, engine);
    std::cout << "candidate count=" << cands.size() << "\n";
    for (auto &c : cands) {
        std::cout << "route: "; for (auto &s : c.route) std::cout << (s.type==Stop::Type::PICKUP?"P":"D") << s.riderId << "@" << s.location << " "; std::cout << " total=" << c.cost.total << " waiting=" << c.cost.waiting << " travel=" << c.cost.travelTime << " addDistance=" << c.cost.addDistance << " detour=" << c.cost.detour << "\n";
    }
    return 0;
}
