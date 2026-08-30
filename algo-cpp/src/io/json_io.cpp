#include "json_io.hpp"

#include <stdexcept>
#include <string>
#include <tuple>
#include <vector>

namespace
{
std::string fieldError(const std::string& field, const std::string& message)
{
    return "Field '" + field + "': " + message;
}

bool getBooleanField(const json& j, const std::string& field, bool required = true)
{
    if (!j.contains(field))
    {
        if (!required)
        {
            return false;
        }
        throw std::invalid_argument(fieldError(field, "missing required field"));
    }
    if (!j.at(field).is_boolean())
    {
        throw std::invalid_argument(fieldError(field, "must be a boolean"));
    }
    return j.at(field).get<bool>();
}

int getIntField(const json& j, const std::string& field, bool required = true)
{
    if (!j.contains(field))
    {
        if (!required)
        {
            return 0;
        }
        throw std::invalid_argument(fieldError(field, "missing required field"));
    }
    if (!j.at(field).is_number_integer())
    {
        throw std::invalid_argument(fieldError(field, "must be an integer"));
    }
    return j.at(field).get<int>();
}

long long getLongLongField(const json& j, const std::string& field, bool required = true)
{
    if (!j.contains(field))
    {
        if (!required)
        {
            return 0;
        }
        throw std::invalid_argument(fieldError(field, "missing required field"));
    }
    if (!j.at(field).is_number_integer())
    {
        throw std::invalid_argument(fieldError(field, "must be an integer"));
    }
    return j.at(field).get<long long>();
}

double getDoubleField(const json& j, const std::string& field, bool required = true, double fallback = 0.0)
{
    if (!j.contains(field))
    {
        if (!required)
        {
            return fallback;
        }
        throw std::invalid_argument(fieldError(field, "missing required field"));
    }
    const json& value = j.at(field);
    if (!value.is_number())
    {
        throw std::invalid_argument(fieldError(field, "must be a number"));
    }
    return value.get<double>();
}

std::string getStringField(const json& j, const std::string& field, bool required = true)
{
    if (!j.contains(field))
    {
        if (!required)
        {
            return "";
        }
        throw std::invalid_argument(fieldError(field, "missing required field"));
    }
    if (!j.at(field).is_string())
    {
        throw std::invalid_argument(fieldError(field, "must be a string"));
    }
    return j.at(field).get<std::string>();
}

std::vector<int> getIntArrayField(const json& j, const std::string& field)
{
    if (!j.contains(field))
    {
        return {};
    }
    const json& value = j.at(field);
    if (!value.is_array())
    {
        throw std::invalid_argument(fieldError(field, "must be an array"));
    }
    std::vector<int> result;
    for (std::size_t i = 0; i < value.size(); ++i)
    {
        result.push_back(value[i].get<int>());
    }
    return result;
}

std::string vehicleTypeToStringImpl(VehicleType type)
{
    switch (type)
    {
    case VehicleType::TWO_WHEELER:
        return "TWO_WHEELER";
    case VehicleType::BUGGY:
        return "BUGGY";
    case VehicleType::BUS:
        return "BUS";
    }
    throw std::invalid_argument("Invalid VehicleType enum value");
}

VehicleType vehicleTypeFromStringImpl(const std::string& value, const std::string& field)
{
    if (value == "TWO_WHEELER")
    {
        return VehicleType::TWO_WHEELER;
    }
    if (value == "BUGGY" || value == "CAR")
    {
        return VehicleType::BUGGY;
    }
    if (value == "BUS")
    {
        return VehicleType::BUS;
    }
    throw std::invalid_argument(fieldError(field, "invalid enum string '" + value + "'"));
}

std::string vehicleStateToStringImpl(VehicleState state)
{
    switch (state)
    {
    case VehicleState::IDLE:
        return "IDLE";
    case VehicleState::ASSIGNED:
        return "ASSIGNED";
    case VehicleState::ON_TRIP:
        return "ON_TRIP";
    case VehicleState::RETURNING:
        return "RETURNING";
    case VehicleState::MAINTENANCE:
        return "MAINTENANCE";
    }
    throw std::invalid_argument("Invalid VehicleState enum value");
}

VehicleState vehicleStateFromStringImpl(const std::string& value, const std::string& field)
{
    if (value == "IDLE")
    {
        return VehicleState::IDLE;
    }
    if (value == "ASSIGNED")
    {
        return VehicleState::ASSIGNED;
    }
    if (value == "ON_TRIP")
    {
        return VehicleState::ON_TRIP;
    }
    if (value == "RETURNING")
    {
        return VehicleState::RETURNING;
    }
    if (value == "MAINTENANCE")
    {
        return VehicleState::MAINTENANCE;
    }
    throw std::invalid_argument(fieldError(field, "invalid enum string '" + value + "'"));
}

std::string requestStatusToStringImpl(RequestStatus status)
{
    switch (status)
    {
    case RequestStatus::WAITING:
        return "WAITING";
    case RequestStatus::ASSIGNED:
        return "ASSIGNED";
    case RequestStatus::PICKED_UP:
        return "PICKED_UP";
    case RequestStatus::COMPLETED:
        return "COMPLETED";
    case RequestStatus::CANCELLED:
        return "CANCELLED";
    }
    throw std::invalid_argument("Invalid RequestStatus enum value");
}

RequestStatus requestStatusFromStringImpl(const std::string& value, const std::string& field)
{
    if (value == "WAITING")
    {
        return RequestStatus::WAITING;
    }
    if (value == "ASSIGNED")
    {
        return RequestStatus::ASSIGNED;
    }
    if (value == "PICKED_UP")
    {
        return RequestStatus::PICKED_UP;
    }
    if (value == "COMPLETED")
    {
        return RequestStatus::COMPLETED;
    }
    if (value == "CANCELLED")
    {
        return RequestStatus::CANCELLED;
    }
    throw std::invalid_argument(fieldError(field, "invalid enum string '" + value + "'"));
}

std::string stopTypeToStringImpl(Stop::Type type)
{
    return type == Stop::Type::PICKUP ? "PICKUP" : "DROP";
}

Stop::Type stopTypeFromStringImpl(const std::string& value, const std::string& field)
{
    if (value == "PICKUP")
    {
        return Stop::Type::PICKUP;
    }
    if (value == "DROP")
    {
        return Stop::Type::DROP;
    }
    throw std::invalid_argument(fieldError(field, "invalid enum string '" + value + "'"));
}

std::vector<Stop> routeFromJsonArray(const json& j, const std::string& field)
{
    if (!j.contains(field))
    {
        return {};
    }
    const json& array = j.at(field);
    if (!array.is_array())
    {
        throw std::invalid_argument(fieldError(field, "must be an array"));
    }
    std::vector<Stop> route;
    for (std::size_t i = 0; i < array.size(); ++i)
    {
        route.push_back(stopFromJson(array[i]));
    }
    return route;
}

json routeToJsonArray(const std::vector<Stop>& route)
{
    json array = json::array_t();
    for (const Stop& stop : route)
    {
        array.push_back(stopToJson(stop));
    }
    return array;
}
} // namespace

