#include "../io/json_io.hpp"

#include <algorithm>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

using json = nlohmann::json;

namespace
{
int readIntField(const json& j, const std::string& field)
{
    if (!j.contains(field))
    {
        throw std::invalid_argument("Field '" + field + "': missing required field");
    }
    if (!j.at(field).is_number_integer())
    {
        throw std::invalid_argument("Field '" + field + "': must be an integer");
    }
    return j.at(field).get<int>();
}

std::string readStringField(const json& j, const std::string& field)
{
    if (!j.contains(field))
    {
        throw std::invalid_argument("Field '" + field + "': missing required field");
    }
    if (!j.at(field).is_string())
    {
        throw std::invalid_argument("Field '" + field + "': must be a string");
    }
    return j.at(field).get<std::string>();
}

json withRequestId(const json& message, json response)
{
    if (message.contains("requestId"))
    {
        response["requestId"] = message["requestId"];
    }
    return response;
}

json errorResponse(const json& message, const std::string& text)
{
    json response = json::object();
    response["type"] = "error";
    response["message"] = text;
    return withRequestId(message, response);
}

json ackResponse(const json& message)
{
    json response = json::object();
    response["type"] = "ack";
    return withRequestId(message, response);
}

bool vehicleIdExists(const std::vector<Vehicle>& fleet, int vehicleId)
{
    return std::any_of(fleet.begin(), fleet.end(), [vehicleId](const Vehicle& vehicle)
                       {
                           return vehicle.id == vehicleId;
                       });
}

Vehicle* findVehicle(std::vector<Vehicle>& fleet, int vehicleId)
{
    const auto it = std::find_if(fleet.begin(), fleet.end(), [vehicleId](const Vehicle& vehicle)
                                {
                                    return vehicle.id == vehicleId;
                                });
    if (it == fleet.end())
    {
        return nullptr;
    }
    return &(*it);
}

const Vehicle* findVehicle(const std::vector<Vehicle>& fleet, int vehicleId)
{
    const auto it = std::find_if(fleet.begin(), fleet.end(), [vehicleId](const Vehicle& vehicle)
                                {
                                    return vehicle.id == vehicleId;
                                });
    if (it == fleet.end())
    {
        return nullptr;
    }
    return &(*it);
}

void writeJsonLine(const json& payload)
{
    std::cout << payload.dump() << '\n' << std::flush;
}

std::vector<Vehicle> buildFleetFromJson(const json& fleetArray)
{
    if (!fleetArray.is_array())
    {
        throw std::invalid_argument("Field 'fleet': must be an array");
    }

    std::vector<Vehicle> fleet;
    for (std::size_t i = 0; i < fleetArray.size(); ++i)
    {
        const Vehicle vehicle = vehicleFromJson(fleetArray[i]);
        if (findVehicle(fleet, vehicle.id) != nullptr)
        {
            throw std::invalid_argument("Field 'fleet': duplicate vehicle.id '" + std::to_string(vehicle.id) + "'");
        }
        fleet.push_back(vehicle);
    }
    return fleet;
}

void upsertVehicle(std::vector<Vehicle>& fleet, const Vehicle& vehicle)
{
    Vehicle* existing = findVehicle(fleet, vehicle.id);
    if (existing == nullptr)
    {
        fleet.push_back(vehicle);
        return;
    }
    *existing = vehicle;
}

void removeVehicle(std::vector<Vehicle>& fleet, int vehicleId)
{
    const auto it = std::remove_if(fleet.begin(), fleet.end(), [vehicleId](const Vehicle& vehicle)
                                  {
                                      return vehicle.id == vehicleId;
                                  });
    fleet.erase(it, fleet.end());
}

void assertObjectMessage(const json& message, const std::string& fieldName)
{
    if (!message.is_object())
    {
        throw std::invalid_argument("Field '" + fieldName + "': must be an object");
    }
}
} // namespace

