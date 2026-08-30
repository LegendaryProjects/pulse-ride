#pragma once

#include "../core/models.hpp"

#include <limits>
#include <string>
#include <utility>
#include <vector>

struct CampusGraph
{
    struct Edge
    {
        int destination;
        double distance;
        double travelTime;
    };

    std::vector<std::vector<Edge>> adjacency;
    std::vector<std::string> nodeNames;

    CampusGraph() = default;
    explicit CampusGraph(std::size_t nodeCount);

    int addNode(const std::string& name = "");
    void addEdge(int from, int to, double distance, double travelTime, bool directed = false);

    int nodeCount() const noexcept;
    std::string nodeName(int node) const;
    void setNodeName(int node, const std::string& name);
};

class RoutingEngine
{
public:
    RoutingEngine(const CampusGraph& graph = CampusGraph(), bool precomputeAllPairs = true);

    void setGraph(const CampusGraph& graph);
    void setPrecomputeAllPairs(bool enabled);

    const CampusGraph& graph() const noexcept;
    bool precomputeAllPairsEnabled() const noexcept;

    double distance(int source, int destination) const;
    double travelTime(int source, int destination) const;
    std::vector<int> shortestPath(int source, int destination) const;

private:
    CampusGraph graph_;
    bool precomputeAllPairs_;
    bool allPairsReady_;
    std::vector<std::vector<double>> allPairDistances_;
    std::vector<std::vector<double>> allPairTravelTimes_;
    std::vector<std::vector<std::vector<int>>> allPairPaths_;

    void initializeAllPairs();
    void runDijkstra(int source,
                     std::vector<double>& minDistance,
                     std::vector<double>& minTravelTime,
                     std::vector<int>& previous) const;
};