VehicleType vehicleTypeFromString(const std::string& value, const std::string& field)
{
    return vehicleTypeFromStringImpl(value, field);
}

std::string vehicleTypeToString(VehicleType type)
{
    return vehicleTypeToStringImpl(type);
}

VehicleState vehicleStateFromString(const std::string& value, const std::string& field)
{
    return vehicleStateFromStringImpl(value, field);
}

std::string vehicleStateToString(VehicleState state)
{
    return vehicleStateToStringImpl(state);
}

RequestStatus requestStatusFromString(const std::string& value, const std::string& field)
{
    return requestStatusFromStringImpl(value, field);
}

std::string requestStatusToString(RequestStatus status)
{
    return requestStatusToStringImpl(status);
}

Stop::Type stopTypeFromString(const std::string& value, const std::string& field)
{
    return stopTypeFromStringImpl(value, field);
}

std::string stopTypeToString(Stop::Type type)
{
    return stopTypeToStringImpl(type);
}

Vehicle vehicleFromJson(const json& j)
{
    if (!j.is_object())
    {
        throw std::invalid_argument("Field 'vehicle': must be an object");
    }

    Vehicle v;
    v.id = getIntField(j, "id");
    v.type = vehicleTypeFromString(getStringField(j, "type"), "type");
    v.capacity = getIntField(j, "capacity");
    v.currentLocation = getIntField(j, "currentLocation");
    v.state = vehicleStateFromString(getStringField(j, "state"), "state");
    v.route = routeFromJsonArray(j, "route");
    v.currentRiders = getIntArrayField(j, "currentRiders");
    return v;
}