int main()
{
    std::ios::sync_with_stdio(false);
    std::cin.tie(nullptr);

    std::string line;
    if (!std::getline(std::cin, line))
    {
        writeJsonLine(json{{"type", "error"}, {"message", "No init message received"}});
        return 1;
    }

    try
    {
        const json initMessage = json::parse(line);
        if (!initMessage.is_object())
        {
            throw std::invalid_argument("Field 'init': must be an object");
        }
        if (initMessage.value("type", "") != "init")
        {
            throw std::invalid_argument("Field 'type': expected 'init' on startup");
        }
        if (!initMessage.contains("campusGraph"))
        {
            throw std::invalid_argument("Field 'campusGraph': missing required campus graph");
        }

        const CampusGraph campusGraph = campusGraphFromJson(initMessage.at("campusGraph"));
        const Weights weights = initMessage.contains("weights") ? weightsFromJson(initMessage.at("weights")) : Weights();

        FleetOptimizerConfig config = FleetOptimizerConfig();
        if (initMessage.contains("fleetOptimizerConfig"))
        {
            config = fleetOptimizerConfigFromJson(initMessage.at("fleetOptimizerConfig"));
        }
        else if (initMessage.contains("config"))
        {
            config = fleetOptimizerConfigFromJson(initMessage.at("config"));
        }

        RoutingEngine routingEngine(campusGraph, true);
        FleetOptimizer optimizer(campusGraph, weights, config);

        std::vector<Vehicle> fleet;
        if (initMessage.contains("fleet"))
        {
            fleet = buildFleetFromJson(initMessage.at("fleet"));
        }

        writeJsonLine(json{{"type", "init_ack"}, {"status", "ok"}});

        while (std::getline(std::cin, line))
        {
            if (line.empty())
            {
                continue;
            }

            json message;
            try
            {
                message = json::parse(line);
                if (!message.is_object())
                {
                    throw std::invalid_argument("Field 'message': must be an object");
                }

                const std::string type = message.value("type", "");

                if (type == "shutdown")
                {
                    std::cout << std::flush;
                    return 0;
                }

                if (type == "add_vehicle")
                {
                    if (!message.contains("vehicle"))
                    {
                        throw std::invalid_argument("Field 'vehicle': missing required vehicle object");
                    }
                    const Vehicle vehicle = vehicleFromJson(message.at("vehicle"));
                    upsertVehicle(fleet, vehicle);
                    writeJsonLine(withRequestId(message, json{{"type", "ack"}}));
                    continue;
                }

                if (type == "remove_vehicle")
                {
                    const int vehicleId = readIntField(message, "vehicleId");
                    removeVehicle(fleet, vehicleId);
                    writeJsonLine(withRequestId(message, json{{"type", "ack"}}));
                    continue;
                }

                if (type == "set_vehicle_state")
                {
                    const int vehicleId = readIntField(message, "vehicleId");
                    const std::string stateValue = readStringField(message, "state");
                    Vehicle* vehicle = findVehicle(fleet, vehicleId);
                    if (vehicle == nullptr)
                    {
                        throw std::invalid_argument("Field 'vehicleId': no vehicle with id " + std::to_string(vehicleId));
                    }
                    vehicle->state = vehicleStateFromString(stateValue, "state");
                    writeJsonLine(withRequestId(message, json{{"type", "ack"}}));
                    continue;
                }

                if (type == "assign_request")
                {
                    if (!message.contains("request"))
                    {
                        throw std::invalid_argument("Field 'request': missing required request object");
                    }
                    const RideRequest request = rideRequestFromJson(message.at("request"));
                    RideRequest mutableRequest = request;
                    const AssignmentResult result = optimizer.optimizeForRequest(fleet, mutableRequest, routingEngine);
                    json response = json::object();
                    response["type"] = "assignment_result";
                    response["result"] = assignmentResultToJson(result);
                    response["requestId"] = message.contains("requestId") ? message["requestId"] : nullptr;
                    writeJsonLine(response);
                    continue;
                }

                if (type == "get_fleet_state")
                {
                    json fleetState = json::array();
                    for (const Vehicle& vehicle : fleet)
                    {
                        fleetState.push_back(vehicleToJson(vehicle));
                    }
                    json response = json::object();
                    response["type"] = "fleet_state";
                    response["vehicles"] = fleetState;
                    if (message.contains("requestId"))
                    {
                        response["requestId"] = message["requestId"];
                    }
                    writeJsonLine(response);
                    continue;
                }

                throw std::invalid_argument("Field 'type': unsupported message type '" + type + "'");
            }
            catch (const std::exception& ex)
            {
                json errorMessage = json::object();
                errorMessage["type"] = "error";
                errorMessage["message"] = ex.what();
                if (message.contains("requestId"))
                {
                    errorMessage["requestId"] = message["requestId"];
                }
                writeJsonLine(errorMessage);
            }
        }
    }
    catch (const std::exception& ex)
    {
        writeJsonLine(json{{"type", "init_ack"}, {"status", "error"}, {"message", ex.what()}});
        return 1;
    }

    return 0;
}
