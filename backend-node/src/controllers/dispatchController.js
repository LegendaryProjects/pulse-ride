// backend-node/src/controllers/dispatchController.js
const { getMLPredictions } = require('../services/mlClient');
const { runOptimizer } = require('../services/algoClient');
const campusGraph = require('../../../algo-cpp/tools/campus_graph_nitk.json');

async function handleRideRequest(req, res) {
  const { riderId, pickupNode, dropNode, passengerCount } = req.body;
  const io = req.app.get('socketio');

  try {
    // 1. Query ML Microservice for pricing & traffic coefficients
    const mlInsights = await getMLPredictions({
      pickupNode,
      dropNode,
      timeOfDay: new Date().toISOString(),
      activeRequestsCount: req.app.locals.activeDemandCount || 1
    });

    // 2. Fetch current fleet state from memory or Supabase
    const activeVehicles = await req.app.locals.getFleetState();

    // 3. Assemble C++ Optimization Payload
    const enginePayload = {
      graph: campusGraph,
      vehicles: activeVehicles,
      new_request: {
        request_id: `req_${Date.now()}`,
        rider_id: riderId,
        pickup_node: pickupNode,
        drop_node: dropNode,
        passengers: passengerCount,
        delay_weight: mlInsights.traffic_delay_factor
      }
    };

    // 4. Run C++ route optimization engine
    const assignmentResult = await runOptimizer(enginePayload);

    // 5. Broadcast route updates to driver and rider
    io.to(`vehicle_${assignmentResult.assigned_vehicle_id}`).emit('route_updated', {
      new_route: assignmentResult.updated_route,
      schedule: assignmentResult.stops
    });

    io.to(`rider_${riderId}`).emit('ride_matched', {
      vehicle_id: assignmentResult.assigned_vehicle_id,
      eta: assignmentResult.eta_minutes * mlInsights.traffic_delay_factor,
      fare: assignmentResult.base_fare * mlInsights.surge_multiplier
    });

    return res.status(200).json({
      success: true,
      assignment: assignmentResult,
      mlInsights
    });

  } catch (err) {
    console.error('Ride Dispatch Pipeline Failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = { handleRideRequest };