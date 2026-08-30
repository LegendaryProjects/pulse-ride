# Developer's Field Manual: Campus Shared-Mobility Routing Engine (`help.md`)

> **NITK Campus Shared Mobility, Dynamic Ride-Sharing & Algorithmic Routing Engine**  
> *Living Technical Documentation & Developer Reference Manual*

---

## 1. Project Overview

The **Campus Shared-Mobility Routing Engine** is an algorithmic platform designed for college-managed, campus-confined transportation systems (specifically configured for National Institute of Technology Karnataka, Surathkal - NITK).

### Core Realities of the System
* **College-Managed Fleet**: The fleet is owned and operated by the institution.
* **No Marketplace / Fare Dynamics**: There is no Uber/Ola dynamic pricing, no driver bidding, no payment processing, and no commission model.
* **Heterogeneous Fleet**: Vehicles range from 2-wheelers (capacity 1), campus buggies/shuttles (capacity 3–6), to campus buses (capacity 10–20+).
* **Multi-Passenger Dynamic Ride-Sharing**: Instead of simple 1-to-1 matching (e.g. Hungarian / Kuhn-Munkres algorithm), vehicles serve continuously evolving pickup-and-delivery routes with multiple riders onboard simultaneously.
* **Route-Centric Insertion**: Ride requests are fulfilled by testing all valid insertion permutations (pickup before drop) across candidate vehicle routes while enforcing hard physical constraints (capacity at all route segments, vehicle availability, graph reachability).
* **Multi-Objective Cost Optimization**: Candidate route insertions are evaluated and ranked via a configurable scalarized objective function that balances waiting time, total travel time, route detour for onboard passengers, distance increase, vehicle activation penalties, and vehicle capacity utilization.
* **Node.js Subprocess Integration**: The core algorithmic solver is written in C++17 for raw computational speed and deterministic memory management, communicating with an institutional Node.js backend service via Newline-Delimited JSON (NDJSON) over standard input (`stdin`) and standard output (`stdout`).

---

## 2. Architecture

### Current Operational Architecture (As Implemented)

```text
               +-------------------------------------------+
               |           Node.js Host Process            |
               | (Backend API, WebSocket, Dispatcher UI)   |
               +-------------------------------------------+
                                     |
               (child_process.spawn - NDJSON via stdin / stdout)
                                     |
                                     v
+=========================================================================+
|                  C++17 Algorithmic Engine (engine_main)                 |
|                                                                         |
|  [Layer 9: CLI & IPC Protocol]                                          |
|  - Reads NDJSON commands: 'init', 'add_vehicle', 'assign_request', ...  |
|  - Emits NDJSON responses: 'init_ack', 'assignment_result', 'error'    |
|                                                                         |
|  [Layer 8: JSON Serialization / Deserialization (json_io)]             |
|  - Marshals domain objects to/from nlohmann::json                       |
|                                                                         |
|  [Layer 7: Fleet Optimizer (fleet_optimizer)]                           |
|  - Orchestrates candidate vehicle shortlisting                          |
|  - Evaluates best insertions across shortlisted fleet                   |
|  - Applies greedy minimum-cost selection & state update                 |
|                                                                         |
|  [Layer 6: Candidate Vehicle Generator (candidate_vehicle_generator)]  |
|  - Heuristic pre-filtering (maintenance, capacity, distance, direction) |
|                                                                         |
|  [Layer 5: Route Insertion Engine (route_insertion_engine)]             |
|  - Evaluates O(N^2) pickup/drop insertion pairs into vehicle routes     |
|                                                                         |
|  [Layer 4: Cost Scoring Engine (cost_engine)]                           |
|  - Multi-objective cost calculation (waiting, travel, detour, etc.)     |
|                                                                         |
|  [Layer 3: Constraint Validation Engine (constraint_engine)]            |
|  - Hard constraint enforcement (capacity, pickup-before-drop, etc.)    |
|                                                                         |
|  [Layer 2: Campus Graph & Routing Engine (campus_routing)]              |
|  - Adjacency list topology, Dijkstra shortest paths, travel times       |
|                                                                         |
|  [Layer 1: Core Domain Models (models)]                                 |
|  - Vehicle, Stop, RideRequest, Enums (VehicleType, VehicleState, etc.)  |
+=========================================================================+
```

### Intended Master Architecture (Target Vision)

```text
[ Historical / Telemetry Data ]
              |
              v
[ Demand Prediction Engine ] ---------> [ Spatial-Temporal Demand Map ]
                                                    |
                                                    v
[ Fleet Positioning Engine ] <--------- [ High-Demand Zone Rebalancing ]
              |
              | (Repositioning routes)
              v
[ Dynamic Ride Requests ] ---> [ Batch / Rolling Horizon Optimizer ]
                                        |
                             +----------+----------+
                             | Candidate Filtering |
                             | Feasibility Checks  |
                             | Route Insertion     |
                             | Cost Scoring        |
                             +---------------------+
                                        |
                                        v
                            [ Live Fleet Execution ]
                                        |
                                        v
                             [ Operational Metrics ]
```

---

## 3. Repository Map

