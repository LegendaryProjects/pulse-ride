#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { EngineClient } = require('../engineClient');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const builtInGraph = {
  nodes: [
    { id: 0, name: 'NITK Beach' },
    { id: 1, name: 'LHC-C' },
    { id: 2, name: 'LHC-D' },
    { id: 3, name: 'Guest House' },
    { id: 4, name: 'Girls Hostel' },
    { id: 5, name: 'Girls Co-Op' },
    { id: 6, name: 'Adke Circle' },
    { id: 7, name: 'Karavali Hostel' },
    { id: 8, name: 'Mega Towers' },
    { id: 9, name: 'Library' },
  ],
  edges: [
    { from: 0, to: 1, distance: 120, travelTime: 10, directed: false },
    { from: 1, to: 2, distance: 80, travelTime: 6, directed: false },
    { from: 2, to: 3, distance: 90, travelTime: 7, directed: false },
    { from: 3, to: 4, distance: 95, travelTime: 7, directed: false },
    { from: 4, to: 5, distance: 80, travelTime: 6, directed: false },
    { from: 5, to: 6, distance: 90, travelTime: 7, directed: false },
    { from: 6, to: 7, distance: 100, travelTime: 8, directed: false },
    { from: 7, to: 8, distance: 120, travelTime: 9, directed: false },
    { from: 8, to: 9, distance: 110, travelTime: 8, directed: false },
    { from: 0, to: 6, distance: 180, travelTime: 15, directed: false },
    { from: 1, to: 7, distance: 170, travelTime: 14, directed: false },
    { from: 3, to: 9, distance: 210, travelTime: 17, directed: false },
    { from: 4, to: 8, distance: 150, travelTime: 12, directed: false },
    { from: 2, to: 6, distance: 150, travelTime: 12, directed: false },
    { from: 2, to: 8, distance: 160, travelTime: 13, directed: false },
  ],
};

const stateNames = ['IDLE', 'ASSIGNED', 'ON_TRIP', 'RETURNING', 'MAINTENANCE'];
const vehicleTypes = ['TWO_WHEELER', 'BUGGY', 'BUS'];

function printTitle() {
  console.log('\n=== Campus Mobility Engine — Interactive Tester ===\n');
}