json vehicleToJson(const Vehicle& v)
{
    json j = json::object_t();
    j["id"] = v.id;
    j["type"] = vehicleTypeToString(v.type);
    j["capacity"] = v.capacity;
    j["currentLocation"] = v.currentLocation;
    j["state"] = vehicleStateToString(v.state);
    j["route"] = routeToJsonArray(v.route);
    j["currentRiders"] = json::array_t();
    for (int rider : v.currentRiders)
    {
        j["currentRiders"].push_back(rider);
    }
    return j;
}

RideRequest rideRequestFromJson(const json& j)
{
    if (!j.is_object())
    {
        throw std::invalid_argument("Field 'rideRequest': must be an object");
    }

    RideRequest r;
    r.id = getIntField(j, "id");
    r.pickupLocation = getIntField(j, "pickupLocation");
    r.dropLocation = getIntField(j, "dropLocation");
    r.requestTime = getLongLongField(j, "requestTime");
    r.latestPickupTime = getLongLongField(j, "latestPickupTime");
    r.status = requestStatusFromString(getStringField(j, "status"), "status");
    return r;
}

json rideRequestToJson(const RideRequest& r)
{
    json j = json::object_t();
    j["id"] = r.id;
    j["pickupLocation"] = r.pickupLocation;
    j["dropLocation"] = r.dropLocation;
    j["requestTime"] = r.requestTime;
    j["latestPickupTime"] = r.latestPickupTime;
    j["status"] = requestStatusToString(r.status);
    return j;
}

Stop stopFromJson(const json& j)
{
    if (!j.is_object())
    {
        throw std::invalid_argument("Field 'stop': must be an object");
    }

    Stop s;
    s.location = getIntField(j, "location");
    s.riderId = getIntField(j, "riderId");
    s.type = stopTypeFromString(getStringField(j, "type"), "type");
    return s;
}

json stopToJson(const Stop& s)
{
    json j = json::object_t();
    j["location"] = s.location;
    j["riderId"] = s.riderId;
    j["type"] = stopTypeToString(s.type);
    return j;
}

CampusGraph campusGraphFromJson(const json& j)
{
    if (!j.is_object())
    {
        throw std::invalid_argument("Field 'campusGraph': must be an object");
    }
    if (!j.contains("nodes") || !j.contains("edges"))
    {
        throw std::invalid_argument("Field 'campusGraph': missing required 'nodes' or 'edges'");
    }

    const json& nodes = j.at("nodes");
    const json& edges = j.at("edges");
    if (!nodes.is_array() || !edges.is_array())
    {
        throw std::invalid_argument("Field 'campusGraph': 'nodes' and 'edges' must be arrays");
    }

    int maxNodeId = -1;
    for (std::size_t i = 0; i < nodes.size(); ++i)
    {
        const json& node = nodes[i];
        if (!node.is_object())
        {
            throw std::invalid_argument("Field 'campusGraph.nodes': each entry must be an object");
        }
        int id = getIntField(node, "id");
        maxNodeId = std::max(maxNodeId, id);
    }
    for (std::size_t i = 0; i < edges.size(); ++i)
    {
        const json& edge = edges[i];
        if (!edge.is_object())
        {
            throw std::invalid_argument("Field 'campusGraph.edges': each entry must be an object");
        }
        maxNodeId = std::max(maxNodeId, getIntField(edge, "from"));
        maxNodeId = std::max(maxNodeId, getIntField(edge, "to"));
    }

    CampusGraph graph(maxNodeId >= 0 ? static_cast<std::size_t>(maxNodeId + 1) : 0);
    for (std::size_t i = 0; i < nodes.size(); ++i)
    {
        const json& node = nodes[i];
        const int id = getIntField(node, "id");
        const std::string name = getStringField(node, "name", false);
        if (id >= 0 && id < graph.nodeCount())
        {
            graph.setNodeName(id, name);
        }
    }

    for (std::size_t i = 0; i < edges.size(); ++i)
    {
        const json& edge = edges[i];
        const int from = getIntField(edge, "from");
        const int to = getIntField(edge, "to");
        const double distance = getDoubleField(edge, "distance");
        const double travelTime = getDoubleField(edge, "travelTime");
        const bool directed = getBooleanField(edge, "directed", false);
        graph.addEdge(from, to, distance, travelTime, directed);
    }

    return graph;
}

