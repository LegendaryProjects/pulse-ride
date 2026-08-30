#include "campus_routing.hpp"

#include <algorithm>
#include <cmath>
#include <queue>
#include <stdexcept>
#include <string>

namespace
{
constexpr double kInfinity = std::numeric_limits<double>::infinity();

std::vector<int> reconstructPath(const std::vector<int>& previous, int source, int destination)
{
    if (source == destination)
    {
        return {source};
    }

    std::vector<int> path;
    for (int current = destination; current != -1; current = previous[current])
    {
        path.push_back(current);
        if (current == source)
        {
            break;
        }
        if (previous[current] == -1)
        {
            return {};
        }
    }

    if (path.empty() || path.back() != source)
    {
        return {};
    }

    std::reverse(path.begin(), path.end());
    return path;
}

std::string pathToText(const CampusGraph& graph, const std::vector<int>& path)
{
    if (path.empty())
    {
        return "[unreachable]";
    }

    std::string text;
    for (std::size_t i = 0; i < path.size(); ++i)
    {
        if (i > 0)
        {
            text += " -> ";
        }
        text += graph.nodeName(path[i]);
    }
    return text;
}
} // namespace

CampusGraph::CampusGraph(std::size_t nodeCount)
    : adjacency(nodeCount), nodeNames(nodeCount)
{
    for (std::size_t i = 0; i < nodeCount; ++i)
    {
        nodeNames[i] = "Node" + std::to_string(i);
    }
}

int CampusGraph::addNode(const std::string& name)
{
    const int nodeId = static_cast<int>(adjacency.size());
    adjacency.emplace_back();
    nodeNames.push_back(name.empty() ? ("Node" + std::to_string(nodeId)) : name);
    return nodeId;
}

void CampusGraph::addEdge(int from, int to, double distance, double travelTime, bool directed)
{
    if (from < 0 || to < 0 || from >= nodeCount() || to >= nodeCount())
    {
        throw std::out_of_range("CampusGraph::addEdge: invalid node index");
    }

    if (distance < 0.0)
    {
        throw std::invalid_argument("CampusGraph::addEdge: distance must be non-negative");
    }

    if (travelTime < 0.0)
    {
        throw std::invalid_argument("CampusGraph::addEdge: travelTime must be non-negative");
    }

    adjacency[from].push_back(Edge{to, distance, travelTime});
    if (!directed)
    {
        adjacency[to].push_back(Edge{from, distance, travelTime});
    }
}

int CampusGraph::nodeCount() const noexcept
{
    return static_cast<int>(adjacency.size());
}

std::string CampusGraph::nodeName(int node) const
{
    if (node < 0 || node >= nodeCount())
    {
        return "<invalid>";
    }
    return nodeNames[static_cast<std::size_t>(node)];
}

void CampusGraph::setNodeName(int node, const std::string& name)
{
    if (node < 0 || node >= nodeCount())
    {
        throw std::out_of_range("CampusGraph::setNodeName: invalid node index");
    }
    nodeNames[static_cast<std::size_t>(node)] = name;
}

RoutingEngine::RoutingEngine(const CampusGraph& graph, bool precomputeAllPairs)
    : graph_(graph),
      precomputeAllPairs_(precomputeAllPairs),
      allPairsReady_(false)
{
    if (precomputeAllPairs_ && graph_.nodeCount() < 200)
    {
        initializeAllPairs();
    }
}

void RoutingEngine::setGraph(const CampusGraph& graph)
{
    graph_ = graph;
    allPairsReady_ = false;
    allPairDistances_.clear();
    allPairTravelTimes_.clear();
    allPairPaths_.clear();

    if (precomputeAllPairs_ && graph_.nodeCount() < 200)
    {
        initializeAllPairs();
    }
}

void RoutingEngine::setPrecomputeAllPairs(bool enabled)
{
    precomputeAllPairs_ = enabled;
    allPairsReady_ = false;
    allPairDistances_.clear();
    allPairTravelTimes_.clear();
    allPairPaths_.clear();

    if (precomputeAllPairs_ && graph_.nodeCount() < 200)
    {
        initializeAllPairs();
    }
}

const CampusGraph& RoutingEngine::graph() const noexcept
{
    return graph_;
}

bool RoutingEngine::precomputeAllPairsEnabled() const noexcept
{
    return precomputeAllPairs_;
}

