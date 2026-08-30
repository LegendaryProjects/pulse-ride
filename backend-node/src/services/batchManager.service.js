const { calculateOptimizedRoute } = require('./cppEngine');
const dbService = require('./db.service');

class BatchManager {
  constructor(batchWindowMs = 5000) {
    this.batchWindowMs = batchWindowMs;
    this.pendingQueue = [];
    this.timer = null;
  }

  addRequest(rideRequest, io) {
    this.pendingQueue.push(rideRequest);

    if (!this.timer) {
      this.timer = setTimeout(() => this.processBatch(io), this.batchWindowMs);
    }
  }

  async processBatch(io) {
    this.timer = null;
    if (this.pendingQueue.length === 0) return;

    const currentBatch = [...this.pendingQueue];
    this.pendingQueue = [];

    try {
      const activeFleet = await dbService.getActiveFleet();

      // Send the batch of requests and active fleet to the C++ engine
      const payload = {
        requests: currentBatch,
        fleetState: activeFleet,
      };

      const optimizationResults = await calculateOptimizedRoute(payload);

      // Process assignments returned by C++ engine
      for (const assignment of optimizationResults.assignments) {
        await dbService.updateVehicleRoute(
          assignment.vehicleId,
          assignment.rideId,
          assignment.updatedRoute
        );

        // Notify assigned vehicle/driver
        io.to(`vehicle_${assignment.vehicleId}`).emit('route_updated', {
          vehicleId: assignment.vehicleId,
          newRoute: assignment.updatedRoute,
          explanation: assignment.explanation,
        });

        // Notify rider
        io.emit(`ride_status_${assignment.rideId}`, {
          status: 'ASSIGNED',
          vehicleId: assignment.vehicleId,
          etaMins: assignment.etaMins,
        });
      }
    } catch (err) {
      console.error('Batch processing failed:', err);
    }
  }
}

module.exports = new BatchManager();