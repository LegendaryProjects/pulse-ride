const db = require('../db');

const handleStopReached = async (vehicleId, stopIndex, io) => {
  // 1. Fetch current vehicle route from DB
  const res = await db.query(
    'SELECT current_route, state FROM vehicles WHERE id = $1',
    [vehicleId]
  );
  if (!res.rows.length) return;

  const route = res.rows[0].current_route || [];
  const reachedStop = route[stopIndex];
  if (!reachedStop) return;

  // 2. Update rider status according to stop type
  if (reachedStop.type === 'PICKUP') {
    await db.query(
      "UPDATE ride_requests SET status = 'PICKED_UP' WHERE id = $1",
      [reachedStop.riderId]
    );
    io.emit(`ride_status_${reachedStop.riderId}`, { status: 'PICKED_UP' });
  } else if (reachedStop.type === 'DROP') {
    await db.query(
      "UPDATE ride_requests SET status = 'COMPLETED' WHERE id = $1",
      [reachedStop.riderId]
    );
    io.emit(`ride_status_${reachedStop.riderId}`, { status: 'COMPLETED' });
  }

  // 3. Remove completed stop from route
  route.splice(stopIndex, 1);
  const nextState = route.length === 0 ? 'IDLE' : 'ON_TRIP';

  await db.query(
    'UPDATE vehicles SET current_route = $1, state = $2 WHERE id = $3',
    [JSON.stringify(route), nextState, vehicleId]
  );

  // 4. Broadcast updated route to driver
  io.to(`vehicle_${vehicleId}`).emit('route_updated', {
    vehicleId,
    newRoute: route,
  });
};

module.exports = { handleStopReached };