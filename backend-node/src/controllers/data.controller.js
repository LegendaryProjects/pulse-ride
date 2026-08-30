const db = require('../db');
const { getDemandPrediction, getCampusHotspots } = require('../services/ml.service');

const getCampusNodes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM campus_nodes ORDER BY id ASC');
    res.json({ success: true, nodes: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campus map nodes' });
  }
};

const getLiveFleet = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.id, v.type, v.capacity, v.state, v.vehicle_number, v.current_route, 
             c.name as location_name, c.latitude, c.longitude
      FROM vehicles v
      LEFT JOIN campus_nodes c ON v.current_location = c.id
    `);
    res.json({ success: true, fleet: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fleet status' });
  }
};

const getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;
    const result = await db.query(`
      SELECT r.id as "rideId", r.status, r.pickup_location, r.dropoff_location, r.passenger_count,
             v.id as "vehicleId", v.type as "vehicleType", v.vehicle_number as "vehicleNumber",
             v.current_route as "currentRoute"
      FROM ride_requests r
      LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
      WHERE r.id = $1
    `, [rideId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    res.json({ success: true, ride: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ride status' });
  }
};

const getHotspotPredictions = async (req, res) => {
  try {
    const { hour, date } = req.query;
    const hotspots = await getCampusHotspots(date, hour ? parseInt(hour, 10) : undefined);
    res.json({ success: true, data: hotspots });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ML predictions' });
  }
};

module.exports = {
  getCampusNodes,
  getLiveFleet,
  getRideStatus,
  getHotspotPredictions
};