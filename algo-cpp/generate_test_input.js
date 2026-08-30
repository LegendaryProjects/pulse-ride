const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('./tools/campus_graph_nitk.json'));

const testInit = {
  type: 'init',
  campusGraph: graph,
};

const testVehicle = {
  type: 'add_vehicle',
  vehicle: {
    id: 1,
    type: 'BUGGY',
    capacity: 3,
    currentLocation: 6, // Adke Circle
    state: 'IDLE',
    route: [],
    currentRiders: [],
  },
};

const testRequest = {
  type: 'assign_request',
  requestId: 1,
  request: {
    id: 100,
    pickupLocation: 6, // Adke Circle
    dropLocation: 8,   // Mega Towers
    requestTime: 0,
    latestPickupTime: 600000,
    status: 'WAITING',
    riderId: 999,
  },
};

const shutdown = { type: 'shutdown' };

console.log(JSON.stringify(testInit));
console.log(JSON.stringify(testVehicle));
console.log(JSON.stringify(testRequest));
console.log(JSON.stringify(shutdown));