| Component / Layer | Primary File(s) | Key Class / Struct / Functions | Core Responsibility |
| :--- | :--- | :--- | :--- |
| **Domain Models** | `src/core/models.hpp`<br>`src/core/models.cpp` | `Vehicle`, `Stop`, `RideRequest`, `VehicleType`, `VehicleState`, `RequestStatus` | Data contracts for vehicles, stops, requests, and routes. |
| **Graph & Routing** | `src/graph/campus_routing.hpp`<br>`src/graph/campus_routing.cpp` | `CampusGraph`, `CampusGraph::Edge`, `RoutingEngine` | Campus road network topology, Dijkstra pathfinding, travel time and distance calculation. |
| **Constraint Validation** | `src/validation/constraint_engine.hpp`<br>`src/validation/constraint_engine.cpp` | `ConstraintEngine`, `ValidationResult` | Pure feasibility gate: capacity limits at all route points, pickup-before-drop order, no duplicate stops. |
| **Cost Scoring** | `src/scoring/cost_engine.hpp`<br>`src/scoring/cost_engine.cpp` | `CostEngine`, `Weights`, `CostBreakdown` | Multi-objective cost evaluation: waiting time, travel time, added distance, passenger detours, vehicle activation. |
| **Route Insertion** | `src/routing/route_insertion_engine.hpp`<br>`src/routing/route_insertion_engine.cpp` | `RouteInsertionEngine`, `CandidateRoute` | Explores all $O(N^2)$ legal stop insertion pairs (pickup before drop) into an existing route. |
| **Candidate Shortlisting**| `src/routing/candidate_vehicle_generator.hpp`<br>`src/routing/candidate_vehicle_generator.cpp` | `CandidateVehicleGenerator`, `VehicleShortlistEntry` | Pre-filters the fleet to shortlist promising vehicles before running expensive insertion search. |
| **Fleet Optimizer** | `src/optimizer/fleet_optimizer.hpp`<br>`src/optimizer/fleet_optimizer.cpp` | `FleetOptimizer`, `AssignmentResult`, `AssignmentExplanation`, `FleetOptimizerConfig` | Top-level dispatcher: shortlists vehicles, evaluates candidate insertions, picks global minimum cost. |
| **JSON Serialization** | `src/io/json_io.hpp`<br>`src/io/json_io.cpp` | `vehicleFromJson`, `rideRequestFromJson`, `campusGraphFromJson`, etc. | Robust schema validation and conversion between C++ domain structs and nlohmann::json. |
| **CLI & Subprocess Entry**| `src/cli/engine_main.cpp` | `main()`, NDJSON command dispatch loop | Long-lived stdin/stdout NDJSON loop handling IPC with Node.js host. |
| **Node.js Client** | `engineClient.js` | `EngineClient` | Node.js wrapper class managing child-process lifecycle, timeouts, and asynchronous request tracking. |
| **Third-Party JSON** | `third_party/json.hpp` | `nlohmann::json` | Industry-standard header-only C++ JSON parser & serializer; enables zero-dependency compilation. |
| **Testing Harnesses** | `tests/*.cpp`, `tests/*.js` | Unit test binaries & integration tests | Verification tests for individual layers and end-to-end multi-request scenarios. |
| **Tools & Utilities** | `tools/generate_campus_graph.js`<br>`tools/interactive_engine_tester.js`<br>`tools/test_scenarios.js` | Graph generation, interactive CLI tester, realistic scenario benchmarks | Tools for creating campus graphs, manual engine experimentation, and automated scenario validation. |

---

## 4. Algorithm Map

```text
Routing:
  Dijkstra's Shortest Path Algorithm (min travel time, tie-break by distance)
  + Optional All-Pairs Shortest Path precomputation (N < 200 nodes)

Vehicle Selection:
  CandidateVehicleGenerator::shortlistVehicles()
  - Exclude MAINTENANCE state
  - Exclude vehicles at capacity over their route
  - Rank by heuristic score (distance to pickup, direction bonus, vehicle size, return state)

Route Insertion:
  RouteInsertionEngine::generateCandidates()
  - Enumerate pickup position i from 0 to N
  - Enumerate drop position j from i to N
  - Insert PICKUP at i, DROP at j+1
  - Validate with ConstraintEngine
  - Reject if pickup ETA > latestPickupTime
  - Calculate CostBreakdown with CostEngine
  - Sort candidates ascending by total cost

Constraints:
  ConstraintEngine::validate()
  - Vehicle not in MAINTENANCE
  - All stop locations exist in CampusGraph
  - Running passenger count <= vehicle.capacity at every route prefix
  - Rider pickup strictly precedes rider drop
  - No duplicate pickups or drops for same rider

Cost Function:
  CostEngine::calculateCost()
  - Cost = w_w * Waiting + w_t * TravelTime + w_d * AddDistance 
         + w_r * Detour + w_v * VehiclePenalty + w_u * UnderUtil

Optimization:
  FleetOptimizer::optimizeForRequest()
  - Greedy Minimum-Cost Insertion across shortlisted vehicles
  - Applies winning candidate route to vehicle
  - Transition IDLE -> ASSIGNED
```

---

## 5. File-by-File Explanation

### `src/core/models.hpp` & `models.cpp`
* **Purpose**: Declares and implements fundamental data structures and enums.
* **Important Enums**:
  * `VehicleType`: `TWO_WHEELER` (cap 1), `BUGGY` (cap 3–6), `BUS` (cap 10+). Note: JSON parser maps legacy `"CAR"` to `BUGGY`.
  * `VehicleState`: `IDLE`, `ASSIGNED`, `ON_TRIP`, `RETURNING`, `MAINTENANCE`.
  * `RequestStatus`: `WAITING`, `ASSIGNED`, `PICKED_UP`, `COMPLETED`, `CANCELLED`.
* **Important Structs**:
  * `Stop`: Represents a route event with `location` (node ID), `riderId`, and `type` (`PICKUP` or `DROP`).
  * `RideRequest`: Represents a trip demand with `id`, `pickupLocation`, `dropLocation`, `requestTime` (epoch ms), `latestPickupTime` (epoch ms), `status`.
  * `Vehicle`: Operational vehicle state with `id`, `type`, `capacity`, `currentLocation`, `state`, `route` (`std::vector<Stop>`), `currentRiders` (`std::vector<int>`).
* **Important Functions**:
  * `passengerCountAtRouteIndex(const Vehicle& vehicle, std::size_t index)`: Counts passenger changes up to prefix `index`. *(Note: Known issue: does not include `currentRiders.size()`)*.
  * `Vehicle::debugRouteText()`: Formats route and occupancy for debugging.
* **Status**: Complete, but helper function requires fix for onboard passengers.

### `src/graph/campus_routing.hpp` & `campus_routing.cpp`
* **Purpose**: Models the physical road network and answers shortest path and travel time queries.
* **Important Classes**:
  * `CampusGraph`: Adjacency list graph with `Edge { int destination; double distance; double travelTime; }`.
  * `RoutingEngine`: Shortest path solver using Dijkstra's algorithm. Provides `distance(u, v)`, `travelTime(u, v)`, `shortestPath(u, v)`. Supports all-pairs precomputation matrix for small graphs ($N < 200$).
* **Inputs/Outputs**: Node indices, distances (meters), travel times (minutes).
* **Status**: Complete, robust.

### `src/validation/constraint_engine.hpp` & `constraint_engine.cpp`
* **Purpose**: Pure feasibility validation gatekeeper.
* **Important Classes**:
  * `ValidationResult`: `{ bool feasible; std::string reason; }`.
  * `ConstraintEngine`: Validates whether a candidate route can legally be executed by a vehicle. Checks: vehicle state $\neq$ `MAINTENANCE`, valid node IDs, running passenger count $\le$ capacity at all points, pickup before drop, no duplicate stop events.
* **Status**: Complete.

