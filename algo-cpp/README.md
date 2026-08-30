# Campus Shared-Mobility Routing Engine

This project is a C++17 campus mobility routing and assignment engine built around a route-insertion approach rather than a one-to-one matching model. The goal is to model a small campus transportation system in which vehicles, riders, stops, and route feasibility are represented explicitly, allowing the system to evaluate whether a new ride can be inserted into a vehicle route, assign a ride to the best feasible vehicle, and score that decision using weighted cost objectives.

The codebase is deliberately organized into a few conceptual layers:

- Core domain models
- Campus graph and shortest-path routing
- Feasibility validation
- Cost scoring for candidate insertions
- Route insertion generation
- Candidate vehicle shortlisting
- Fleet-wide routing assignments
- Test harnesses that exercise each stage

The architecture is intentionally modular. Each component has a narrow responsibility and is independent enough to be tested and reasoned about in isolation.

---

## 1. Project structure

The project is now organized into a clean layout:

```text
prep/
├── README.md
├── src/
│   ├── core/
│   │   ├── models.hpp
│   │   └── models.cpp
│   ├── graph/
│   │   ├── campus_routing.hpp
│   │   └── campus_routing.cpp
│   ├── validation/
│   │   ├── constraint_engine.hpp
│   │   └── constraint_engine.cpp
│   ├── scoring/
│   │   ├── cost_engine.hpp
│   │   └── cost_engine.cpp
│   ├── routing/
│   │   ├── route_insertion_engine.hpp
│   │   ├── route_insertion_engine.cpp
│   │   ├── candidate_vehicle_generator.hpp
│   │   └── candidate_vehicle_generator.cpp
│   └── optimizer/
│       ├── fleet_optimizer.hpp
│       └── fleet_optimizer.cpp
├── tests/
│   ├── constraint_engine_tests.cpp
│   ├── cost_engine_tests.cpp
│   ├── route_insertion_engine_tests.cpp
│   ├── candidate_vehicle_generator_tests.cpp
│   └── fleet_optimizer_tests.cpp
├── tools/
│   └── debug_fleet.cpp
└── build artifacts removed
```

### NITK campus node map

The campus graph is now named using the NITK locations you specified:

- NITK Beach
- LHC-C
- LHC-D
- Guest House
- Girls Hostel
- Girls Co-Op
- Adke Circle
- Karavali Hostel
- Mega Towers
- Library

The route network is modeled as a connected campus backbone with shortcut links:

```text
NITK Beach -- LHC-C -- LHC-D -- Guest House -- Girls Hostel -- Girls Co-Op -- Adke Circle -- Karavali Hostel -- Mega Towers -- Library
      \____________________________|___________________________/
                  shortcut corridor between LHC-C and Adke Circle
```

The graph uses undirected edges between the nodes above, with additional cross-links such as Beach-to-Adke Circle, LHC-C-to-Karavali Hostel, LHC-D-to-Adke Circle, Guest House-to-Library, and Girls Hostel-to-Mega Towers to reflect shorter campus movement paths.


Important design intent:

- src/ contains the actual production code.
- tests/ contains executable test programs that check correctness.
- tools/ contains debugging or exploration utilities.

---

## 2. Core domain model: models.hpp / models.cpp

The foundational data structures live in the models layer.

### 2.1 Enums

The engine models several domain enums:

- VehicleType
  - TWO_WHEELER
  - BUGGY
  - BUS
  - CAR (compatibility alias retained for legacy payloads)

- VehicleState
  - IDLE
  - ASSIGNED
  - ON_TRIP
  - RETURNING
  - MAINTENANCE

- RequestStatus
  - WAITING
  - ASSIGNED
  - PICKED_UP
  - COMPLETED
  - CANCELLED

These enums provide the baseline vocabulary for expressing the operational state of vehicles and ride requests.

### 2.2 Stop

The Stop structure is a route event representing an action at a location:

```cpp
struct Stop
{
    enum class Type { PICKUP, DROP };

    int location;
    int riderId;
    Type type;
};
```

