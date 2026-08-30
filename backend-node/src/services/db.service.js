const db=require('../db');

const getActiveFleet=async()=>{

    const result = await db.query(`
    SELECT id, type, capacity, current_location, state, 
           (SELECT COUNT(*) FROM route_stops WHERE vehicle_id = vehicles.id AND status = 'PENDING') as active_passengers
    FROM vehicles 
    WHERE state IN ('IDLE', 'ON_TRIP', 'RETURNING')
    `);
    return result.rows;
};

const createRideRequest = async (riderId, pickup, dropoff) => {
  const result = await db.query(`
    INSERT INTO ride_requests (rider_id, pickup_location, dropoff_location, status, request_time)
    VALUES ($1, $2, $3, 'WAITING', NOW())
    RETURNING *
    `, [riderId, pickup, dropoff]);
    return result.rows[0];
};

const updateVehicleRoute = async (vehicleId, rideId, newRoute) => {
  await db.query(`
    UPDATE ride_requests SET status = 'ASSIGNED', assigned_vehicle_id = $1 WHERE id = $2
  `, [vehicleId, rideId]);
};

module.exports = { getActiveFleet, createRideRequest, updateVehicleRoute };
