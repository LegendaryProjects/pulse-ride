const db = require('../db');
const batchManager = require('../services/batchManager.service');

const DEFAULT_CAMPUS_ROUTE = [
  "NITK Beach Gate", "LHC-C", "LHC-D", "Main Library", "Adke Circle", 
  "Karavali Hostel", "Guest House", "Girls Coop", "Girls Hostel", "Mega Towers"
];

// 1. Toggle Job Status (Driver clicks "Start Job" or "End Job")
const toggleJobStatus = async (req, res) => {
  try {
    const { vehicleId, status } = req.body;
    const vId = vehicleId || (req.user ? req.user.vehicle_id : 1);
    const newStatus = status || 'IDLE'; // 'IDLE' = On Duty / Ready for Dispatch, 'OFF_DUTY' = Off duty

    await db.query("UPDATE vehicles SET state = $1 WHERE id = $2", [newStatus, vId]);

    const io = req.app.get('socketio');
    if (io) {
      io.emit('fleet_updated', { vehicleId: vId, state: newStatus });
      
      // If driver starts job, initiate the 30-second batch collection window
      if (newStatus === 'IDLE') {
        batchManager.startBatchWindow(io);
      }
    }

    res.json({
      success: true,
      vehicleId: vId,
      state: newStatus,
      message: newStatus === 'IDLE' ? 'Job Started. 30-second dispatch window active.' : 'Job Ended.'
    });
  } catch (error) {
    console.error('Toggle Job Status Error:', error.message);
    res.status(500).json({ error: 'Failed to update job status: ' + error.message });
  }
};

// 2. Driver clicks "Reached <Stop Name> Stop"
const reachStop = async (req, res) => {
  try {
    const { vehicleId, stopName, stopIndex } = req.body;
    const vId = vehicleId || (req.user ? req.user.vehicle_id : 1);
    const io = req.app.get('socketio');

    const vehicleRes = await db.query('SELECT * FROM vehicles WHERE id = $1', [vId]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });

    const vehicle = vehicleRes.rows[0];
    let route = vehicle.current_route || [];
    if (typeof route === 'string') {
      try { route = JSON.parse(route); } catch (e) {}
    }

    const targetStop = stopName || (route[stopIndex || 0]?.location);

    // 1. Fetch Boarding Students (pickup at this stop, status ASSIGNED/REQUESTED)
    const boardingRes = await db.query(
      "SELECT * FROM ride_requests WHERE assigned_vehicle_id = $1 AND pickup_location = $2 AND status IN ('ASSIGNED', 'REQUESTED')",
      [vId, targetStop]
    );
    let boardingStudents = boardingRes.rows;
    if (boardingStudents.length === 0 && Array.isArray(route)) {
      boardingStudents = route.filter(s => (s.location === targetStop || String(s.location) === String(targetStop)) && s.type === 'PICKUP');
    }

    // 2. Fetch Dropping Students (dropoff at this stop, status PICKED_UP)
    const droppingRes = await db.query(
      "SELECT * FROM ride_requests WHERE assigned_vehicle_id = $1 AND dropoff_location = $2 AND status = 'PICKED_UP'",
      [vId, targetStop]
    );
    let droppingStudents = droppingRes.rows;
    if (droppingStudents.length === 0 && Array.isArray(route)) {
      droppingStudents = route.filter(s => (s.location === targetStop || String(s.location) === String(targetStop)) && s.type === 'DROP');
    }

    const boardingCount = boardingStudents.length;
    const droppingCount = droppingStudents.length;
    const isGoodToGo = boardingCount === 0 && droppingCount === 0;

    // Generate unique stop verification QR payload formatted as JSON string
    const qrPayload = {
      stop: targetStop,
      vehicleId: vId,
      vehicleNumber: vehicle.vehicle_number,
      action: boardingCount > 0 ? 'BOARDING' : 'DROPPING',
      timestamp: Date.now()
    };

    if (io) {
      // Notify boarding students
      boardingStudents.forEach(student => {
        const studentId = student.student_id || student.studentId || student.id;
        io.to(`student_${studentId}`).emit('ride_status_update', {
          status: 'ARRIVED_AT_STOP',
          stop: targetStop,
          vehicleId: vId,
          vehicleNumber: vehicle.vehicle_number,
          message: `Your vehicle (${vehicle.vehicle_number}) has arrived at "${targetStop}"! Please scan QR code to board.`
        });
        if (student.id) {
          io.emit(`ride_status_${student.id}`, {
            status: 'ARRIVED_AT_STOP',
            stop: targetStop,
            vehicleId: vId,
            vehicleNumber: vehicle.vehicle_number,
            message: `Your vehicle (${vehicle.vehicle_number}) has arrived at "${targetStop}"! Please scan QR code to board.`
          });
        }
      });

      // Notify dropping students
      droppingStudents.forEach(student => {
        const studentId = student.student_id || student.studentId || student.id;
        io.to(`student_${studentId}`).emit('ride_status_update', {
          status: 'ARRIVED_AT_STOP',
          stop: targetStop,
          vehicleId: vId,
          vehicleNumber: vehicle.vehicle_number,
          message: `You have arrived at your destination "${targetStop}"! Please scan QR code to complete your ride.`
        });
        if (student.id) {
          io.emit(`ride_status_${student.id}`, {
            status: 'ARRIVED_AT_STOP',
            stop: targetStop,
            vehicleId: vId,
            vehicleNumber: vehicle.vehicle_number,
            message: `You have arrived at your destination "${targetStop}"! Please scan QR code to complete your ride.`
          });
        }
      });

      // Broadcast to driver room
      io.to(`vehicle_${vId}`).emit('stop_reached_details', {
        vehicleId: vId,
        stop: targetStop,
        boardingCount,
        droppingCount,
        isGoodToGo,
        qrPayload
      });
    }

    res.json({
      success: true,
      stop: targetStop,
      boardingCount,
      droppingCount,
      isGoodToGo,
      qrPayload,
      message: `Arrived at stop "${targetStop}". Boarding: ${boardingCount}, Dropping: ${droppingCount}`
    });

  } catch (error) {
    console.error('Reach Stop Error:', error.message);
    res.status(500).json({ error: 'Failed to process stop arrival: ' + error.message });
  }
};