function printError(message) {
  console.log(`\nERROR: ${message}\n`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveBinaryPath() {
  const candidates = process.platform === 'win32'
    ? ['engine_main.exe', 'engine_main']
    : ['engine_main', 'engine_main.exe'];

  for (const candidate of candidates) {
    const full = path.resolve(__dirname, '..', candidate);
    if (fs.existsSync(full)) {
      return full;
    }
  }

  return null;
}

function nodeNameByIndex(graph, index) {
  const node = graph.nodes.find((entry) => entry.id === index);
  return node ? node.name : `Unknown(${index})`;
}

async function question(prompt) {
  if (rl.closed) {
    return '';
  }

  return new Promise((resolve) => {
    try {
      rl.question(prompt, (answer) => resolve(String(answer ?? '').trim()));
    } catch (error) {
      if (String(error.message || error).includes('readline was closed')) {
        resolve('');
        return;
      }
      throw error;
    }
  });
}

async function chooseGraph() {
  while (true) {
    const choice = await question('Choose campus graph:\n1) Use built-in NITK demo graph\n2) Load graph from a JSON file path\n> ');

    if (choice === '1') {
      return builtInGraph;
    }

    if (choice === '2') {
      const filePath = await question('Enter JSON file path: ');
      if (!filePath) {
        printError('A file path is required.');
        continue;
      }

      const absolutePath = path.resolve(filePath);
      if (!fs.existsSync(absolutePath)) {
        printError(`File not found: ${absolutePath}`);
        continue;
      }

      try {
        const raw = fs.readFileSync(absolutePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
          throw new Error('Graph JSON must contain a top-level "nodes" array and "edges" array.');
        }
        return parsed;
      } catch (error) {
        printError(`Could not read graph file: ${error.message}`);
      }
    }

    printError('Please choose 1 or 2.');
  }
}

async function startEngine(graph) {
  const binaryPath = resolveBinaryPath();
  if (!binaryPath) {
    console.log('Engine binary not found. run npm run build:engine first');
    process.exit(1);
  }

  console.log('Starting engine...');
  const client = new EngineClient(binaryPath, graph, {
    initTimeoutMs: 5000,
    requestTimeoutMs: 3000,
    gracefulShutdownMs: 1500,
  });

  client.on('crash', ({ code, signal }) => {
    console.log(`\nEngine crash detected: code=${code ?? 'n/a'} signal=${signal ?? 'n/a'}\n`);
  });

  try {
    await client.ready;
    console.log('Engine ready.');
    return client;
  } catch (error) {
    console.log(`\nInit failed: ${error.message}\n`);
    await client.shutdown().catch(() => {});
    process.exit(1);
  }
}

function printNodeList(graph) {
  console.log('\nCampus graph nodes:');
  for (const node of graph.nodes) {
    console.log(`  [${node.id}] ${node.name}`);
  }
  console.log('');
}

function formatRoute(route, graph) {
  if (!route || route.length === 0) {
    return '[]';
  }

  return route
    .map((stop) => `${stop.type === 'PICKUP' ? 'PICKUP' : 'DROP'} r${stop.riderId}@${nodeNameByIndex(graph, stop.location)}`)
    .join(' -> ');
}

function printFleetTable(fleet, graph) {
  if (!fleet || fleet.length === 0) {
    console.log('No vehicles in the fleet.');
    return;
  }

  console.log('Current fleet:');
  fleet.forEach((vehicle, index) => {
    console.log(`\n[${index}] Vehicle ${vehicle.id}`);
    console.log(`  Type:       ${vehicle.type}`);
    console.log(`  Capacity:   ${vehicle.capacity}`);
    console.log(`  State:      ${vehicle.state}`);
    console.log(`  Location:   ${nodeNameByIndex(graph, vehicle.currentLocation)}`);
    console.log(`  Route:      ${formatRoute(vehicle.route, graph)}`);
    console.log(`  Riders:     ${vehicle.currentRiders && vehicle.currentRiders.length ? vehicle.currentRiders.join(', ') : '[]'}`);
  });
  console.log('');
}

async function promptVehicleType() {
  while (true) {
    const answer = await question('Vehicle type\n1) TWO_WHEELER\n2) BUGGY\n3) BUS\n> ');
    const map = { '1': 'TWO_WHEELER', '2': 'BUGGY', '3': 'BUS' };
    if (map[answer]) {
      return map[answer];
    }
    printError('Choose a valid vehicle type (1, 2, or 3).');
  }
}

async function promptState() {
  while (true) {
    console.log('Vehicle states:');
    stateNames.forEach((state, index) => console.log(`  ${index + 1}) ${state}`));
    const answer = await question('> ');
    const index = Number(answer) - 1;
    if (stateNames[index]) {
      return stateNames[index];
    }
    printError('Choose a valid state number.');
  }
}

async function promptNodeChoice(graph, label = 'Choose a node') {
  printNodeList(graph);
  while (true) {
    const answer = await question(`${label} (node index)\n> `);
    const index = Number(answer);
    if (Number.isInteger(index) && index >= 0 && index < graph.nodes.length) {
      return index;
    }
    printError(`Choose a valid node index from 0 to ${graph.nodes.length - 1}.`);
  }
}

async function addVehiclePrompt(engineClient, graph) {
  const type = await promptVehicleType();
  const capacityInput = await question('Capacity: ');
  const capacity = Number(capacityInput);
  const location = await promptNodeChoice(graph, 'Choose current location');
  const state = await promptState();

  const newVehicle = {
    id: Date.now() % 100000,
    type,
    capacity,
    currentLocation: location,
    state,
    route: [],
    currentRiders: [],
  };

  await engineClient.addVehicle(newVehicle);
  console.log(`Vehicle ${newVehicle.id} added successfully.`);
}

async function removeVehiclePrompt(engineClient, graph) {
  const fleet = await engineClient.getFleetState();
  if (!fleet.length) {
    console.log('No vehicles in the fleet.');
    return;
  }

  printFleetTable(fleet, graph);
  const choice = await question('Choose vehicle index to remove: ');
  const index = Number(choice);
  if (!Number.isInteger(index) || index < 0 || index >= fleet.length) {
    printError('Invalid vehicle selection.');
    return;
  }

  const targetVehicle = fleet[index];
  await engineClient.removeVehicle(targetVehicle.id);
  console.log(`Vehicle ${targetVehicle.id} removed.`);
}

async function changeVehicleStatePrompt(engineClient, graph) {
  const fleet = await engineClient.getFleetState();
  if (!fleet.length) {
    console.log('No vehicles in the fleet.');
    return;
  }

  printFleetTable(fleet, graph);
  const choice = await question('Choose vehicle index to update: ');
  const index = Number(choice);
  if (!Number.isInteger(index) || index < 0 || index >= fleet.length) {
    printError('Invalid vehicle selection.');
    return;
  }

  const targetVehicle = fleet[index];
  const newState = await promptState();
  await engineClient.setVehicleState(targetVehicle.id, newState);
  console.log(`Vehicle ${targetVehicle.id} state changed to ${newState}.`);
}

async function submitRideRequestPrompt(engineClient, graph) {
  const pickupLocation = await promptNodeChoice(graph, 'Choose pickup location');
  const dropLocation = await promptNodeChoice(graph, 'Choose drop location');
  const riderInput = await question('Rider ID (leave blank for auto): ');
  const riderId = riderInput ? Number(riderInput) : Math.floor(Date.now() % 100000);
  const latestInput = await question('Latest pickup time in ms [default 600000]: ');
  const latestPickupTime = latestInput ? Number(latestInput) : Date.now() + 600000;

  const request = {
    id: Date.now() % 1000000,
    pickupLocation,
    dropLocation,
    requestTime: Date.now(),
    latestPickupTime,
    status: 'WAITING',
    riderId,
  };

  try {
    const result = await engineClient.assignRequest(request);

    if (!result || !result.assigned) {
      const reason = result && result.explanation && result.explanation.reason ? result.explanation.reason : 'No feasible vehicle available.';
      console.log(`\nNo feasible vehicle: ${reason}\n`);
      return;
    }

    const breakdown = result.explanation && result.explanation.breakdown ? result.explanation.breakdown : {};
    console.log('\nRequest R' + request.id + ' -> Vehicle ' + result.vehicleId);
    console.log('  Waiting time:    ' + (breakdown.waiting ?? 0).toFixed(2));
    console.log('  Added distance:  ' + (breakdown.addDistance ?? 0).toFixed(2));
    console.log('  Existing detour: ' + (breakdown.detour ?? 0).toFixed(2));
    console.log('  Vehicle penalty: ' + (breakdown.vehiclePenalty ?? 0).toFixed(2));
    console.log('  Under-util:      ' + (breakdown.underUtil ?? 0).toFixed(2));
    console.log('  TOTAL COST:      ' + (breakdown.total ?? 0).toFixed(2));
    console.log('  Reason: ' + (result.explanation && result.explanation.reason ? result.explanation.reason : 'assigned'));
    console.log('');
  } catch (error) {
    printError(error.message);
  }
}

async function showFleetState(engineClient, graph) {
  try {
    const fleet = await engineClient.getFleetState();
    printFleetTable(fleet, graph);
  } catch (error) {
    printError(error.message);
  }
}

async function runBuiltinDemo(engineClient, graph) {
  console.log('\nRunning built-in Section 39 demo scenario...\n');

  const demoVehicles = [
    { id: 1, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 2, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 3, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 4, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 5, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 6, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 7, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 8, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 9, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 10, type: 'TWO_WHEELER', capacity: 1, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 101, type: 'BUGGY', capacity: 3, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 102, type: 'BUGGY', capacity: 3, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 103, type: 'BUGGY', capacity: 3, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 104, type: 'BUGGY', capacity: 3, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 105, type: 'BUGGY', capacity: 3, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 201, type: 'BUS', capacity: 10, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 202, type: 'BUS', capacity: 10, currentLocation: 0, state: 'IDLE', route: [], currentRiders: [] },
    { id: 999, type: 'BUGGY', capacity: 3, currentLocation: 2, state: 'RETURNING', route: [{ location: 2, riderId: 300, type: 'PICKUP' }, { location: 0, riderId: 300, type: 'DROP' }], currentRiders: [300] },
  ];

  for (const vehicle of demoVehicles) {
    await engineClient.addVehicle(vehicle);
  }

  const requests = [
    { id: 1, pickupLocation: 0, dropLocation: 2, requestTime: Date.now(), latestPickupTime: Date.now() + 600000, status: 'WAITING', riderId: 1001 },
    { id: 2, pickupLocation: 1, dropLocation: 2, requestTime: Date.now() + 1000, latestPickupTime: Date.now() + 600000, status: 'WAITING', riderId: 1002 },
    { id: 3, pickupLocation: 0, dropLocation: 2, requestTime: Date.now() + 2000, latestPickupTime: Date.now() + 600000, status: 'WAITING', riderId: 1003 },
    { id: 4, pickupLocation: 1, dropLocation: 2, requestTime: Date.now() + 3000, latestPickupTime: Date.now() + 600000, status: 'WAITING', riderId: 1004 },
    { id: 5, pickupLocation: 2, dropLocation: 0, requestTime: Date.now() + 4000, latestPickupTime: Date.now() + 600000, status: 'WAITING', riderId: 1005 },
  ];

  const usedByRequest = [];

  for (const request of requests) {
    const label = `Submitting R${request.id}: ${nodeNameByIndex(graph, request.pickupLocation)} -> ${nodeNameByIndex(graph, request.dropLocation)}`;
    console.log(label);
    await sleep(400);

    const result = await engineClient.assignRequest(request);
    const vehicleId = result && result.vehicleId ? result.vehicleId : 'N/A';
    usedByRequest.push({ id: request.id, vehicleId });

    if (result && result.assigned) {
      const breakdown = result.explanation && result.explanation.breakdown ? result.explanation.breakdown : {};
      console.log(`  Assigned to vehicle ${vehicleId}. Total cost: ${Number(breakdown.total ?? 0).toFixed(2)}`);
    } else {
      const reason = result && result.explanation && result.explanation.reason ? result.explanation.reason : 'No feasible vehicle available.';
      console.log(`  Not assigned: ${reason}`);
    }

    console.log('');
    await sleep(500);
  }

  const r5Vehicle = usedByRequest.find((entry) => entry.id === 5)?.vehicleId;
  const reusedReturning = r5Vehicle === 999;
  console.log('=== Demo summary ===');
  console.log(`R1 used vehicle ${usedByRequest.find((entry) => entry.id === 1)?.vehicleId}`);
  console.log(`R2 used vehicle ${usedByRequest.find((entry) => entry.id === 2)?.vehicleId}`);
  console.log(`R3 used vehicle ${usedByRequest.find((entry) => entry.id === 3)?.vehicleId}`);
  console.log(`R4 used vehicle ${usedByRequest.find((entry) => entry.id === 4)?.vehicleId}`);
  console.log(`R5 reused a returning vehicle: ${reusedReturning ? 'YES' : 'NO'} (${r5Vehicle ?? 'N/A'})`);
  console.log('');
}

async function mainMenu(engineClient, graph) {
  while (true) {
    printTitle();
    console.log('1. Show current fleet state');
    console.log('2. Add a vehicle');
    console.log('3. Remove a vehicle');
    console.log('4. Change a vehicle\'s state');
    console.log('5. Submit a new ride request');
    console.log('6. Run the built-in Section 39 demo scenario');
    console.log('7. Show campus graph node list');
    console.log('8. Exit');

    const choice = await question('\nSelect an option: ');

    try {
      switch (choice) {
        case '1':
          await showFleetState(engineClient, graph);
          break;
        case '2':
          await addVehiclePrompt(engineClient, graph);
          break;
        case '3':
          await removeVehiclePrompt(engineClient, graph);
          break;
        case '4':
          await changeVehicleStatePrompt(engineClient, graph);
          break;
        case '5':
          await submitRideRequestPrompt(engineClient, graph);
          break;
        case '6':
          await runBuiltinDemo(engineClient, graph);
          break;
        case '7':
          printNodeList(graph);
          break;
        case '8':
          await engineClient.shutdown();
          console.log('Engine shutdown complete.');
          rl.close();
          return;
        default:
          printError('Please choose a valid menu option.');
      }
    } catch (error) {
      printError(error.message);
    }

    if (!rl.closed && choice !== '8') {
      await question('\nPress Enter to continue...');
    }
  }
}

async function start() {
  const graph = await chooseGraph();
  const engineClient = await startEngine(graph);

  process.on('SIGINT', async () => {
    console.log('\nReceived Ctrl+C. Shutting down engine...');
    try {
      await engineClient.shutdown();
    } catch (error) {
      console.log(`Shutdown error: ${error.message}`);
    }
    process.exit(0);
  });

  await mainMenu(engineClient, graph);
}

start().catch((error) => {
  printError(error.message || String(error));
  process.exit(1);
});
