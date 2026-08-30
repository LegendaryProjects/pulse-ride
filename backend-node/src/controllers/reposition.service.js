const axios = require('axios');
const db = require('../db');

// Mock Python ML URL
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

const runFleetRepositioning = async (io) => {
  try {
    // 1. Ask Python ML for the next demand hotspot
    // (e.g., predicting a surge at the Hostels in 10 minutes)
    const { data: prediction } = await axios.get(`${ML_API_URL}/predict-hotspot`);
    const hotspotNodeId = prediction.hotspot_location; // e.g., Node 102 (Hostels)

    // 2. Find all IDLE buses or cars
    const idleVehicles = await db.query(
      "SELECT id, current_location FROM vehicles WHERE state = 'IDLE' LIMIT 3"
    );

    // 3. Send them to the hotspot
    for (const vehicle of idleVehicles.rows) {
      if (vehicle.current_location === hotspotNodeId) continue; // Already there

      const repositionRoute = [{
        location: hotspotNodeId,
        type: 'REPOSITION',
        passengerChange: 0
      }];

      // Update DB to show they are repositioning
      await db.query(
        "UPDATE vehicles SET current_route = $1, state = 'RETURNING' WHERE id = $2",
        [JSON.stringify(repositionRoute), vehicle.id]
      );

      // Notify the drivers to move
      io.to(`vehicle_${vehicle.id}`).emit('route_updated', {
        vehicleId: vehicle.id,
        newRoute: repositionRoute,
        message: 'High demand predicted. Please move to hotspot.'
      });
    }
  } catch (error) {
    console.error('Repositioning failed. ML service might be down:', error.message);
  }
};

// Start the background loop (runs every 5 minutes)
const startRepositionLoop = (io) => {
  setInterval(() => runFleetRepositioning(io), 5 * 60 * 1000);
};

module.exports = { startRepositionLoop };