void RoutingEngine::runDijkstra(int source,
                               std::vector<double>& minDistance,
                               std::vector<double>& minTravelTime,
                               std::vector<int>& previous) const
{
    const int nodeCount = graph_.nodeCount();
    minDistance.assign(nodeCount, kInfinity);
    minTravelTime.assign(nodeCount, kInfinity);
    previous.assign(nodeCount, -1);

    if (source < 0 || source >= nodeCount)
    {
        throw std::out_of_range("RoutingEngine::runDijkstra: invalid source node");
    }

    using QueueEntry = std::pair<double, int>;
    std::priority_queue<QueueEntry, std::vector<QueueEntry>, std::greater<QueueEntry>> frontier;

    minDistance[source] = 0.0;
    minTravelTime[source] = 0.0;
    frontier.emplace(0.0, source);

    while (!frontier.empty())
    {
        const auto [currentTravelTime, currentNode] = frontier.top();
        frontier.pop();

        if (currentTravelTime > minTravelTime[currentNode] + 1e-9)
        {
            continue;
        }

        for (const CampusGraph::Edge& edge : graph_.adjacency[static_cast<std::size_t>(currentNode)])
        {
            const double candidateTravelTime = minTravelTime[currentNode] + edge.travelTime;
            const double candidateDistance = minDistance[currentNode] + edge.distance;
            const int neighbor = edge.destination;

            if (candidateTravelTime < minTravelTime[neighbor] - 1e-9 ||
                (std::abs(candidateTravelTime - minTravelTime[neighbor]) <= 1e-9 &&
                 candidateDistance < minDistance[neighbor] - 1e-9))
            {
                minTravelTime[neighbor] = candidateTravelTime;
                minDistance[neighbor] = candidateDistance;
                previous[neighbor] = currentNode;
                frontier.emplace(candidateTravelTime, neighbor);
            }
        }
    }
}

void RoutingEngine::initializeAllPairs()
{
    const int nodeCount = graph_.nodeCount();
    allPairDistances_.assign(static_cast<std::size_t>(nodeCount), std::vector<double>(nodeCount, kInfinity));
    allPairTravelTimes_.assign(static_cast<std::size_t>(nodeCount), std::vector<double>(nodeCount, kInfinity));
    allPairPaths_.assign(static_cast<std::size_t>(nodeCount), std::vector<std::vector<int>>(nodeCount));

    for (int source = 0; source < nodeCount; ++source)
    {
        std::vector<double> minDistance;
        std::vector<double> minTravelTime;
        std::vector<int> previous(nodeCount, -1);

        runDijkstra(source, minDistance, minTravelTime, previous);

        for (int destination = 0; destination < nodeCount; ++destination)
        {
            allPairDistances_[static_cast<std::size_t>(source)][static_cast<std::size_t>(destination)] = minDistance[destination];
            allPairTravelTimes_[static_cast<std::size_t>(source)][static_cast<std::size_t>(destination)] = minTravelTime[destination];
            allPairPaths_[static_cast<std::size_t>(source)][static_cast<std::size_t>(destination)] = reconstructPath(previous, source, destination);
        }
    }

    allPairsReady_ = true;
}

double RoutingEngine::distance(int source, int destination) const
{
    const int nodeCount = graph_.nodeCount();
    if (source < 0 || destination < 0 || source >= nodeCount || destination >= nodeCount)
    {
        return kInfinity;
    }

    if (precomputeAllPairs_ && allPairsReady_)
    {
        return allPairDistances_[static_cast<std::size_t>(source)][static_cast<std::size_t>(destination)];
    }

    std::vector<double> minDistance;
    std::vector<double> minTravelTime;
    std::vector<int> previous;
    runDijkstra(source, minDistance, minTravelTime, previous);
    return minDistance[destination];
}

double RoutingEngine::travelTime(int source, int destination) const
{
    const int nodeCount = graph_.nodeCount();
    if (source < 0 || destination < 0 || source >= nodeCount || destination >= nodeCount)
    {
        return kInfinity;
    }

    if (precomputeAllPairs_ && allPairsReady_)
    {
        return allPairTravelTimes_[static_cast<std::size_t>(source)][static_cast<std::size_t>(destination)];
    }

    std::vector<double> minDistance;
    std::vector<double> minTravelTime;
    std::vector<int> previous;
    runDijkstra(source, minDistance, minTravelTime, previous);
    return minTravelTime[destination];
}

std::vector<int> RoutingEngine::shortestPath(int source, int destination) const
{
    const int nodeCount = graph_.nodeCount();
    if (source < 0 || destination < 0 || source >= nodeCount || destination >= nodeCount)
    {
        return {};
    }

    if (precomputeAllPairs_ && allPairsReady_)
    {
        return allPairPaths_[static_cast<std::size_t>(source)][static_cast<std::size_t>(destination)];
    }

    std::vector<double> minDistance;
    std::vector<double> minTravelTime;
    std::vector<int> previous;
    runDijkstra(source, minDistance, minTravelTime, previous);
    return reconstructPath(previous, source, destination);
}