A route is a sequence of these events. The engine is route-oriented rather than rider-oriented. Each rider in a route is represented by a pair of stop events:

- PICKUP stop at pickup location
- DROP stop at drop location

The route is intentionally a list of actions, not a list of rider objects. That makes insertion operations easier to work with because they are simply “insert these two stops at positions in the route.”

### 2.3 RideRequest

A ride request contains the ride identity and the origin/destination pair:

```cpp
struct RideRequest
{
    int id;
    int pickupLocation;
    int dropLocation;
    long long requestTime;
    long long latestPickupTime;
    RequestStatus status;
};
```

This is not a multi-rider grouping object; it models one passenger request and is the unit that is inserted into routes.

### 2.4 Vehicle

A vehicle contains the operational details that matter for routing decisions:

```cpp
struct Vehicle
{
    int id;
    VehicleType type;
    int capacity;
    int currentLocation;
    VehicleState state;
    std::vector<Stop> route;
    std::vector<int> currentRiders;
};
```

This is the central runtime object used by the fleet optimizer. It carries:

- what vehicle it is
- how many passengers it can carry
- where it is now
- whether it is idle, assigned, returning, etc.
- what route it is currently following
- which riders are currently onboard

### 2.5 Passenger count helper

A key helper is the passenger-count function used for tracking route occupancy as the route evolves. It calculates a running count through the route:

- PICKUP => +1
- DROP => -1

This is important for ensuring no partially evaluated route exceeds vehicle capacity at any prefix.

The helper is included in the model layer because it is a pure structural function used by the validation and scoring layers logic rather than as a routing optimization feature.

### 2.6 Debug route text output

The Vehicle class includes a helper that prints the route in a readable text form. This makes route debugging easier when you are checking a candidate insertion or a validation failure.

---

## 3. Campus graph and shortest-path layer: campus_routing.hpp / campus_routing.cpp

This layer introduces the graph used to model the campus and to answer shortest-path questions.

### 3.1 CampusGraph

The graph is a simple adjacency-list graph:

```cpp
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
};
```

This represents:

- nodes = locations on campus
- edges = travel links between locations
- each edge stores both physical distance and travel time

Methods include:

- addNode(name)
- addEdge(from, to, distance, travelTime, directed=false)
- nodeCount()
- nodeName(index)
- setNodeName(index, name)

This graph is independent of vehicles and riders. It is a pure map of location topology.

### 3.2 RoutingEngine

The RoutingEngine wraps the graph and answers shortest-path-type questions.

It exposes:

- distance(source, destination)
- travelTime(source, destination)
- shortestPath(source, destination)

It uses Dijkstra’s algorithm internally. The implementation is adapted to track both travel time and distance separately, which is necessary because the cost objective uses both of those dimensions.

### 3.3 Precomputation behavior

There is a configurable precomputation switch for all-pairs shortest paths.

- If the graph is small enough (< 200 nodes), the engine can precompute all-source shortest paths at startup.
- If not, it computes shortest paths on demand per query.

This keeps the engine efficient without forcing a whole graph to be precomputed when it is not worth it.

### 3.4 Why the graph is separated from the assignment logic

This engine is intentionally not vehicle-aware. It answers infrastructure questions like:

- what is the shortest time from point A to point B?
- what is the shortest distance path?
- which route nodes are traversed?

That makes it reusable independently of how vehicles are assigned.

---

## 4. Feasibility validation: constraint_engine.hpp / constraint_engine.cpp

The ConstraintEngine is a pure validation module. It does not optimize, select, or decide the best route. It only answers the question:

> “Is this candidate route feasible for this vehicle under the hard constraints?”

### 4.1 ValidationResult

```cpp
struct ValidationResult
{
    bool feasible;
    std::string reason;
};
```

The reason is explicit so failures are explainable. This is far better than returning only a boolean because debugging route insertion problems is much easier when you know exactly why a candidate was rejected.

