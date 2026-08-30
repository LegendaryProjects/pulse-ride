const express = require('express');
const {
  requestRide,
  scanQR,
  cancelRide,
  getStudentActiveRide,
  getBatchStatus,
  forceDispatchBatch
} = require('../controllers/ride.controller');
const {
  toggleJobStatus,
  reachStop,
  completeStop,
  getDriverVehicleState
} = require('../controllers/vehicle.controller');
const {
  getCampusNodes,
  getLiveFleet,
  getRideStatus,
  getHotspotPredictions
} = require('../controllers/data.controller');
const authRoutes = require('./auth.routes');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// 1. Public Endpoints
router.use('/auth', authRoutes);
router.get('/health', (req, res) => res.json({ status: 'Backend is fully operational', timestamp: new Date().toISOString() }));
router.get('/map/nodes', getCampusNodes);
router.get('/fleet/live', getLiveFleet);
router.get('/ride/batch-status', getBatchStatus);
router.post('/ride/force-dispatch', forceDispatchBatch);
router.get('/ride/:rideId', getRideStatus);
router.get('/ml/hotspots', getHotspotPredictions);

// 2. Protected Routes (JWT Required)
router.use(verifyToken);

// Student Endpoints
router.post('/ride/request', requireRole('STUDENT'), requestRide);
router.get('/ride/student/active', requireRole('STUDENT'), getStudentActiveRide);
router.post('/ride/cancel', requireRole('STUDENT'), cancelRide);
router.post('/ride/scan-qr', scanQR); // Accessible by both student and driver

// Driver Endpoints
router.get('/driver/vehicle', requireRole('DRIVER'), getDriverVehicleState);
router.post('/vehicle/toggle-status', requireRole('DRIVER'), toggleJobStatus);
router.post('/vehicle/reach-stop', requireRole('DRIVER'), reachStop);
router.post('/vehicle/complete-stop', requireRole('DRIVER'), completeStop);

module.exports = router;