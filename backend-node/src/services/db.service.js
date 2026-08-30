const db = require('../db');

const getActiveFleet = async () => {
  const result = await db.query(`
    SELECT id, type, capacity, current_location, state, vehicle_number, current_route, avg_speed_kmh
    FROM vehicles 
    WHERE state IN ('IDLE', 'ON_TRIP', 'RETURNING', 'OFF_DUTY')
  `);
  return result.rows;
};

const createRideRequest = async (studentId, pickup, dropoff, passengerCount = 1) => {
  const result = await db.query(`
    INSERT INTO ride_requests (student_id, pickup_location, dropoff_location, passenger_count, status, request_time)
    VALUES ($1, $2, $3, $4, 'REQUESTED', NOW())
    RETURNING *
  `, [studentId, pickup, dropoff, passengerCount]);
  return result.rows[0];
};

const updateVehicleRoute = async (vehicleId, rideIds = [], newRoute = [], newState = 'ON_TRIP') => {
  await db.query(
    'UPDATE vehicles SET current_route = $1, state = $2 WHERE id = $3',
    [JSON.stringify(newRoute), newState, vehicleId]
  );

  const ids = Array.isArray(rideIds) ? rideIds : [rideIds];
  for (const rId of ids) {
    if (rId) {
      await db.query(
        'UPDATE ride_requests SET status = $1, assigned_vehicle_id = $2 WHERE id = $3',
        ['ASSIGNED', vehicleId, rId]
      );
    }
  }
};

module.exports = {
  getActiveFleet,
  createRideRequest,
  updateVehicleRoute
};
