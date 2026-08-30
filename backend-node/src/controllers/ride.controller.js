const db = require('../db');
const batchManager = require('../services/batchManager.service');

// 1. Student Requests a Ride
const requestRide = async (req, res) => {
  try {
    const { pickup_location, dropoff_location, passenger_count } = req.body;
    const student_id = (req.user && req.user.id) ? req.user.id : 1;

    if (!pickup_location || !dropoff_location) {
      return res.status(400).json({ error: 'Pickup and Dropoff locations are required.' });
    }

    // Immediate check: Is there any driver active who has started their job (state = 'IDLE' or 'ON_TRIP')?
    const activeVehiclesRes = await db.query("SELECT * FROM vehicles WHERE state IN ('IDLE', 'ON_TRIP')");
    if (activeVehiclesRes.rows.length === 0) {
      return res.json({
        success: false,
        noDrivers: true,
        status: 'NO_VEHICLES_AVAILABLE',
        error: 'No active drivers available. All campus shuttles are currently off-duty. Please ask a driver to click "Start Job" first.'
      });
    }

    // Insert ride request with status 'REQUESTED'
    const result = await db.query(
      `INSERT INTO ride_requests (student_id, pickup_location, dropoff_location, passenger_count, status)
       VALUES ($1, $2, $3, $4, 'REQUESTED') RETURNING *`,
      [student_id, pickup_location, dropoff_location, passenger_count || 1]
    );

    const ride = result.rows[0];
    const io = req.app.get('socketio');

    // Add to 30-sec batch queue for driver dispatch
    batchManager.addRequest(ride, io);

    res.status(201).json({
      success: true,
      message: 'Ride request confirmed. Vehicle is being dispatched.',
      rideId: ride.id,
      ride
    });

  } catch (error) {
    console.error('Request Ride Error:', error.message);
    res.status(500).json({ error: 'Failed to create ride request: ' + error.message });
  }
};

// 2. Get 30-sec Batch Window Status
const getBatchStatus = (req, res) => {
  res.json({
    success: true,
    data: batchManager.getBatchStatus()
  });
};

// 3. Force Instant Batch Dispatch (Triggered on demand or auto)
const forceDispatchBatch = async (req, res) => {
  try {
    await batchManager.forceDispatch();
    res.json({
      success: true,
      message: 'Batch dispatched successfully'
    });
  } catch (error) {
    console.error('Force Dispatch Error:', error.message);
    res.status(500).json({ error: 'Failed to dispatch batch: ' + error.message });
  }
};

// 4. Get Student Active Ride
const getStudentActiveRide = async (req, res) => {
  try {
    const student_id = (req.user && req.user.id) ? req.user.id : (req.query.studentId || 1);

    const result = await db.query(
      `SELECT r.*, v.type as vehicle_type, v.vehicle_number, v.capacity
       FROM ride_requests r
       LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
       WHERE r.student_id = $1 AND r.status IN ('REQUESTED', 'ASSIGNED', 'PICKED_UP')
       ORDER BY r.id DESC LIMIT 1`,
      [student_id]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, activeRide: null });
    }

    res.json({ success: true, activeRide: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch active ride' });
  }
};

