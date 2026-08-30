#!/usr/bin/env node
/**
 * Real-world test scenarios for NITK campus routing engine
 * Run: node tools/test_scenarios.js
 */

const fs = require('node:fs');
const { EngineClient } = require('../engineClient');
const path = require('node:path');

const graph = JSON.parse(fs.readFileSync('./tools/campus_graph_nitk.json'));

// Scenario configurations: realistic campus ride requests
const SCENARIOS = [
  {
    name: 'Early Morning — Beach to Main Building',
    description: 'Student walking from NITK Beach to attend class at Main Building',
    vehicles: [
      { id: 1, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
      { id: 2, type: 'BUGGY', capacity: 3, currentLocation: 3, state: 'IDLE', route: [], currentRiders: [] },
    ],
    requests: [
      { id: 1, pickupLocation: 0, dropLocation: 10, requestTime: 0, latestPickupTime: 600000, status: 'WAITING', riderId: 101 },
    ],
  },
  {
    name: 'Inter-Hostel Shuttle',
    description: 'Multiple students from Girls Hostel to Library for study session',
    vehicles: [
      { id: 3, type: 'BUGGY', capacity: 3, currentLocation: 4, state: 'IDLE', route: [], currentRiders: [] },
      { id: 4, type: 'BUS', capacity: 10, currentLocation: 6, state: 'IDLE', route: [], currentRiders: [] },
    ],
    requests: [
      { id: 2, pickupLocation: 4, dropLocation: 9, requestTime: 0, latestPickupTime: 600000, status: 'WAITING', riderId: 201 },
      { id: 3, pickupLocation: 4, dropLocation: 9, requestTime: 1000, latestPickupTime: 600000, status: 'WAITING', riderId: 202 },
      { id: 4, pickupLocation: 4, dropLocation: 9, requestTime: 2000, latestPickupTime: 600000, status: 'WAITING', riderId: 203 },
    ],
  },
  {
    name: 'Guest House to Dining Loop',
    description: 'Evening meal transport from Guest House through campus',
    vehicles: [
      { id: 5, type: 'BUGGY', capacity: 3, currentLocation: 3, state: 'IDLE', route: [], currentRiders: [] },
      { id: 6, type: 'TWO_WHEELER', capacity: 1, currentLocation: 1, state: 'IDLE', route: [], currentRiders: [] },
    ],
    requests: [
      { id: 5, pickupLocation: 3, dropLocation: 6, requestTime: 0, latestPickupTime: 600000, status: 'WAITING', riderId: 301 },
      { id: 6, pickupLocation: 1, dropLocation: 8, requestTime: 500, latestPickupTime: 600000, status: 'WAITING', riderId: 302 },
    ],
  },
  {
    name: 'Adke Circle Multi-Stop Route',
    description: 'Complex route connecting hostel cluster via Adke Circle',
    vehicles: [
      { id: 7, type: 'BUS', capacity: 10, currentLocation: 6, state: 'IDLE', route: [], currentRiders: [] },
    ],
    requests: [
      { id: 7, pickupLocation: 6, dropLocation: 7, requestTime: 0, latestPickupTime: 600000, status: 'WAITING', riderId: 401 },
      { id: 8, pickupLocation: 7, dropLocation: 9, requestTime: 500, latestPickupTime: 600000, status: 'WAITING', riderId: 402 },
      { id: 9, pickupLocation: 9, dropLocation: 8, requestTime: 1000, latestPickupTime: 600000, status: 'WAITING', riderId: 403 },
    ],
  },
];

// Node ID to name mapping for readable output
function nodeName(id) {
  const node = graph.nodes.find((n) => n.id === id);
  return node ? node.name : `Node ${id}`;
}

async function runScenario(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SCENARIO: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`Vehicles: ${scenario.vehicles.length}, Requests: ${scenario.requests.length}`);
  console.log('');

  const binaryPath = path.join(__dirname, '..', 'engine_main.exe');
  const client = new EngineClient(binaryPath, graph, {
    initTimeoutMs: 5000,
    requestTimeoutMs: 3000,
  });

  try {
    await client.ready;
    console.log('[✓] Engine initialized\n');

    // Add vehicles
    console.log('--- FLEET SETUP ---');
    for (const vehicle of scenario.vehicles) {
      await client.addVehicle(vehicle);
      console.log(
        `  [${vehicle.id}] ${vehicle.type.padEnd(12)} capacity=${vehicle.capacity} location=${nodeName(vehicle.currentLocation)}`,
      );
    }

    // Process requests
    console.log('\n--- REQUEST PROCESSING ---\n');
    const results = [];

    for (const request of scenario.requests) {
      console.log(
        `Request R${request.id}: ${nodeName(request.pickupLocation)} → ${nodeName(request.dropLocation)}`,
      );

      const result = await client.assignRequest(request);

      if (result && result.assigned) {
        const breakdown = result.explanation.breakdown || {};
        results.push({
          requestId: request.id,
          assigned: true,
          vehicleId: result.vehicleId,
          cost: breakdown.total,
        });

        console.log(`  ✓ Assigned to vehicle ${result.vehicleId}`);
        console.log(`    Distance added: ${breakdown.addDistance?.toFixed(0)}m`);
        console.log(`    Travel time: ${breakdown.travelTime?.toFixed(2)}min`);
        console.log(`    Total cost: ${breakdown.total?.toFixed(2)}`);
      } else {
        const reason =
          result && result.explanation && result.explanation.reason
            ? result.explanation.reason
            : 'No feasible vehicle available';
        results.push({
          requestId: request.id,
          assigned: false,
          reason: reason,
        });

        console.log(`  ✗ NOT ASSIGNED: ${reason}`);
      }
      console.log('');
    }

    // Summary
    console.log('--- SCENARIO SUMMARY ---');
    const assigned = results.filter((r) => r.assigned).length;
    const total = results.length;
    console.log(`Requests assigned: ${assigned}/${total}`);
    if (assigned > 0) {
      const avgCost = results.filter((r) => r.assigned).reduce((sum, r) => sum + r.cost, 0) / assigned;
      console.log(`Average assignment cost: ${avgCost.toFixed(2)}`);
    }

    await client.shutdown();
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    try {
      await client.shutdown();
    } catch (e) {
      // Ignore shutdown errors
    }
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    NITK CAMPUS ROUTING ENGINE — TEST SCENARIOS                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝');
  console.log(`\nGraph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
  console.log(`Scenarios: ${SCENARIOS.length}\n`);

  for (const scenario of SCENARIOS) {
    await runScenario(scenario);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('All scenarios completed.');
  console.log('='.repeat(80) + '\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
