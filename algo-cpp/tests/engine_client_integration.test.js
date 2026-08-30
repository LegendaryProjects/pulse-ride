const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EngineClient } = require('../engineClient');

function buildCampusGraph() {
  return {
    nodes: [
      { id: 0, name: 'NITK Beach' },
      { id: 1, name: 'LHC-C' },
      { id: 2, name: 'Library' },
    ],
    edges: [
      { from: 0, to: 1, distance: 120, travelTime: 10, directed: false },
      { from: 1, to: 2, distance: 130, travelTime: 12, directed: false },
      { from: 0, to: 2, distance: 200, travelTime: 18, directed: false },
    ],
  };
}

test('EngineClient keeps the fleet alive across repeated assignment requests', async () => {
  const binaryPath = path.join(__dirname, '..', 'engine_main.exe');
  const client = new EngineClient(binaryPath, buildCampusGraph(), {
    initTimeoutMs: 5000,
    requestTimeoutMs: 3000,
  });

  try {
    await client.ready;

    await client.addVehicle({
      id: 1,
      type: 'TWO_WHEELER',
      capacity: 1,
      currentLocation: 0,
      state: 'ON_TRIP',
      route: [
        { location: 0, riderId: 7, type: 'PICKUP' },
        { location: 1, riderId: 7, type: 'DROP' },
      ],
      currentRiders: [7],
    });

    await client.addVehicle({
      id: 2,
      type: 'BUGGY',
      capacity: 3,
      currentLocation: 0,
      state: 'IDLE',
      route: [],
      currentRiders: [],
    });

    const firstRequest = {
      id: 101,
      pickupLocation: 0,
      dropLocation: 1,
      requestTime: 0,
      latestPickupTime: 500,
      status: 'WAITING',
    };

    const firstResult = await client.assignRequest(firstRequest);
    assert.ok(firstResult && typeof firstResult === 'object');
    assert.ok(firstResult.vehicleId === 1 || firstResult.vehicleId === 2);

    const secondRequest = {
      id: 102,
      pickupLocation: 0,
      dropLocation: 1,
      requestTime: 1,
      latestPickupTime: 500,
      status: 'WAITING',
    };

    const secondResult = await client.assignRequest(secondRequest);
    assert.ok(secondResult && typeof secondResult === 'object');
    assert.ok(secondResult.vehicleId === 1 || secondResult.vehicleId === 2);
    assert.ok(secondResult.vehicleId === firstResult.vehicleId || secondResult.vehicleId === 2);
  } finally {
    await client.shutdown();
  }
});