// 3. Complete stop and advance to next stop or complete journey
const completeStop = async (req, res) => {
  try {
    const { vehicleId, stopName, stopIndex, totalStops } = req.body;
    const vId = vehicleId || (req.user ? req.user.vehicle_id : 1);
    const io = req.app.get('socketio');

    const vehicleRes = await db.query('SELECT * FROM vehicles WHERE id = $1', [vId]);
    if (vehicleRes.rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });

    const vehicle = vehicleRes.rows[0];
    let currentRoute = vehicle.current_route || [];
    if (typeof currentRoute === 'string') {
      try { currentRoute = JSON.parse(currentRoute); } catch (e) {}
    }

    // Remove completed stop from the vehicle's remaining route if tracked
    const targetStop = stopName;
    if (targetStop && currentRoute.length > 0) {
      currentRoute = currentRoute.filter(s => !(s.location === targetStop || String(s.location) === String(targetStop)));
    }

    // Only mark journey finished if on the actual last stop of the route
    const isJourneyFinished = (totalStops !== undefined && stopIndex !== undefined)
      ? (Number(stopIndex) >= Number(totalStops) - 1)
      : (currentRoute.length === 0 && Number(stopIndex) > 0);

    const newState = isJourneyFinished ? 'IDLE' : 'ON_TRIP';

    await db.query(
      'UPDATE vehicles SET current_route = $1, state = $2 WHERE id = $3',
      [JSON.stringify(isJourneyFinished ? [] : currentRoute), newState, vId]
    );

    if (io) {
      io.to(`vehicle_${vId}`).emit('stop_progression', {
        vehicleId: vId,
        completedStop: targetStop,
        stopIndex,
        totalStops,
        isFinished: isJourneyFinished,
        remainingRoute: currentRoute
      });

      if (isJourneyFinished) {
        io.to(`vehicle_${vId}`).emit('trip_completed', {
          vehicleId: vId,
          message: 'All stops have been completed successfully. You can Start Job again for the next dispatch.'
        });
        io.emit('fleet_updated', {
          vehicleId: vId,
          state: 'IDLE',
          currentRoute: []
        });
      }
    }

    res.json({
      success: true,
      updatedRoute: currentRoute,
      isFinished: isJourneyFinished,
      state: newState,
      message: isJourneyFinished ? 'All routes finished! Job completed.' : 'Stop marked completed.'
    });

  } catch (error) {
    console.error('Complete Stop Error:', error.message);
    res.status(500).json({ error: 'Failed to complete stop: ' + error.message });
  }
};

// 4. Get Current Driver Vehicle details and route
const getDriverVehicleState = async (req, res) => {
  try {
    const vId = (req.user && req.user.vehicle_id) ? req.user.vehicle_id : (req.query.vehicleId || 1);
    const result = await db.query(`
      SELECT v.*, c.name as location_name, c.latitude, c.longitude
      FROM vehicles v
      LEFT JOIN campus_nodes c ON v.current_location = c.id
      WHERE v.id = $1
    `, [vId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    const vehicle = result.rows[0];
    if (typeof vehicle.current_route === 'string') {
      try { vehicle.current_route = JSON.parse(vehicle.current_route); } catch (e) {}
    }

    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('Get Driver Vehicle Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch driver vehicle' });
  }
};

module.exports = {
  toggleJobStatus,
  reachStop,
  completeStop,
  getDriverVehicleState
};