### 4.2 Hard checks performed

The validation engine checks all of the following:

1. Capacity feasibility on every route prefix
   - the running passenger count must never exceed vehicle.capacity

2. Pickup before drop ordering for every rider
   - a rider cannot drop before pickup

3. Duplicate stop integrity
   - no rider may have two pickup events
   - no rider may have two drop events

4. Valid route locations
   - every location used in the route must exist in the campus graph

5. Vehicle maintenance state
   - a vehicle in MAINTENANCE is not eligible for a route

This is a strict feasibility gate. A route that fails any of these checks is rejected before cost scoring or assignment decisions are made.

### 4.3 Why validation is separate

Validation is intentionally separated from scoring. The system first answers “is this feasible?” and only then runs cost evaluation. This improves clarity and keeps the logic modular.

---

## 5. Cost scoring: cost_engine.hpp / cost_engine.cpp

The CostEngine scores an insertion after it has already been validated as feasible. It is purely about quantifying a route change.

### 5.1 Weights configuration

The objective function is:

$$
C = w_w W + w_t T + w_d D + w_r R + w_v V + w_u U
$$

Where:

- W = waiting time impact
- T = total travel time of the new route
- D = additional distance due to insertion
- R = detour added to existing riders
- V = vehicle activation penalty
- U = under-utilization penalty

The weights are stored in a config struct:

```cpp
struct Weights
{
    double waiting;
    double travelTime;
    double distance;
    double detour;
    double vehiclePenalty;
    double underUtilization;
    double busActivationPenalty;
    double carActivationPenalty;
    double twoWheelerActivationPenalty;
};
```

This is a data-driven cost model. The project does not hard-code the objective values inside the scoring logic. There are configuration fields that can be changed by creating a Weights object or reading them from a config file.

### 5.2 CostBreakdown

```cpp
struct CostBreakdown
{
    double waiting;
    double travelTime;
    double addDistance;
    double detour;
    double vehiclePenalty;
    double underUtil;
    double total;
};
```

This is the structured cost explanation for a route insertion.

### 5.3 What the cost engine measures

The cost engine calculates:

- waiting time for the incoming rider
- route travel time after insertion
- distance increase relative to the previous route
- detour of already-scheduled riders
- vehicle activation penalty when a vehicle is waking up from IDLE
- under-utilization penalty based on occupancy relative to capacity

This is a baseline objective, not a full optimization engine. It is intended to produce a scalar score for comparison between candidate injections.

### 5.4 Why this layer matters

Without a cost model, the system would only know whether a route is legal, not whether a route is good. The cost engine gives the optimizer a ranking mechanism so it can compare candidate insertions across vehicles and decide which option is most attractive.

---

## 6. Route insertion generation: route_insertion_engine.hpp / route_insertion_engine.cpp

This is the “generate all feasible insertions” layer. It is the heart of the route-sharing algorithm.

### 6.1 CandidateRoute structure

```cpp
struct CandidateRoute
{
    std::vector<Stop> route;
    CostBreakdown cost;
};
```

Each candidate is a route variant plus its cost breakdown. The engine does not just return the cheapest route; it returns the full set of feasible insertions for a ride into a vehicle’s route.

### 6.2 Insertion search strategy

For a given vehicle and request, the engine loops over all valid insertion positions:

- pickupPos from 0 to route.size()
- dropPos from pickupPos to route.size()

It inserts:

- a PICKUP stop for the new rider at pickupPos
- a DROP stop for the new rider at dropPos

Then it validates the resulting route. If the route is feasible, it computes the cost and stores the candidate.

The result is a sorted list of candidate routes by total cost, ascending.

This is a critical difference from a bipartite matching approach. This engine is route-centric. A single vehicle can serve multiple riders over time, and the route is allowed to evolve through insertions rather than being reduced to a 1-to-1 rider assignment problem.

### 6.3 Edge cases supported

The engine explicitly supports:

- empty route / idle vehicle
- returning vehicle with an ongoing route
- insertion of a new rider into a non-empty route while keeping route legality intact

