const db = require('../db');
const dbService = require('./db.service');

class BatchManager {
  constructor(batchWindowSeconds = 30) {
    this.batchWindowSeconds = batchWindowSeconds; // 30-second fast batching window
    this.pendingQueue = [];
    this.timer = null;
    this.intervalTimer = null;
    this.batchStartTime = null;
    this.io = null;
  }

  setSocketIO(io) {
    this.io = io;
  }

  // Get current batch window information for frontend display
  getBatchStatus() {
    if (!this.batchStartTime) {
      return {
        active: false,
        pendingStudents: this.pendingQueue.length,
        remainingSeconds: this.batchWindowSeconds,
        thresholdTarget: "1 (Bike) / 2-4 (Buggy) / 5+ (Bus)"
      };
    }

    const elapsed = Math.floor((Date.now() - this.batchStartTime) / 1000);
    const remaining = Math.max(0, this.batchWindowSeconds - elapsed);

    return {
      active: true,
      pendingStudents: this.pendingQueue.length,
      remainingSeconds: remaining,
      thresholdTarget: this.pendingQueue.length >= 5 ? "BUS" : (this.pendingQueue.length >= 2 ? "BUGGY" : "BIKE")
    };
  }

  // Start 30-second batch collection window (triggered when driver clicks Start Job or when first student requests)
  startBatchWindow(io) {
    if (io) this.io = io;

    if (!this.batchStartTime) {
      this.batchStartTime = Date.now();
      console.log(`⏱️ Starting 30-second batch collection window...`);

      // Start 1-second interval ticker for live countdown broadcasts to driver and students
      if (this.intervalTimer) clearInterval(this.intervalTimer);
      this.intervalTimer = setInterval(() => {
        if (this.batchStartTime) {
          this.broadcastBatchUpdate();
        } else {
          clearInterval(this.intervalTimer);
          this.intervalTimer = null;
        }
      }, 1000);

      // Start 30-second dispatch execution timer
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.processBatch();
      }, this.batchWindowSeconds * 1000);
    }

    this.broadcastBatchUpdate();
  }

  // Student requests a ride - added to 30s batch queue
  addRequest(rideRequest, io) {
    if (io) this.io = io;

    this.pendingQueue.push(rideRequest);
    console.log(`📥 Student request added to batch. Queue size: ${this.pendingQueue.length}`);

    // Ensure 30s timer is running
    this.startBatchWindow(this.io);

    // Threshold shortcut: If queue reaches high capacity (e.g. 8+ students), process immediately
    if (this.pendingQueue.length >= 8) {
      console.log('⚡ Batch threshold reached (8+ students). Dispatching bus immediately...');
      this.processBatch();
    }
  }

  broadcastBatchUpdate() {
    if (this.io) {
      this.io.emit('batch_window_update', this.getBatchStatus());
    }
  }

  // Force dispatch immediately (useful for testing and instant matching)
  async forceDispatch() {
    await this.processBatch();
  }

  // Process the accumulated batch of ride requests
  async processBatch() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.batchStartTime = null;

    if (this.pendingQueue.length === 0) {
      console.log('⏱️ 30s Batch window completed with 0 waiting requests. Driver remains IDLE.');
      this.broadcastBatchUpdate();
      return;
    }

    const currentBatch = [...this.pendingQueue];
    this.pendingQueue = [];
    this.broadcastBatchUpdate();

    console.log(`🚌 Processing 30s dispatch batch with ${currentBatch.length} student ride requests...`);

    try {
      // 1. Fetch available vehicles that are on duty and IDLE (driver clicked "Start Job")
      const fleetRes = await db.query(
        "SELECT * FROM vehicles WHERE state = 'IDLE' ORDER BY capacity ASC"
      );
      const idleVehicles = fleetRes.rows;

      if (idleVehicles.length === 0) {
        console.warn('⚠️ No IDLE vehicles available for dispatch. Drivers must click "Start Job".');
        
        // Notify all waiting students that no vehicle is currently available
        for (const req of currentBatch) {
          const rideId = req.id || req.ride_id;
          if (this.io) {
            this.io.emit(`ride_status_${rideId}`, {
              status: 'NO_VEHICLES_AVAILABLE',
              message: 'No vehicles currently available — all drivers are off-duty. Please wait for a driver to start their shift or try again in a few minutes.'
            });
          }
          // Mark ride as cancelled/no vehicle
          await db.query("UPDATE ride_requests SET status = 'NO_VEHICLES_AVAILABLE' WHERE id = $1", [rideId]).catch(() => {});
        }
        return;
      }

      // 2. Determine target vehicle type based on passenger count threshold
      const totalStudents = currentBatch.length;
      let preferredType = 'TWO_WHEELER';
      if (totalStudents >= 5) {
        preferredType = 'BUS';
      } else if (totalStudents >= 2) {
        preferredType = 'BUGGY';
      }

      // Find best matching idle vehicle by capacity and type
      let assignedVehicle = idleVehicles.find(v => v.type === preferredType && v.capacity >= totalStudents);
      if (!assignedVehicle) {
        assignedVehicle = idleVehicles.find(v => v.capacity >= totalStudents) || idleVehicles[idleVehicles.length - 1];
      }
      if (!assignedVehicle) {
        assignedVehicle = idleVehicles[0];
      }

      console.log(`✅ Selected Vehicle #${assignedVehicle.id} (${assignedVehicle.type}, Cap: ${assignedVehicle.capacity}) for ${totalStudents} students`);

      // 3. Build multi-stop combined route: Pickups first, then Dropoffs
      const newRoute = [];
      const rideIds = [];

      // Add Pickups
      currentBatch.forEach(req => {
        const rideId = req.id || req.ride_id;
        rideIds.push(rideId);
        const pickupLoc = req.pickup || req.pickup_location;
        newRoute.push({
          location: pickupLoc,
          riderId: rideId,
          studentId: req.student_id,
          type: 'PICKUP',
          passengerChange: 1
        });
      });

      // Add Drops
      currentBatch.forEach(req => {
        const rideId = req.id || req.ride_id;
        const dropLoc = req.dropoff || req.dropoff_location;
        newRoute.push({
          location: dropLoc,
          riderId: rideId,
          studentId: req.student_id,
          type: 'DROP',
          passengerChange: -1
        });
      });

      // Extract unique ordered stop names for Driver Map & StopList timeline
      const orderedStops = [];
      newRoute.forEach(s => {
        if (!orderedStops.includes(s.location)) {
          orderedStops.push(s.location);
        }
      });

      // 4. Update vehicle state in DB to ON_TRIP and set its full route
      await dbService.updateVehicleRoute(
        assignedVehicle.id,
        rideIds,
        newRoute,
        'ON_TRIP'
      );

      // 5. Notify Driver via WebSockets (broadcast to vehicle room AND global channel)
      if (this.io) {
        const routePayload = {
          vehicleId: assignedVehicle.id,
          newRoute: newRoute,
          orderedStops: orderedStops,
          vehicleType: assignedVehicle.type,
          vehicleNumber: assignedVehicle.vehicle_number,
          totalStudents,
          message: `New Batch Assigned! ${totalStudents} student(s) scheduled across ${orderedStops.length} campus stops.`
        };

        this.io.to(`vehicle_${assignedVehicle.id}`).emit('route_updated', routePayload);
        this.io.emit('route_updated', routePayload);

        // Broadcast to general fleet channel
        this.io.emit('fleet_updated', {
          vehicleId: assignedVehicle.id,
          state: 'ON_TRIP',
          currentRoute: newRoute
        });

        // 6. Notify each student simultaneously that their bus is coming!
        for (const req of currentBatch) {
          const rideId = req.id || req.ride_id;
          const studentPayload = {
            status: 'ASSIGNED',
            vehicleId: assignedVehicle.id,
            vehicleType: assignedVehicle.type,
            vehicleNumber: assignedVehicle.vehicle_number,
            pickup: req.pickup || req.pickup_location,
            dropoff: req.dropoff || req.dropoff_location,
            etaMins: 3,
            message: `Your bus is coming! Vehicle ${assignedVehicle.vehicle_number} (${assignedVehicle.type}) is en route to pick you up.`
          };

          this.io.emit(`ride_status_${rideId}`, studentPayload);

          if (req.student_id) {
            this.io.to(`student_${req.student_id}`).emit('ride_status_update', studentPayload);
          }
        }
      }

    } catch (err) {
      console.error('❌ Batch dispatch processing failed:', err);
    }
  }
}

module.exports = new BatchManager(30);