### `src/scoring/cost_engine.hpp` & `cost_engine.cpp`
* **Purpose**: Quantifies the quality of a candidate route insertion using a weighted scalar cost.
* **Important Classes**:
  * `Weights`: Configurable coefficients (`waiting`, `travelTime`, `distance`, `detour`, `vehiclePenalty`, `underUtilization`, plus vehicle-specific activation penalties: `busActivationPenalty`, `buggyActivationPenalty`, `twoWheelerActivationPenalty`). Supports loading from `.ini` / config files via `Weights::fromFile()`.
  * `CostBreakdown`: Individual cost term components and `total`.
  * `CostEngine`: Calculates added distance, new route travel time, waiting time for new rider, detour imposed on existing riders, vehicle activation penalty, and under-utilization penalty.
* **Status**: Complete, but has an active calculation bug in average route occupancy.

### `src/routing/route_insertion_engine.hpp` & `route_insertion_engine.cpp`
* **Purpose**: The core ride-sharing route exploration engine.
* **Important Classes**:
  * `CandidateRoute`: `{ std::vector<Stop> route; CostBreakdown cost; }`.
  * `RouteInsertionEngine`: Generates all feasible $(i, j)$ insertion points for a request into a vehicle's route, validates each through `ConstraintEngine`, checks pickup deadline `actualPickupTime <= latestPickupTime`, scores through `CostEngine`, and returns a sorted list of feasible candidate routes.
* **Status**: Complete.

### `src/routing/candidate_vehicle_generator.hpp` & `candidate_vehicle_generator.cpp`
* **Purpose**: Heuristic pre-filter to select the top $K$ vehicles before running full route insertion.
* **Important Classes**:
  * `CandidateVehicleGenerator`: Filters out maintenance vehicles and fully booked vehicles; scores remaining vehicles based on distance to pickup, direction bonus, vehicle state, and capacity class.
* **Status**: Complete, but has an inverted capacity ranking calculation bug.

### `src/optimizer/fleet_optimizer.hpp` & `fleet_optimizer.cpp`
* **Purpose**: Top-level fleet dispatcher.
* **Important Classes**:
  * `FleetOptimizer`: Executes greedy minimum-cost insertion. Calls `CandidateVehicleGenerator`, evaluates best candidate for each vehicle using `RouteInsertionEngine`, picks the global minimum, updates vehicle route and state (`IDLE` $\to$ `ASSIGNED`).
  * `AssignmentResult` & `AssignmentExplanation`: Return payload describing assignment success, route, cost breakdown, and human-readable explanation.
* **Status**: Complete.

### `src/io/json_io.hpp` & `json_io.cpp`
* **Purpose**: Type-safe conversion between C++ domain structs and JSON messages using `nlohmann::json`.
* **Functions**: Serializers and deserializers for all models, graphs, weights, results, and configs. Enforces strict type and existence checks.
* **Status**: Complete, robust.

### `src/cli/engine_main.cpp`
* **Purpose**: Main executable entry point for the C++ engine process.
* **Execution Flow**:
  1. Sets up fast I/O (`cin.tie(nullptr)`).
  2. Awaits `init` JSON message containing `campusGraph`, optional `weights`, and optional initial `fleet`.
  3. Responds with `{"type": "init_ack", "status": "ok"}`.
  4. Enters continuous `std::getline(cin, line)` loop processing commands: `add_vehicle`, `remove_vehicle`, `set_vehicle_state`, `assign_request`, `get_fleet_state`, `shutdown`.
  5. Flushes responses as single-line JSON to `stdout`.
* **Status**: Complete.

