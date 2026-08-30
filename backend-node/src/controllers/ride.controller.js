const dbService = require('../services/db.service');
const { calculateOptimizedRoute } = require('../services/cppEngine');
const mlService = require('../services/ml.service');

const logDemandForML = async (nodeId) => {
  try {
    const now = new Date();
    const recordDate = now.toISOString().split('T')[0];
    const recordTime = now.toTimeString().split(' ')[0];
    const dayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);

    await db.query(`
      INSERT INTO ml_demand_history (record_date, record_time, day_of_week, node_id, student_count)
      VALUES ($1, $2, $3, $4, 1)
    `, [recordDate, recordTime, dayOfWeek, nodeId]);
  } catch (error) {
    console.error('ML Logging failed silently:', error.message);
  }
};

const requestRide = async (req, res) => {
  
  try {
    const studentId = req.user.id; 
    const now = new Date();

    const userCheck = await db.query('SELECT is_blocked, blocked_until FROM users WHERE id = $1', [studentId]);
    const user = userCheck.rows[0];

    if (user.is_blocked) {
      const unblockDate = new Date(user.blocked_until);

      if (now < unblockDate) {
        // Block is still active
        return res.status(403).json({ 
          error: `Account blocked due to multiple no-shows. You can book rides again on ${unblockDate.toLocaleString()}` 
        });
      } else {
        // 1-week block has expired. Wipe their slate clean.
        await db.query(
          'UPDATE users SET is_blocked = false, penalty_count = 0, blocked_until = NULL WHERE id = $1', 
          [studentId]
        );
      }
    }

    const { riderId, pickup, dropoff } = req.body;
    const io = req.app.get('socketio'); 

    //  Log the request in PostgreSQL
    const ride = await dbService.createRideRequest(riderId, pickup, dropoff);

    //  Fetch the current state of the entire campus fleet
    const activeFleet = await dbService.getActiveFleet();

    //  Send data to C++ for the Greedy Minimum-Cost Insertion algorithm
    const optimizationResult = await calculateOptimizedRoute({
      newRequest: ride,
      fleetState: activeFleet
    });

    // Update the database with the C++ engine's decision
    await dbService.updateVehicleRoute(
      optimizationResult.vehicleId, 
      ride.id, 
      optimizationResult.route
    );

    //  Instantly notify the assigned driver's dashboard via WebSockets
    io.to(`vehicle_${optimizationResult.vehicleId}`).emit('new_route_assigned', {
      rideId: ride.id,
      pickup,
      dropoff,
      eta: optimizationResult.eta_mins
    });

    res.json({ success: true, match: optimizationResult });

  } catch (error) {
    console.error('🔥 EXACT CRASH CAUSE:', error.message, '\nStack:', error.stack); 
    res.status(500).json({ error: 'Failed to optimize and assign ride.' });
  }
};

const scanQR = async (req, res) => {
  try {
    const { riderId, vehicleId, locationNodeId } = req.body;
    const io = req.app.get('socketio');

    // Fetch the student's active ride
    const rideRes = await db.query('SELECT * FROM ride_requests WHERE id = $1', [riderId]);
    if (rideRes.rows.length === 0) return res.status(404).json({ error: 'Ride not found' });
    
    const ride = rideRes.rows[0];
    if (ride.assigned_vehicle_id !== vehicleId) return res.status(400).json({ error: 'Wrong vehicle' });

    let newStatus = ride.status;
    let actionMessage = '';

    // Determine if this scan is for a Pickup or a Dropoff
    if (ride.pickup_location === locationNodeId && ride.status === 'ASSIGNED') {
      newStatus = 'PICKED_UP';
      actionMessage = 'Student Picked Up';
    } else if (ride.dropoff_location === locationNodeId && ride.status === 'PICKED_UP') {
      newStatus = 'COMPLETED';
      actionMessage = 'Student Dropped Off';
    } else {
      return res.status(400).json({ error: 'Scan invalid or already processed at this location.' });
    }

    // Update the database
    await db.query('UPDATE ride_requests SET status = $1 WHERE id = $2', [newStatus, riderId]);

    // Instantly notify the Driver's dashboard to decrease the UI counter
    io.to(`vehicle_${vehicleId}`).emit('qr_scanned', {
      riderId,
      newStatus,
      message: actionMessage
    });

    res.json({ success: true, newStatus, message: actionMessage });
  } catch (error) {
    console.error('QR Scan Error:', error.message);
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
};

const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.body;
    await db.query("UPDATE ride_requests SET status = 'CANCELLED' WHERE id = $1", [rideId]);
    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel' });
  }
};