// 5. Scan QR Code (2-Step Check-in: 1st Scan = Boarding, 2nd Scan = Deboarding/Complete)
const scanQR = async (req, res) => {
  try {
    const { rideId, vehicleId, locationNodeId, stopLocation, qrData, qrString } = req.body;
    const io = req.app.get('socketio');

    let scannedStop = stopLocation || locationNodeId;
    let scannedVehicleId = vehicleId;

    // Parse camera scanned QR code JSON if provided
    const rawQr = qrData || qrString;
    if (rawQr && typeof rawQr === 'string') {
      try {
        const parsed = JSON.parse(rawQr);
        if (parsed.stop) scannedStop = parsed.stop;
        if (parsed.vehicleId) scannedVehicleId = parsed.vehicleId;
      } catch (e) {
        if (rawQr.startsWith('STOP_')) {
          const parts = rawQr.split('_');
          if (parts.length >= 2) scannedStop = parts[1];
        }
      }
    }

    // 1. Resolve Target Ride Request ID
    let targetRideId = rideId;
    if (!targetRideId && req.user && req.user.id) {
      const studentRideRes = await db.query(
        "SELECT id FROM ride_requests WHERE student_id = $1 AND status IN ('ASSIGNED', 'REQUESTED', 'PICKED_UP') ORDER BY id DESC LIMIT 1",
        [req.user.id]
      );
      targetRideId = studentRideRes.rows[0]?.id;
    }

    if (!targetRideId) {
      const fallbackRideRes = await db.query(
        "SELECT id FROM ride_requests WHERE status IN ('ASSIGNED', 'REQUESTED', 'PICKED_UP') ORDER BY id DESC LIMIT 1"
      );
      targetRideId = fallbackRideRes.rows[0]?.id;
    }

    if (!targetRideId) {
      return res.status(404).json({ error: 'No active ride found for QR scan verification.' });
    }

    const rideRes = await db.query('SELECT * FROM ride_requests WHERE id = $1', [targetRideId]);
    if (rideRes.rows.length === 0) return res.status(404).json({ error: 'Ride request not found.' });

    const ride = rideRes.rows[0];
    let newStatus = ride.status;
    let actionType = 'BOARDING';
    let actionMessage = '';

    // Determine if Boarding (Pickup) or Deboarding (Dropoff)
    if (ride.status === 'ASSIGNED' || ride.status === 'REQUESTED') {
      newStatus = 'PICKED_UP';
      actionType = 'BOARDING';
      actionMessage = 'Student boarded successfully!';
    } else if (ride.status === 'PICKED_UP') {
      newStatus = 'COMPLETED';
      actionType = 'DROPPING';
      actionMessage = 'Student arrived at destination! Trip completed.';
    } else {
      return res.status(400).json({ error: `Ride is already ${ride.status}.` });
    }

    // Update ride status in database
    await db.query('UPDATE ride_requests SET status = $1 WHERE id = $2', [newStatus, targetRideId]);

    const activeVehicleId = scannedVehicleId || ride.assigned_vehicle_id || 1;
    const currentLoc = scannedStop || (actionType === 'BOARDING' ? ride.pickup_location : ride.dropoff_location);

    // Calculate remaining boarding and dropping counts for this stop from DB
    const remBoardingRes = await db.query(
      "SELECT id FROM ride_requests WHERE assigned_vehicle_id = $1 AND pickup_location = $2 AND status IN ('ASSIGNED', 'REQUESTED')",
      [activeVehicleId, currentLoc]
    );
    const remDroppingRes = await db.query(
      "SELECT id FROM ride_requests WHERE assigned_vehicle_id = $1 AND dropoff_location = $2 AND status = 'PICKED_UP'",
      [activeVehicleId, currentLoc]
    );

    const remainingBoarding = remBoardingRes.rows.length;
    const remainingDropping = remDroppingRes.rows.length;
    const isGoodToGo = remainingBoarding === 0 && remainingDropping === 0;

    // Instantly notify the Driver's dashboard
    if (io) {
      io.to(`vehicle_${activeVehicleId}`).emit('qr_scanned', {
        rideId: targetRideId,
        actionType,
        newStatus,
        location: currentLoc,
        remainingBoarding,
        remainingDropping,
        isGoodToGo,
        message: actionMessage
      });

      // Also notify student
      io.emit(`ride_status_${targetRideId}`, {
        status: newStatus,
        message: actionMessage
      });

      if (ride.student_id) {
        io.to(`student_${ride.student_id}`).emit('ride_status_update', {
          status: newStatus,
          message: actionMessage
        });
      }
    }

    res.json({
      success: true,
      newStatus,
      actionType,
      scannedStop: currentLoc,
      remainingBoarding,
      remainingDropping,
      isGoodToGo,
      message: actionMessage
    });

  } catch (error) {
    console.error('Scan QR Error:', error.message);
    res.status(500).json({ error: 'Failed to process QR scan: ' + error.message });
  }
};

// 6. Cancel Ride Request
const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.body;
    const targetRideId = rideId || (req.user && req.user.id ? (
      (await db.query("SELECT id FROM ride_requests WHERE student_id = $1 AND status IN ('REQUESTED', 'ASSIGNED') ORDER BY id DESC LIMIT 1", [req.user.id])).rows[0]?.id
    ) : null);

    if (!targetRideId) {
      return res.status(404).json({ error: 'No active ride found to cancel.' });
    }

    await db.query("UPDATE ride_requests SET status = 'CANCELLED' WHERE id = $1", [targetRideId]);

    const io = req.app.get('socketio');
    if (io) {
      io.emit(`ride_status_${targetRideId}`, {
        status: 'CANCELLED',
        message: 'Ride request cancelled.'
      });
    }

    res.json({ success: true, message: 'Ride request cancelled successfully.' });
  } catch (error) {
    console.error('Cancel Ride Error:', error.message);
    res.status(500).json({ error: 'Failed to cancel ride: ' + error.message });
  }
};

module.exports = {
  requestRide,
  getBatchStatus,
  forceDispatchBatch,
  getStudentActiveRide,
  scanQR,
  cancelRide
};