### `third_party/json.hpp`
* **Purpose**: Vendored single-header modern C++ JSON library ([nlohmann/json](https://github.com/nlohmann/json) v3.x).
* **Why It Is Present**: The C++ standard library lacks native JSON parsing and serialization capabilities. Since the algorithmic engine communicates with the Node.js backend via NDJSON messages, an efficient JSON library is essential.
* **Why Vendored**: Bundling the header directly in `third_party/` allows the entire C++ project to compile out-of-the-box using simple `g++ -std=c++17` commands without requiring package managers (vcpkg, conan, etc.).
* **Status**: **100% Mandatory Dependency**. Without it, `json_io.cpp`, `engine_main.cpp`, and tests cannot compile.

---

## 6. Class Reference

### `RoutingEngine`
* **File**: `src/graph/campus_routing.hpp`
* **Members**: `CampusGraph graph_`, `bool precomputeAllPairs_`, `vector<vector<double>> allPairDistances_`, `vector<vector<double>> allPairTravelTimes_`, `vector<vector<vector<int>>> allPairPaths_`.
* **Key Methods**:
  * `double distance(int source, int destination) const`: Returns shortest road distance in meters.
  * `double travelTime(int source, int destination) const`: Returns shortest travel time in minutes.
  * `std::vector<int> shortestPath(int source, int destination) const`: Returns sequence of node IDs.

### `ConstraintEngine`
* **File**: `src/validation/constraint_engine.hpp`
* **Members**: `CampusGraph campusGraph_`.
* **Key Methods**:
  * `ValidationResult validate(const Vehicle& vehicle, const std::vector<Stop>& candidateRoute) const`: Checks capacity, pickup/drop sequence, maintenance, and node validity.
  * `static int passengerCountAfterPrefix(const Vehicle& vehicle, const std::vector<Stop>& route, std::size_t prefixLength)`: Computes passenger occupancy considering onboard riders.

### `CostEngine`
* **File**: `src/scoring/cost_engine.hpp`
* **Key Methods**:
  * `CostBreakdown calculateCost(const Vehicle& vehicle, const std::vector<Stop>& oldRoute, const std::vector<Stop>& newRoute, const RideRequest& newRequest, const RoutingEngine& engine, const Weights& weights) const`.

### `RouteInsertionEngine`
* **File**: `src/routing/route_insertion_engine.hpp`
* **Members**: `CampusGraph campusGraph_`, `Weights weights_`, `ConstraintEngine constraintEngine_`, `CostEngine costEngine_`.
* **Key Methods**:
  * `std::vector<CandidateRoute> generateCandidates(const Vehicle& vehicle, const RideRequest& request, const std::vector<Stop>& oldRoute, const RoutingEngine& engine) const`.

### `CandidateVehicleGenerator`
* **File**: `src/routing/candidate_vehicle_generator.hpp`
* **Members**: `std::size_t maxCandidates_`.
* **Key Methods**:
  * `std::vector<int> shortlistVehicles(const std::vector<Vehicle>& fleet, const RideRequest& request, const RoutingEngine& engine, std::size_t maxCandidates) const`.

### `FleetOptimizer`
* **File**: `src/optimizer/fleet_optimizer.hpp`
* **Members**: `CampusGraph campusGraph_`, `Weights weights_`, `FleetOptimizerConfig config_`, `CandidateVehicleGenerator candidateGenerator_`, `RouteInsertionEngine routeInsertionEngine_`.
* **Key Methods**:
  * `AssignmentResult optimizeForRequest(std::vector<Vehicle>& fleet, RideRequest& request, const RoutingEngine& routingEngine) const`.

---

## 7. Function Reference

```cpp
// Routing
double RoutingEngine::distance(int source, int destination) const;
double RoutingEngine::travelTime(int source, int destination) const;
std::vector<int> RoutingEngine::shortestPath(int source, int destination) const;

// Pre-filtering
std::vector<int> CandidateVehicleGenerator::generate(
    const std::vector<Vehicle>& fleet,
    const RideRequest& request,
    const RoutingEngine& engine) const;

// Route Insertion
std::vector<CandidateRoute> RouteInsertionEngine::generateCandidates(
    const Vehicle& vehicle,
    const RideRequest& request,
    const std::vector<Stop>& oldRoute,
    const RoutingEngine& engine) const;

// Validation
ValidationResult ConstraintEngine::validate(
    const Vehicle& vehicle,
    const std::vector<Stop>& candidateRoute) const;

// Cost Scoring
CostBreakdown CostEngine::calculateCost(
    const Vehicle& vehicle,
    const std::vector<Stop>& oldRoute,
    const std::vector<Stop>& newRoute,
    const RideRequest& newRequest,
    const RoutingEngine& engine,
    const Weights& weights) const;

// Fleet Assignment
AssignmentResult FleetOptimizer::optimizeForRequest(
    std::vector<Vehicle>& fleet,
    RideRequest& request,
    const RoutingEngine& routingEngine) const;
```

---

## 8. Data Structures

### `Stop`
```cpp
struct Stop {
    enum class Type { PICKUP, DROP };
    int location;    // Node index in CampusGraph
    int riderId;     // RideRequest::id
    Type type;       // PICKUP or DROP
};
```

### `RideRequest`
```cpp
struct RideRequest {
    int id;                      // Unique request ID
    int pickupLocation;          // Origin node ID
    int dropLocation;            // Destination node ID
    long long requestTime;       // Epoch timestamp (ms)
    long long latestPickupTime;  // Hard deadline (ms)
    RequestStatus status;        // WAITING, ASSIGNED, etc.
};
```

### `Vehicle`
```cpp
struct Vehicle {
    int id;                          // Unique vehicle ID
    VehicleType type;                // TWO_WHEELER, BUGGY, BUS
    int capacity;                    // Maximum concurrent passengers
    int currentLocation;             // Current node index
    VehicleState state;              // IDLE, ASSIGNED, ON_TRIP, RETURNING, MAINTENANCE
    std::vector<Stop> route;         // Ordered list of upcoming stops
    std::vector<int> currentRiders;  // IDs of riders currently onboard
};
```

### `CostBreakdown`
```cpp
struct CostBreakdown {
    double waiting;         // Rider wait time to pickup (minutes)
    double travelTime;      // Total route travel time (minutes)
    double addDistance;     // Delta distance added to route (meters)
    double detour;          // Extra travel time added to existing riders (minutes)
    double vehiclePenalty;  // Idle activation cost (penalty points)
    double underUtil;       // 1.0 - (occupancy / capacity)
    double total;           // Weighted scalar sum
};
```

---

## 9. Data Flow

```text
[Incoming Ride Request JSON]
            |
            v (engine_main.cpp)
[rideRequestFromJson()]
            |
            v
[FleetOptimizer::optimizeForRequest()]
            |
            +---> [CandidateVehicleGenerator::generate()]
            |           |
            |           +-> Filters out MAINTENANCE & full vehicles
            |           +-> Heuristically ranks fleet by distance & direction
            |           +-> Returns top K vehicle IDs (default 10)
            |
            +---> For each shortlisted vehicle:
            |           |
            |           v
            |     [RouteInsertionEngine::generateCandidates()]
            |           |
            |           +-> Iterates pickupPos in [0, N], dropPos in [pickupPos, N]
            |           +-> Generates candidateRoute
            |           +-> [ConstraintEngine::validate()] (Capacity & Order checks)
            |           +-> [ETA Check] (actualPickupTime <= latestPickupTime)
            |           +-> [CostEngine::calculateCost()]
            |           +-> Returns sorted CandidateRoute list
            |
            +---> Evaluates cheapest candidate across all shortlisted vehicles
            |
            +---> If feasible vehicle found:
            |           +-> Updates selectedVehicle.route = bestCandidate.route
            |           +-> Transitions vehicle state IDLE -> ASSIGNED
            |           +-> Sets request.status = ASSIGNED
            |           +-> Returns AssignmentResult (assigned: true)
            |
            +---> If no feasible vehicle found:
                        +-> Sets request.status = WAITING
                        +-> Returns AssignmentResult (assigned: false, explanation)
            |
            v (engine_main.cpp)
[assignmentResultToJson()]
            |
            v (stdout NDJSON)
[Node.js EngineClient]
```

---

## 10. Route Insertion

### How It Works
Given a vehicle with an existing route of length $N$:
1. $N$ existing stops are indexed $0, 1, \dots, N-1$.
2. The outer loop selects pickup insertion index $p \in [0, N]$.
3. The inner loop selects drop insertion index $d \in [p, N]$.
4. The candidate route is created:
   - Insert `PICKUP` at index $p$.
   - Insert `DROP` at index $d + 1$.
5. Because $d \ge p$, the drop stop is guaranteed to appear strictly after the pickup stop ($d + 1 > p$).
6. The candidate route is verified by `ConstraintEngine::validate()`.
7. Pickup arrival time is verified against `latestPickupTime`.
8. The insertion is scored by `CostEngine::calculateCost()`.

### Concrete Example
* Existing Route: `[ (Node 1, Rider 10, PICKUP), (Node 4, Rider 10, DROP) ]` ($N=2$).
* New Request: Rider 20, Pickup at Node 2, Drop at Node 5.
* Insertion combinations ($3 \times 3$ potential slots):
  * $p=0, d=0$: `[ P20@2, D20@5, P10@1, D10@4 ]` (Rider 20 served before Rider 10)
  * $p=1, d=1$: `[ P10@1, P20@2, D20@5, D10@4 ]` (Rider 20 nested inside Rider 10's trip)
  * $p=1, d=2$: `[ P10@1, P20@2, D10@4, D20@5 ]` (Rider 10 dropped before Rider 20 dropped)
  * $p=2, d=2$: `[ P10@1, D10@4, P20@2, D20@5 ]` (Rider 20 appended after Rider 10 finishes)

Each candidate is evaluated for capacity and cost, with the minimum cost candidate selected.

---

## 11. Capacity Validation

Capacity validation is performed by `ConstraintEngine::passengerCountAfterPrefix()`:
1. Initialize onboard riders set from `vehicle.currentRiders`.
2. As stops are traversed prefix-by-prefix:
   - If a `PICKUP` stop is reached: occupancy incremented ($+1$).
   - If a `DROP` stop is reached: occupancy decremented ($-1$).
3. At every stop $i$ in the route, the check requires:
   $$\text{occupancy}_i \le \text{vehicle.capacity}$$
4. If at any stop $\text{occupancy}_i > \text{capacity}$, validation immediately fails with:  
   `"Capacity exceeded at route index i: X passengers > capacity Y."`

---

## 12. Cost Function

The objective cost is a scalar linear combination of six terms:

$$C = w_w \cdot W + w_t \cdot T + w_d \cdot D + w_r \cdot R + w_v \cdot V + w_u \cdot U$$

| Symbol | Term | Calculation | Default Weight |
| :--- | :--- | :--- | :--- |
| $W$ | **Waiting Time** | Time from vehicle's position through route to the new rider's pickup stop (minutes). | $w_w = 1.0$ |
| $T$ | **Travel Time** | Total traversal time of the updated route from vehicle location through all stops (minutes). | $w_t = 1.0$ |
| $D$ | **Added Distance** | $\text{Distance}(\text{newRoute}) - \text{Distance}(\text{oldRoute})$ (meters). | $w_d = 0.5$ |
| $R$ | **Detour** | Sum of extra delay added to existing riders' drop stops: $\sum \max(0, \text{newDropTime}_k - \text{baselineDropTime}_k)$ (minutes). | $w_r = 2.0$ |
| $V$ | **Vehicle Activation Penalty** | Penalty charged if an `IDLE` vehicle is activated (`busActivationPenalty`: 20.0, `buggyActivationPenalty`: 12.0, `twoWheelerActivationPenalty`: 6.0). 0.0 if vehicle was already active. | $w_v = 1.0$ |
| $U$ | **Under-Utilization** | Penalty for empty capacity: $\max(0.0, 1.0 - \text{utilization})$. | $w_u = 1.0$ |

All weights are fully configurable via JSON `weights` object or `.ini` config file.

---

## 13. Routing & Campus Graph

### Graph Structure
* **Representation**: Adjacency list (`std::vector<std::vector<Edge>>`).
* **Weights**: Each edge stores physical `distance` (meters) and `travelTime` (minutes).
* **Speed Profile**: Travel time is derived from distance using campus average internal speed ($15\text{ km/h} = 250\text{ m/min}$).

### Shortest Path Algorithm
* **Algorithm**: Dijkstra's algorithm with `std::priority_queue<std::pair<double, int>>`.
* **Objective**: Primary objective is **travel time**; ties are broken by **distance**.
* **Precomputation Matrix**: If $N < 200$, all-pairs shortest distances, travel times, and paths are precomputed at startup ($O(N \cdot (E + N \log N))$), providing $O(1)$ query lookups during optimization.

---

## 14. Vehicle Lifecycle

```text
               +---------------+
               |  MAINTENANCE  |
               +---------------+
                       ^
                       | (set_vehicle_state)
                       v
                 +------------+
                 |    IDLE    | <------------------------+
                 +------------+                          |
                       |                                 |
                       | (Ride assigned)                 |
                       v                                 |
                 +------------+                          | (Route completed,
                 |  ASSIGNED  |                          |  returns to base)
                 +------------+                          |
                       |                                 |
                       | (Vehicle departs / live GPS)    |
                       v                                 |
                 +------------+                          |
                 |  ON_TRIP   | -------------------------+
                 +------------+                          |
                       |                                 |
                       | (All drops done, heading back)  |
                       v                                 |
                 +------------+                          |
                 | RETURNING  | -------------------------+
                 +------------+
```

* `IDLE`: Stationed at a location with empty route. Incurs activation penalty if mobilized.
* `ASSIGNED`: Route planned, preparing for departure.
* `ON_TRIP`: En route executing pickups and drop-offs.
* `RETURNING`: Returning toward campus hub; highly eligible for return-trip sharing (receives score bonus in candidate generation).
* `MAINTENANCE`: Out of service; strictly excluded by `ConstraintEngine` and `CandidateVehicleGenerator`.

---

## 15. Return-Trip Sharing

Return-trip sharing is supported natively by the route insertion model.
When a vehicle has delivered passengers to a remote campus location (e.g. Karavali Hostel or Library) and has a scheduled return or is in `RETURNING` state:
* The route insertion engine tests inserting new requests into slots after the existing drop-off stops:
  $$\text{Current Drop-offs} \longrightarrow \text{New Return Pickup} \longrightarrow \text{Campus Hub Drop-off}$$
* The candidate generator grants a $-30.0$ heuristic score bonus to vehicles in `RETURNING` state, prioritizing them over mobilizing new idle vehicles from the depot.
* This prevents vehicles from deadheading (running empty on return trips).

---

## 16. Simulation

### Running Test Scenarios
Realistic campus scenarios can be executed via Node.js:

```powershell
# Run batch real-world NITK scenarios
node tools/test_scenarios.js

# Launch interactive CLI tester to manually inject requests and vehicles
npm run test:interactive
```

### Scenario Test Coverage in `tools/test_scenarios.js`
1. **Early Morning**: Isolated node connectivity test.
2. **Inter-Hostel Shuttle**: Multi-rider batch pooling into a single buggy from Girls Hostel to Library.
3. **Guest House Dining Loop**: Multi-vehicle cross-campus routing.
4. **Adke Circle Multi-Stop**: Sequential chained route expansion for campus bus.

---

## 17. Testing & Build Commands

### Compiling with g++ (C++17)

```powershell
# Build main engine executable
npm run build:engine

# Or manual g++ command
g++ -std=c++17 -I. -Isrc src/cli/engine_main.cpp `
    src/core/models.cpp src/graph/campus_routing.cpp `
    src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp `
    src/routing/route_insertion_engine.cpp src/routing/candidate_vehicle_generator.cpp `
    src/optimizer/fleet_optimizer.cpp src/io/json_io.cpp `
    -o engine_main.exe
```

### Running C++ Unit Tests

```powershell
# Candidate generator tests
g++ -std=c++17 -I. -Isrc tests/candidate_vehicle_generator_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/routing/candidate_vehicle_generator.cpp -o candidate_vehicle_generator_tests.exe
.\candidate_vehicle_generator_tests.exe

# Constraint engine tests
g++ -std=c++17 -I. -Isrc tests/constraint_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp -o constraint_engine_tests.exe
.\constraint_engine_tests.exe

# Cost engine tests
g++ -std=c++17 -I. -Isrc tests/cost_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/scoring/cost_engine.cpp -o cost_engine_tests.exe
.\cost_engine_tests.exe

# Route insertion engine tests
g++ -std=c++17 -I. -Isrc tests/route_insertion_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp src/routing/route_insertion_engine.cpp -o route_insertion_engine_tests.exe
.\route_insertion_engine_tests.exe

# Fleet optimizer tests
g++ -std=c++17 -I. -Isrc tests/fleet_optimizer_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp src/routing/route_insertion_engine.cpp src/routing/candidate_vehicle_generator.cpp src/optimizer/fleet_optimizer.cpp -o fleet_optimizer_tests.exe
.\fleet_optimizer_tests.exe

# JSON I/O serialization tests
g++ -std=c++17 -I. -Isrc tests/json_io_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/scoring/cost_engine.cpp src/optimizer/fleet_optimizer.cpp src/routing/candidate_vehicle_generator.cpp src/routing/route_insertion_engine.cpp src/validation/constraint_engine.cpp -o json_io_tests.exe
.\json_io_tests.exe
```

### Running Node.js Integration Tests

```powershell
npm test
```

---

## 18. Input / Output Format (NDJSON Protocol)

The engine communicates over standard I/O with single-line JSON objects terminated by `\n`.

### 1. Engine Initialization (`init`)
**Request**:
```json
{
  "type": "init",
  "campusGraph": {
    "nodes": [{"id": 0, "name": "NITK Beach"}, {"id": 1, "name": "LHC-C"}],
    "edges": [{"from": 0, "to": 1, "distance": 120.0, "travelTime": 10.0, "directed": false}]
  },
  "weights": {
    "waiting": 1.0,
    "travelTime": 1.0,
    "distance": 0.5,
    "detour": 2.0,
    "vehiclePenalty": 1.0,
    "underUtilization": 1.0,
    "busActivationPenalty": 20.0,
    "buggyActivationPenalty": 12.0,
    "twoWheelerActivationPenalty": 6.0
  },
  "fleet": []
}
```
**Response**:
```json
{"status": "ok", "type": "init_ack"}
```

### 2. Add / Update Vehicle (`add_vehicle`)
**Request**:
```json
{
  "type": "add_vehicle",
  "requestId": 10,
  "vehicle": {
    "id": 1,
    "type": "BUGGY",
    "capacity": 3,
    "currentLocation": 1,
    "state": "IDLE",
    "route": [],
    "currentRiders": []
  }
}
```
**Response**:
```json
{"type": "ack", "requestId": 10}
```

### 3. Assign Ride Request (`assign_request`)
**Request**:
```json
{
  "type": "assign_request",
  "requestId": 11,
  "request": {
    "id": 101,
    "pickupLocation": 1,
    "dropLocation": 4,
    "requestTime": 1700000000000,
    "latestPickupTime": 1700000600000,
    "status": "WAITING"
  }
}
```
**Response (Assigned)**:
```json
{
  "type": "assignment_result",
  "requestId": 11,
  "result": {
    "assigned": true,
    "vehicleId": 1,
    "route": [
      {"location": 1, "riderId": 101, "type": "PICKUP"},
      {"location": 4, "riderId": 101, "type": "DROP"}
    ],
    "cost": {
      "waiting": 0.0,
      "travelTime": 1.48,
      "addDistance": 369.0,
      "detour": 0.0,
      "vehiclePenalty": 12.0,
      "underUtil": 1.0,
      "total": 197.98
    },
    "explanation": {
      "vehicleId": 1,
      "vehicleStateBefore": "IDLE",
      "totalCost": 197.98,
      "reason": "vehicle=1, totalCost=197.98, waiting=0, travelTime=1.48, addDistance=369, detour=0, vehiclePenalty=12, underUtil=1, route=PICKUP rider=101 @1, DROP rider=101 @4",
      "breakdown": { ... }
    }
  }
}
```
**Response (Unassigned / No Feasible Vehicle)**:
```json
{
  "type": "assignment_result",
  "requestId": 11,
  "result": {
    "assigned": false,
    "vehicleId": -1,
    "route": [],
    "cost": { "total": 0.0, ... },
    "explanation": {
      "reason": "no feasible vehicle: all at capacity or latest pickup deadline exceeded",
      "totalCost": null,
      "vehicleStateBefore": "N/A"
    }
  }
}
```

### 4. Query Fleet State (`get_fleet_state`)
**Request**:
```json
{"type": "get_fleet_state", "requestId": 12}
```
**Response**:
```json
{
  "type": "fleet_state",
  "requestId": 12,
  "vehicles": [
    {
      "id": 1,
      "type": "BUGGY",
      "capacity": 3,
      "currentLocation": 1,
      "state": "ASSIGNED",
      "route": [
        {"location": 1, "riderId": 101, "type": "PICKUP"},
        {"location": 4, "riderId": 101, "type": "DROP"}
      ],
      "currentRiders": []
    }
  ]
}
```

### 5. Shutdown (`shutdown`)
**Request**:
```json
{"type": "shutdown"}
```
**Engine Action**: Flushes buffers and terminates with exit code 0.

---

## 19. Node.js Integration Contract

The integration client is implemented in `engineClient.js`:

```javascript
const { EngineClient } = require('./engineClient');
const graph = require('./tools/campus_graph_nitk.json');

const client = new EngineClient('./engine_main.exe', graph, {
  initTimeoutMs: 5000,
  requestTimeoutMs: 3000,
});

// Await engine initialization
await client.ready;

// Register vehicles
await client.addVehicle({
  id: 1,
  type: 'BUGGY',
  capacity: 3,
  currentLocation: 1,
  state: 'IDLE',
  route: [],
  currentRiders: [],
});

// Submit ride request
const result = await client.assignRequest({
  id: 101,
  pickupLocation: 1,
  dropLocation: 4,
  requestTime: Date.now(),
  latestPickupTime: Date.now() + 10 * 60 * 1000, // 10 minutes
  status: 'WAITING',
});

if (result.assigned) {
  console.log(`Assigned to Vehicle ${result.vehicleId}, Cost: ${result.cost.total}`);
} else {
  console.log(`Failed: ${result.explanation.reason}`);
}

// Clean shutdown
await client.shutdown();
```

---

## 20. Known Problems & Issue Inventory

| Issue ID | Severity | File | Component / Line | Problem Description | Impact | Potential Safe Solution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISS-01** | **RESOLVED** | `src/scoring/cost_engine.cpp` | `CostEngine::calculateCost` (L325-330) | **Occupancy Calculation Error**: Previously used net final occupancy instead of peak simultaneous occupancy. | RESOLVED: `utilization` is now derived from `maxOccupancy / capacity`. | Solved via `utilization = vehicle.capacity > 0 ? (maxOccupancy / capacity) : 0.0`. |
| **ISS-02** | **HIGH** | `src/routing/candidate_vehicle_generator.cpp` | `isVehicleEligible` (L123-126) | **Inverted Capacity Heuristic**: `score -= capacityRank * 25.0`. Since lower score is sorted first, larger vehicles (Buses, rank 3) get lower scores and are shortlisted before smaller vehicles. | Contradicts spec rule to prefer smaller idle vehicles before buses. | Change to `score += capacityRank * 25.0` for IDLE vehicles so smaller capacity ranks first. |
| **ISS-03** | **HIGH** | `tools/campus_graph_nitk.json` & `generate_campus_graph.js` | Graph generation | **Disconnected Beach Node**: NITK Beach (node 0) has 0 edges because distance to next node > 400m threshold and hints are empty. | Any request originating or terminating at Beach fails Dijkstra pathfinding. | Add explicit connection in `ADJACENCY_HINTS`: `[0, 1]` or `[0, 6]`. |
| **ISS-04** | **MEDIUM** | `src/routing/route_insertion_engine.cpp` | `generateCandidates` (L73-76) | **Zero Deadline Rejection**: If `latestPickupTime == 0` (default struct value), `latestPickupTime <= requestTime` evaluates true, rejecting the request immediately. | Requests without an explicit deadline cannot be routed. | Treat `latestPickupTime <= 0` as unconstrained. |
| **ISS-05** | **MEDIUM** | `src/routing/candidate_vehicle_generator.cpp` | `routeDistanceFromVehicleToPickup` (L18-23) | **Distance from Route Start Instead of End**: When vehicle route is not empty, distance is measured from `route.front()` instead of the vehicle's terminal stop or current location. | Distorts candidate ranking for busy vehicles. | Use `route.back().location` for vehicles completing ongoing trips, or route-interpolated position. |
| **ISS-06** | **MEDIUM** | `src/core/models.hpp` | `passengerCountAtRouteIndex` (L139-158) | **Ignoring Current Riders**: Function initializes count to 0 rather than `vehicle.currentRiders.size()`. | Debug route printing and vehicle inspection show incorrect occupancy counts when riders are onboard. | Initialize `passengerCount = vehicle.currentRiders.size()`. |
| **ISS-07** | **RESOLVED** | `src/optimizer/fleet_optimizer.cpp` | `optimizeForRequest` (L98, L173, L197) | **Uninitialized Explanation vehicleId**: Previously left uninitialized when assignment failed or guard blocked. | RESOLVED: `result.explanation.vehicleId` is explicitly initialized to `selectedVehicle.id` or `-1`. | Explicitly initialized across all assignment exit paths. |

---

## 21. Missing Features & Master Specification Gap Analysis

```text
Requirement                      | Status    | Implementation Location
---------------------------------------------------------------------------------------------------
Heterogeneous fleet              | Exists    | src/core/models.hpp (TWO_WHEELER, BUGGY, BUS)
Vehicle capacity                 | Exists    | src/core/models.hpp, src/validation/constraint_engine.cpp
Vehicle states                   | Exists    | src/core/models.hpp (IDLE, ASSIGNED, ON_TRIP, RETURNING, MAINTENANCE)
Dynamic ride requests            | Exists    | src/core/models.hpp, src/cli/engine_main.cpp
Ride sharing (multi-rider)       | Exists    | src/routing/route_insertion_engine.cpp
Return-trip sharing              | Exists    | src/routing/route_insertion_engine.cpp, candidate generator bonus
Route insertion                  | Exists    | src/routing/route_insertion_engine.cpp
Pickup-before-drop               | Exists    | src/validation/constraint_engine.cpp (strict precedence)
Capacity validation              | Exists    | src/validation/constraint_engine.cpp (checked at all stops)
Waiting-time cost                | Exists    | src/scoring/cost_engine.cpp
Detour cost                      | Exists    | src/scoring/cost_engine.cpp (per-rider drop time delta)
Additional distance cost         | Exists    | src/scoring/cost_engine.cpp
Vehicle activation cost          | Exists    | src/scoring/cost_engine.cpp (vehicle-type specific)
Under-utilization cost           | Exists    | src/scoring/cost_engine.cpp (derived from maxOccupancy/capacity)
Shortest path routing            | Exists    | src/graph/campus_routing.cpp (Dijkstra + tie-breaking)
Candidate vehicle generation     | Exists    | src/routing/candidate_vehicle_generator.cpp (inverted rank bug)
Fleet optimizer                  | Exists    | src/optimizer/fleet_optimizer.cpp (greedy minimum-cost)
Explainability                   | Exists    | src/optimizer/fleet_optimizer.cpp (breakdown & explanation)
JSON I/O over NDJSON             | Exists    | src/io/json_io.cpp, src/cli/engine_main.cpp
Node.js client integration       | Exists    | engineClient.js (child_process lifecycle)
Demand prediction                | Missing   | Not implemented (Future component)
Spatial-temporal demand map      | Missing   | Not implemented (Future component)
Fleet positioning / rebalancing  | Missing   | Not implemented (Future component)
Rolling / continuous horizon     | Missing   | Not implemented (Future component)
Batch request optimization       | Missing   | Not implemented (Future component, currently purely sequential)
Live rider cancellation          | Missing   | Status enum exists, no route pruning logic implemented
Live vehicle breakdown handler   | Partial   | State enum exists, no dynamic unassign & reroute logic
Continuous time / vehicle motion | Missing   | Static routing; simulation engine does not advance vehicle coords
Simulation & Operational Metrics | Partial   | test_scenarios.js exists; no C++ simulation or metrics engine
```

---

## 22. Performance Notes & Algorithmic Complexity

1. **Dijkstra Shortest Path**:
   * Single query: $O(|E| + |V| \log |V|)$.
   * With 11 nodes and 15 edges, each query executes in $< 5\,\mu\text{s}$.
   * Precomputed all-pairs lookup: $O(1)$ constant time lookup.
2. **Route Insertion**:
   * For a route of length $N$, the number of valid pickup/drop insertion pairs is:
     $$\sum_{p=0}^N (N - p + 1) = \frac{(N + 1)(N + 2)}{2} = O(N^2)$$
   * For typical campus routes ($N \le 10$), $(11 \times 12) / 2 = 66$ permutations evaluated. Validation and cost evaluation per candidate take $O(N)$ operations $\implies O(N^3)$ total insertion evaluation time per vehicle. With $N \le 10$, this runs in $< 50\,\mu\text{s}$ per vehicle.
3. **Candidate Filtering**:
   * Scanning fleet of size $M$: $O(M)$ heuristic evaluation followed by partial sort $O(M \log K)$.
   * Top $K$ vehicles evaluated (default $K = 10$). Total dispatch time per request is $< 1\,\text{ms}$.
4. **Scalability Bottlenecks**:
   * If routes grow large ($N > 30$), $O(N^3)$ insertion evaluation requires pruning or localized insertion windows.
   * If fleet grows large ($M > 500$), candidate generation will require spatial indexing (e.g. grid or KD-tree) rather than linear fleet scan.

---

## 23. Debugging Guide

| Symptom | Primary Root Causes to Inspect | Diagnostic Steps |
| :--- | :--- | :--- |
| **Routing fails / Distance = $\infty$** | 1. Node disconnected in campus graph.<br>2. Invalid node index requested ($<0$ or $\ge \text{nodeCount}$). | Run `verify_graph.js` to inspect edge connectivity. Check if origin or destination has degree 0. |
| **No vehicle assigned (`all at capacity`)** | 1. `latestPickupTime` deadline is too tight.<br>2. All vehicles full across all route segments.<br>3. `request.latestPickupTime <= request.requestTime`. | Check request timestamp vs deadline. Inspect `get_fleet_state` to see current vehicle capacities and routes. |
| **Route churn block triggered** | Stale binary running or route churn threshold ($previousCost + switchingPenalty$) exceeded. | Ensure `engine_main.exe` is freshly compiled using `npm run build:engine`. Verify `switchingPenalty` value. |
| **Bus selected over small 2-wheeler** | Inverted capacity ranking heuristic in `CandidateVehicleGenerator`. | Inspect shortlist scores in `candidate_vehicle_generator.cpp`. Check activation penalties in `weights`. |
| **JSON parsing error in engine** | 1. Missing required field in payload.<br>2. Payload passed as string instead of object.<br>3. Non-integer value in ID or location. | Check stderr logs. Compare request payload structure against schema in Section 18. |
| **Node.js process timeout (`init timed out`)** | 1. Engine crashed on startup.<br>2. Missing DLL or invalid binary path.<br>3. Malformed graph JSON in init message. | Inspect child process exit code and stderr emitted to console. Run `./engine_main.exe` manually and pipe `test_init.json`. |

---

## 24. Backend Integration Guide

### Running the Subprocess
The Node.js backend must spawn `engine_main.exe` using `child_process.spawn` with `stdio: ['pipe', 'pipe', 'pipe']`.

### Handshake Protocol
1. On spawn, Node.js sends the `init` message containing the campus graph.
2. The engine responds with `{"type": "init_ack", "status": "ok"}`.
3. Node.js must not send assignment commands until `init_ack` is received.

### Request Correlation
Every command sent to the engine should include an integer `requestId`. The engine echoes back `requestId` in its response, enabling asynchronous matching of requests and responses.

### Error Handling
If a command contains invalid syntax or illegal state:
```json
{"type": "error", "requestId": 15, "message": "Field 'request': missing required field"}
```
The Node.js client should reject the corresponding Promise.

---

## 25. Quick Lookup

* **Fleet Optimizer** $\to$ [fleet_optimizer.cpp](file:///d:/Projects/Hackathon/prep/src/optimizer/fleet_optimizer.cpp) $\to$ `FleetOptimizer::optimizeForRequest()`
* **Route Insertion** $\to$ [route_insertion_engine.cpp](file:///d:/Projects/Hackathon/prep/src/routing/route_insertion_engine.cpp) $\to$ `RouteInsertionEngine::generateCandidates()`
* **Routing Engine** $\to$ [campus_routing.cpp](file:///d:/Projects/Hackathon/prep/src/graph/campus_routing.cpp) $\to$ `RoutingEngine::distance()`, `shortestPath()`
* **Cost Engine** $\to$ [cost_engine.cpp](file:///d:/Projects/Hackathon/prep/src/scoring/cost_engine.cpp) $\to$ `CostEngine::calculateCost()`
* **Constraint Engine** $\to$ [constraint_engine.cpp](file:///d:/Projects/Hackathon/prep/src/validation/constraint_engine.cpp) $\to$ `ConstraintEngine::validate()`
* **Candidate Vehicle Generator** $\to$ [candidate_vehicle_generator.cpp](file:///d:/Projects/Hackathon/prep/src/routing/candidate_vehicle_generator.cpp) $\to$ `CandidateVehicleGenerator::shortlistVehicles()`
* **Domain Models** $\to$ [models.hpp](file:///d:/Projects/Hackathon/prep/src/core/models.hpp) $\to$ `Vehicle`, `Stop`, `RideRequest`
* **JSON Serialization** $\to$ [json_io.cpp](file:///d:/Projects/Hackathon/prep/src/io/json_io.cpp) $\to$ `vehicleFromJson()`, `rideRequestFromJson()`
* **CLI Entrypoint** $\to$ [engine_main.cpp](file:///d:/Projects/Hackathon/prep/src/cli/engine_main.cpp) $\to$ `main()`
* **Node.js Client** $\to$ [engineClient.js](file:///d:/Projects/Hackathon/prep/engineClient.js) $\to$ `EngineClient`
* **JSON Library (nlohmann/json)** $\to$ [json.hpp](file:///d:/Projects/Hackathon/prep/third_party/json.hpp) $\to$ Vendored dependency for NDJSON IPC