const markNoShow = async (req, res) => {
  try {
    const { rideId } = req.body;

    const rideRes = await db.query(
      "UPDATE ride_requests SET status = 'NO_SHOW' WHERE id = $1 RETURNING student_id", 
      [rideId]
    );
    if (rideRes.rows.length === 0) return res.status(404).json({ error: 'Ride not found' });
    
    const studentId = rideRes.rows[0].student_id;
    const userRes = await db.query('SELECT penalty_count, last_penalty_date FROM users WHERE id = $1', [studentId]);
    const user = userRes.rows[0];

    const PENALTY_THRESHOLD = 3;
    const DAYS_TO_RESET = 7;
    const now = new Date();
    
    let newCount = user.penalty_count;
    
    if (user.last_penalty_date) {
      const daysSinceLast = (now - new Date(user.last_penalty_date)) / (1000 * 60 * 60 * 24);
      if (daysSinceLast > DAYS_TO_RESET) newCount = 0;
    }

    newCount += 1;
    const shouldBlock = newCount >= PENALTY_THRESHOLD;
    
    // Set the unblock date exactly 7 days from right now
    const blockedUntil = shouldBlock ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null;

    await db.query(
      'UPDATE users SET penalty_count = $1, last_penalty_date = $2, is_blocked = $3, blocked_until = $4 WHERE id = $5',
      [newCount, now, shouldBlock, blockedUntil, studentId]
    );

    res.json({ 
      success: true, 
      message: shouldBlock ? 'User blocked for 1 week.' : `Penalty applied. Count: ${newCount}` 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process no-show' });
  }
};

const scanStudentQR = async (req, res) => {
  try {
    const { rideId } = req.body; // Extracted from the student's scanned QR code

    // 1. Find the active ride request
    const rideRes = await db.query(
      "SELECT * FROM ride_requests WHERE id = $1 AND status = 'REQUESTED'",
      [rideId]
    );

    if (rideRes.rows.length === 0) {
      return res.status(404).json({ error: 'Active ride request not found or already processed.' });
    }

    // 2. Mark the ride as successfully completed/boarded
    await db.query(
      "UPDATE ride_requests SET status = 'COMPLETED' WHERE id = $1",
      [rideId]
    );

    res.json({ 
      success: true, 
      message: 'QR verified successfully! Student checked into the vehicle.' 
    });
  } catch (error) {
    console.error('QR Scan Error:', error.message);
    res.status(500).json({ error: 'Failed to process QR scan' });
  }
};

const getDriverPendingRides = async (req, res) => {
  try {
    // Fetch all ride requests that are currently pending along with student details
    const ridesRes = await db.query(`
      SELECT r.id AS ride_id, r.pickup_location, r.dropoff_location, r.status, r.created_at,
             u.id AS student_id, u.name AS student_name, u.roll_number, u.email
      FROM ride_requests r
      JOIN users u ON r.student_id = u.id
      WHERE r.status = 'REQUESTED'
      ORDER BY r.created_at ASC
    `);

    res.json({
      success: true,
      pending_riders: ridesRes.rows
    });
  } catch (error) {
    console.error('Fetch Pending Rides Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch pending riders' });
  }
};
module.exports = { requestRide, scanQR ,logDemandForML,cancelRide, markNoShow, scanStudentQR, getDriverPendingRides };