json campusGraphToJson(const CampusGraph& graph)
{
    json nodes = json::array_t();
    for (int i = 0; i < graph.nodeCount(); ++i)
    {
        json node = json::object_t();
        node["id"] = i;
        node["name"] = graph.nodeName(i);
        nodes.push_back(node);
    }

    json edges = json::array_t();
    std::vector<std::tuple<int, int, double, double, bool>> seen;
    for (int from = 0; from < graph.nodeCount(); ++from)
    {
        for (const auto& edge : graph.adjacency[static_cast<std::size_t>(from)])
        {
            int to = edge.destination;
            const double distance = edge.distance;
            const double travelTime = edge.travelTime;
            const bool directed = false;
            const auto key = std::make_tuple(from, to, distance, travelTime, directed);
            bool duplicate = false;
            for (const auto& existing : seen)
            {
                if (existing == key)
                {
                    duplicate = true;
                    break;
                }
            }
            if (duplicate)
            {
                continue;
            }
            seen.push_back(key);
            if (from <= to || directed)
            {
                json item = json::object_t();
                item["from"] = from;
                item["to"] = to;
                item["distance"] = distance;
                item["travelTime"] = travelTime;
                item["directed"] = directed;
                edges.push_back(item);
            }
        }
    }

    json result = json::object_t();
    result["nodes"] = nodes;
    result["edges"] = edges;
    return result;
}

Weights weightsFromJson(const json& j)
{
    Weights weights;
    if (!j.is_object())
    {
        return weights;
    }

    weights.waiting = getDoubleField(j, "waiting", false, weights.waiting);
    weights.travelTime = getDoubleField(j, "travelTime", false, weights.travelTime);
    weights.distance = getDoubleField(j, "distance", false, weights.distance);
    weights.detour = getDoubleField(j, "detour", false, weights.detour);
    weights.vehiclePenalty = getDoubleField(j, "vehiclePenalty", false, weights.vehiclePenalty);
    weights.underUtilization = getDoubleField(j, "underUtilization", false, weights.underUtilization);
    weights.busActivationPenalty = getDoubleField(j, "busActivationPenalty", false, weights.busActivationPenalty);
    weights.buggyActivationPenalty = getDoubleField(j, "buggyActivationPenalty", false, weights.buggyActivationPenalty);
    weights.carActivationPenalty = getDoubleField(j, "carActivationPenalty", false, weights.carActivationPenalty);
    if (j.contains("buggyActivationPenalty") && !j.contains("carActivationPenalty") && weights.buggyActivationPenalty > 0.0)
    {
        weights.carActivationPenalty = weights.buggyActivationPenalty;
    }
    if (j.contains("carActivationPenalty") && !j.contains("buggyActivationPenalty") && weights.carActivationPenalty > 0.0)
    {
        weights.buggyActivationPenalty = weights.carActivationPenalty;
    }
    weights.twoWheelerActivationPenalty = getDoubleField(j, "twoWheelerActivationPenalty", false, weights.twoWheelerActivationPenalty);
    return weights;
}

json weightsToJson(const Weights& weights)
{
    json j = json::object_t();
    j["waiting"] = weights.waiting;
    j["travelTime"] = weights.travelTime;
    j["distance"] = weights.distance;
    j["detour"] = weights.detour;
    j["vehiclePenalty"] = weights.vehiclePenalty;
    j["underUtilization"] = weights.underUtilization;
    j["busActivationPenalty"] = weights.busActivationPenalty;
    j["buggyActivationPenalty"] = weights.buggyActivationPenalty > 0.0 ? weights.buggyActivationPenalty : weights.carActivationPenalty;
    j["carActivationPenalty"] = weights.carActivationPenalty > 0.0 ? weights.carActivationPenalty : weights.buggyActivationPenalty;
    j["twoWheelerActivationPenalty"] = weights.twoWheelerActivationPenalty;
    return j;
}