This is important because the campus fleet is not just a collection of empty vehicles. Vehicles often have ongoing obligations and scheduled return trips.

---

## 7. Candidate vehicle filtering: candidate_vehicle_generator.hpp / candidate_vehicle_generator.cpp

This is the cheap pre-filtering stage. It is designed to shortlist which vehicles are worth running through the full insertion engine without checking the whole fleet for every request.

### 7.1 Purpose

The full fleet may be large. Running the expensive insertion search across every vehicle for every request is wasted work. The candidate generator narrows that selection to a smaller list of potentially useful vehicles.

The shortlist logic follows these heuristics in order:

1. Exclude vehicles in MAINTENANCE
2. Exclude vehicles already at full capacity for their remaining route
3. Rank by distance from the vehicle’s current position or next stop to the request pickup location
4. Prefer vehicles whose current route direction is compatible with the request pickup/drop pattern
5. Prefer smaller idle vehicles before larger ones, without excluding buses outright

### 7.2 Why this matters

This module reduces the search space before the expensive insertion logic runs. It is a heuristic shortlist, not a final decision.

The point is to preserve a reasonable amount of fleet-wide efficiency without doing full route-generation work on every vehicle.

---

## 8. Fleet optimizer: fleet_optimizer.hpp / fleet_optimizer.cpp

This module is the top-level assignment loop and is the baseline algorithm described as “Greedy Minimum-Cost Insertion.”

### 8.1 High-level workflow

For a single incoming RideRequest, the optimizer performs the following steps:

1. Generate the shortlisted vehicles
2. For each candidate vehicle:
   - generate feasible insertions
   - take the cheapest feasible insertion for that vehicle
3. Compare all per-vehicle cheapest insertions
4. Select the globally cheapest feasible candidate
5. Update the vehicle route and mark the request as ASSIGNED
6. If no vehicle can accept the ride, keep the request WAITING and explain the reason

This is a greedy algorithm because it makes locally best decisions in the current request context, without trying to solve a global fleet-wide optimization problem in a single step.

### 8.2 Re-optimization guard

The optimizer includes a safety mechanism to avoid route churn:

> before overwriting an existing vehicle route with a better one for an already-assigned rider, only apply it if newCost + switchingPenalty < currentCost

This prevents a vehicle’s route from being repeatedly rewritten just to chase a marginally better insertion.

This is essential in real fleet systems because route churn creates operational instability, poor predictability, and unnecessary dispatcher effort.

### 8.3 Explanation output

The assignment result stores an explanation block with:

- vehicle id
- cost total
- vehicle state before assignment
- detailed reason string
- cost breakdown

This makes the assignment explainable, which is valuable both for debugging and for operator trust.

---

## 9. Test programs

The tests are deliberately simple, assert-based C++ programs without a heavy framework. They are designed to validate each stage in isolation and to confirm the system behaves correctly under realistic scenarios.

### 9.1 constraint_engine_tests.cpp

Covers:

- capacity exceeded
- drop-before-pickup ordering
- duplicate stop validation
- valid route acceptance

### 9.2 cost_engine_tests.cpp

Covers:

- the cost objective producing sensible non-negative output
- activation penalty logic
- cost scoring over a basic insertion scenario

### 9.3 route_insertion_engine_tests.cpp

Covers:

- return-trip sharing scenario
- insertion generation after an existing rider’s drop stop
- route validity and ordering when building candidate insertions

### 9.4 candidate_vehicle_generator_tests.cpp

Covers:

- maintenance exclusion
- smaller idle vehicle preference
- route direction compatibility heuristics
- shortlist size limit

### 9.5 fleet_optimizer_tests.cpp

Covers the integrated fleet-level assignment behavior:

- multiple requests assigned to small vehicles first
- avoidance of buses as the default choice for smaller requests
- reuse of a returning vehicle when it is the better candidate

---

## 10. Build and test commands

Because the project is small and modular, it can be built and tested directly with g++.

