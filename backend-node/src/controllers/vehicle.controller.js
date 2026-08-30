const db = require('../db');

const completeStop = async (req, res) => {
  try {
    const { vehicleId, locationNodeId, riderId } = req.body;
    const io = req.app.get('socketio');
    let actionMessage = 'Stop cleared manually';

    // 1. QR Flow: Process individual student scan
    if (riderId) {
      const rideRes = await db.query('SELECT * FROM ride_requests WHERE id = $1', [riderId]);
      
      if (rideRes.rows.length > 0) {
        const ride = rideRes.rows[0];
        let newStatus = ride.status;

        if (ride.pickup_location === locationNodeId && ride.status === 'ASSIGNED') {
          newStatus = 'PICKED_UP';
          actionMessage = `Student ${riderId} Picked Up via QR`;
        } else if (ride.dropoff_location === locationNodeId && ride.status === 'PICKED_UP') {
          newStatus = 'COMPLETED';
          actionMessage = `Student ${riderId} Dropped Off via QR`;
        }

        await db.query('UPDATE ride_requests SET status = $1 WHERE id = $2', [newStatus, riderId]);
        
        // Instantly notify driver's dashboard to decrement the pending count
        io.to(`vehicle_${vehicleId}`).emit('qr_scanned', { riderId, newStatus, message: actionMessage });
      }
    }

    // 2. Fetch the vehicle's current route array
    const vehicleRes = await db.query('SELECT current_route FROM vehicles WHERE id = $1', [vehicleId]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    
    let currentRoute = vehicleRes.rows[0].current_route;
    let shouldClearStop = true; 

    // 3. Auto-Clear Logic: Check if other students are waiting at this exact node
    if (riderId) {
      const pendingRides = currentRoute.filter(stop => 
        stop.location === locationNodeId && stop.riderId !== riderId
      );
      
      if (pendingRides.length > 0) {
        shouldClearStop = false;
        // Remove only this specific student's task, keep the stop active
        currentRoute = currentRoute.filter(stop => !(stop.location === locationNodeId && stop.riderId === riderId));
        await db.query('UPDATE vehicles SET current_route = $1::jsonb WHERE id = $2', [JSON.stringify(currentRoute), vehicleId]);
      }
    }

    // 4. Manual Flow / Last QR Scan: Remove the stop completely
    if (shouldClearStop) {
      currentRoute = currentRoute.filter(stop => stop.location !== locationNodeId);
      const newState = currentRoute.length === 0 ? 'IDLE' : 'ON_TRIP';
      
      await db.query(
        'UPDATE vehicles SET current_route = $1::jsonb, state = $2 WHERE id = $3',
        [JSON.stringify(currentRoute), newState, vehicleId]
      );

      // Broadcast to the React map to advance the route line
      io.emit('route_updated', { vehicleId, newRoute: currentRoute });
      actionMessage = riderId ? 'Last student scanned. Stop cleared automatically.' : 'Stop cleared manually.';
    }

    res.json({ success: true, updatedRoute: currentRoute, message: actionMessage });
  } catch (error) {
    console.error('Complete Stop Error:', error.message);
    res.status(500).json({ error: 'Failed to process stop' });
  }
};

// Add this right above module.exports
const toggleJobStatus = async (req, res) => {
  try {
    const { vehicleId, status } = req.body; 
    await db.query("UPDATE vehicles SET state = $1 WHERE id = $2", [status, vehicleId]);
    res.json({ success: true, state: status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update job status' });
  }
};

// Update your export line to include it
module.exports = { completeStop, toggleJobStatus };