FleetOptimizerConfig fleetOptimizerConfigFromJson(const json& j)
{
    FleetOptimizerConfig config;
    if (!j.is_object())
    {
        return config;
    }

    if (j.contains("shortlistLimit"))
    {
        config.shortlistLimit = static_cast<std::size_t>(getIntField(j, "shortlistLimit"));
    }
    if (j.contains("switchingPenalty"))
    {
        config.switchingPenalty = getDoubleField(j, "switchingPenalty");
    }
    if (j.contains("allowReoptimization"))
    {
        config.allowReoptimization = getBooleanField(j, "allowReoptimization");
    }
    return config;
}

json fleetOptimizerConfigToJson(const FleetOptimizerConfig& config)
{
    json j = json::object_t();
    j["shortlistLimit"] = static_cast<int>(config.shortlistLimit);
    j["switchingPenalty"] = config.switchingPenalty;
    j["allowReoptimization"] = config.allowReoptimization;
    return j;
}

CostBreakdown costBreakdownFromJson(const json& j)
{
    CostBreakdown c;
    if (!j.is_object())
    {
        return c;
    }
    c.waiting = getDoubleField(j, "waiting", false, c.waiting);
    c.travelTime = getDoubleField(j, "travelTime", false, c.travelTime);
    c.addDistance = getDoubleField(j, "addDistance", false, c.addDistance);
    c.detour = getDoubleField(j, "detour", false, c.detour);
    c.vehiclePenalty = getDoubleField(j, "vehiclePenalty", false, c.vehiclePenalty);
    c.underUtil = getDoubleField(j, "underUtil", false, c.underUtil);
    c.total = getDoubleField(j, "total", false, c.total);
    return c;
}

json costBreakdownToJson(const CostBreakdown& c)
{
    json j = json::object_t();
    j["waiting"] = c.waiting;
    j["travelTime"] = c.travelTime;
    j["addDistance"] = c.addDistance;
    j["detour"] = c.detour;
    j["vehiclePenalty"] = c.vehiclePenalty;
    j["underUtil"] = c.underUtil;
    j["total"] = c.total;
    return j;
}

AssignmentResult assignmentResultFromJson(const json& j)
{
    if (!j.is_object())
    {
        throw std::invalid_argument("Field 'assignmentResult': must be an object");
    }

    AssignmentResult result;
    result.assigned = getBooleanField(j, "assigned");
    result.vehicleId = getIntField(j, "vehicleId");
    result.route = {};
    if (j.contains("route"))
    {
        const json& routeArray = j.at("route");
        if (!routeArray.is_array())
        {
            throw std::invalid_argument(fieldError("route", "must be an array"));
        }
        for (std::size_t i = 0; i < routeArray.size(); ++i)
        {
            result.route.push_back(stopFromJson(routeArray[i]));
        }
    }
    if (j.contains("cost"))
    {
        result.cost = costBreakdownFromJson(j.at("cost"));
    }
    if (j.contains("explanation"))
    {
        const json& explanation = j.at("explanation");
        if (!explanation.is_object())
        {
            throw std::invalid_argument("Field 'explanation': must be an object");
        }
        result.explanation.vehicleId = getIntField(explanation, "vehicleId");
        result.explanation.totalCost = getDoubleField(explanation, "totalCost");
        result.explanation.vehicleStateBefore = getStringField(explanation, "vehicleStateBefore");
        result.explanation.reason = getStringField(explanation, "reason");
        if (explanation.contains("breakdown"))
        {
            result.explanation.breakdown = costBreakdownFromJson(explanation.at("breakdown"));
        }
    }
    return result;
}

json assignmentResultToJson(const AssignmentResult& r)
{
    json result = json::object_t();
    result["assigned"] = r.assigned;
    result["vehicleId"] = r.vehicleId;
    result["route"] = routeToJsonArray(r.route);
    result["cost"] = costBreakdownToJson(r.cost);

    json explanation = json::object_t();
    explanation["vehicleId"] = r.explanation.vehicleId;
    explanation["totalCost"] = r.explanation.totalCost;
    explanation["vehicleStateBefore"] = r.explanation.vehicleStateBefore;
    explanation["reason"] = r.explanation.reason;
    explanation["breakdown"] = costBreakdownToJson(r.explanation.breakdown);
    result["explanation"] = explanation;
    return result;
}