The commands below are provided in both Windows PowerShell and Ubuntu WSL formats.

### 10.1 Windows PowerShell: separate engine and fleet test commands

Build and run the constraint engine test:

```powershell
cd "d:\Projects\Hackathon\prep"

g++ -std=c++17 -I. -Isrc tests/constraint_engine_tests.cpp `
    src/core/models.cpp `
    src/graph/campus_routing.cpp `
    src/validation/constraint_engine.cpp `
    -o constraint_engine_tests.exe

.\constraint_engine_tests.exe
```

Build and run the fleet optimizer test:

```powershell
cd "d:\Projects\Hackathon\prep"

g++ -std=c++17 -I. -Isrc tests/fleet_optimizer_tests.cpp `
    src/core/models.cpp `
    src/graph/campus_routing.cpp `
    src/validation/constraint_engine.cpp `
    src/scoring/cost_engine.cpp `
    src/routing/route_insertion_engine.cpp `
    src/routing/candidate_vehicle_generator.cpp `
    src/optimizer/fleet_optimizer.cpp `
    -o fleet_optimizer_tests.exe

.\fleet_optimizer_tests.exe
```

Build the Node.js child-process engine executable:

```powershell
cd "d:\Projects\Hackathon\prep"

g++ -std=c++17 -I. -Isrc src/cli/engine_main.cpp `
    src/core/models.cpp `
    src/graph/campus_routing.cpp `
    src/validation/constraint_engine.cpp `
    src/scoring/cost_engine.cpp `
    src/routing/route_insertion_engine.cpp `
    src/routing/candidate_vehicle_generator.cpp `
    src/optimizer/fleet_optimizer.cpp `
    src/io/json_io.cpp `
    -o engine_main.exe
```

### 10.2 Windows PowerShell: all tests in one single command

```powershell
cd "d:\Projects\Hackathon\prep"

g++ -std=c++17 -I. -Isrc tests/candidate_vehicle_generator_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/routing/candidate_vehicle_generator.cpp -o candidate_vehicle_generator_tests.exe
g++ -std=c++17 -I. -Isrc tests/route_insertion_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp src/routing/route_insertion_engine.cpp -o route_insertion_engine_tests.exe
g++ -std=c++17 -I. -Isrc tests/cost_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/scoring/cost_engine.cpp -o cost_engine_tests.exe
g++ -std=c++17 -I. -Isrc tests/fleet_optimizer_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp src/routing/route_insertion_engine.cpp src/routing/candidate_vehicle_generator.cpp src/optimizer/fleet_optimizer.cpp -o fleet_optimizer_tests.exe

.\candidate_vehicle_generator_tests.exe
.\route_insertion_engine_tests.exe
.\cost_engine_tests.exe
.\fleet_optimizer_tests.exe
```

### 10.3 Ubuntu WSL: separate engine and fleet test commands

Build and run the constraint engine test:

```bash
cd /mnt/d/Projects/Hackathon/prep

g++ -std=c++17 -I. -Isrc tests/constraint_engine_tests.cpp \
    src/core/models.cpp \
    src/graph/campus_routing.cpp \
    src/validation/constraint_engine.cpp \
    -o constraint_engine_tests

./constraint_engine_tests
```

Build and run the fleet optimizer test:

```bash
cd /mnt/d/Projects/Hackathon/prep

g++ -std=c++17 -I. -Isrc tests/fleet_optimizer_tests.cpp \
    src/core/models.cpp \
    src/graph/campus_routing.cpp \
    src/validation/constraint_engine.cpp \
    src/scoring/cost_engine.cpp \
    src/routing/route_insertion_engine.cpp \
    src/routing/candidate_vehicle_generator.cpp \
    src/optimizer/fleet_optimizer.cpp \
    -o fleet_optimizer_tests

./fleet_optimizer_tests
```

Build the Node.js child-process engine executable:

```bash
cd /mnt/d/Projects/Hackathon/prep

g++ -std=c++17 -I. -Isrc src/cli/engine_main.cpp \
    src/core/models.cpp \
    src/graph/campus_routing.cpp \
    src/validation/constraint_engine.cpp \
    src/scoring/cost_engine.cpp \
    src/routing/route_insertion_engine.cpp \
    src/routing/candidate_vehicle_generator.cpp \
    src/optimizer/fleet_optimizer.cpp \
    src/io/json_io.cpp \
    -o engine_main
```

### 10.4 Ubuntu WSL: all tests in one single command

```bash
cd /mnt/d/Projects/Hackathon/prep

g++ -std=c++17 -I. -Isrc tests/candidate_vehicle_generator_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/routing/candidate_vehicle_generator.cpp -o candidate_vehicle_generator_tests
g++ -std=c++17 -I. -Isrc tests/route_insertion_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp src/routing/route_insertion_engine.cpp -o route_insertion_engine_tests
g++ -std=c++17 -I. -Isrc tests/cost_engine_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/scoring/cost_engine.cpp -o cost_engine_tests
g++ -std=c++17 -I. -Isrc tests/fleet_optimizer_tests.cpp src/core/models.cpp src/graph/campus_routing.cpp src/validation/constraint_engine.cpp src/scoring/cost_engine.cpp src/routing/route_insertion_engine.cpp src/routing/candidate_vehicle_generator.cpp src/optimizer/fleet_optimizer.cpp -o fleet_optimizer_tests

./candidate_vehicle_generator_tests
./route_insertion_engine_tests
./cost_engine_tests
./fleet_optimizer_tests
```

---


## 11. Design philosophy behind the code

This project is intentionally written as a set of focused modules rather than one giant file.

The guiding principles are:

- separate state from behavior
- separate graph logic from fleet logic
- separate validation from scoring
- separate shortlist generation from final assignment
- keep each unit testable in isolation

This keeps the project understandable and avoids mixing route planning, feasibility validation, scoring, and assignment logic into one monolithic system.

---

## 12. Important conceptual model

The engine operates in the following order:

1. campus map exists
2. vehicle and request data are represented
3. a route is evaluated for feasibility
4. a feasible route is scored
5. a small set of candidate vehicles is shortlisted
6. a final best insertion is chosen greedily
7. the route is applied to the vehicle
8. the request status is updated

This layered model is critical. It ensures that the system does not confuse hard feasibility constraints with soft optimization preferences.

---

## 13. What the engine does and does not do

### Does

- model vehicle routes as ordered stop lists
- verify route legality under capacity and ordering rules
- score candidate route insertions using weighted objective terms
- short-list vehicles before full insertion search
- greedily assign a ride to the cheapest feasible vehicle
- support idle, assigned, returning, and maintenance states

### Does not

- perform global fleet re-optimization for all requests at once
- solve a full multi-request combinatorial optimization problem in a single pass
- pretend that a single route is the final best answer across several vehicles without comparison
- include any unsupported assumptions about market or traffic dynamics beyond the model inputs

This is intentionally a baseline engine, not a fully production-grade dispatch solver. It is designed to be understandable, modular, and extendable.

---

## 14. Practical notes for extension

If you want to expand this project later, the cleanest extension points are:

- add explicit zone metadata to nodes to support more realistic route compatibility checks
- add a configuration file reader for Weights and simulation parameters
- add a fleet simulation loop to process many requests over time
- add explicit route mutation helpers for rescheduling and reoptimization
- add a richer explanation format for dispatch decisions and rider-level impact

The current code is a strong baseline because each layer can be replaced or extended without forcing a rewrite of the entire engine.

---

## 15. Final note

The codebase is deliberately simple but structured. It prioritizes correctness, explicitness, and an understandable flow over hiding logic inside magical abstractions. Each important concern has a named component and a clear place in the system.

If you read through the code in order — models → graph → validation → cost → insertion → candidate generation → fleet optimizer → tests — you should have a strong mental model of how the campus ride-sharing engine works as a coherent system.
