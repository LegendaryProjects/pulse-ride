const express = require('express');
const { requestRide, scanStudentQR, cancelRide, getDriverPendingRides } = require('../controllers/ride.controller');
const { completeStop, toggleJobStatus } = require('../controllers/vehicle.controller');
const { getCampusNodes, getLiveFleet, getRideStatus } = require('../controllers/data.controller');
const authRoutes = require('./auth.routes');
const { verifyToken, requireRole } = require('../middleware/auth.middleware');
const { validateStopRequest } = require('../middleware/validator.middleware');
const router = express.Router();

// Public Routes
router.use('/auth', authRoutes);
router.get('/health', (req, res) => res.json({ status: 'Backend is fully operational' }));

// Map & Data (Both Students and Drivers can view - Publicly accessible)
router.get('/map/nodes', getCampusNodes);
router.get('/fleet/live', getLiveFleet);
router.get('/ride/:rideId', getRideStatus);

// Protected Routes (Requires valid JWT below this line)
router.use(verifyToken);

// Student Actions
router.post('/ride/request', requireRole('STUDENT'), requestRide);
router.post('/ride/cancel', requireRole('STUDENT'), cancelRide);

// Driver Actions & Queue
router.get('/driver/pending-rides', requireRole('DRIVER'), getDriverPendingRides);
router.post('/ride/scan-qr', requireRole('DRIVER'), scanStudentQR);
router.post('/vehicle/complete-stop', requireRole('DRIVER'), validateStopRequest, completeStop);
router.post('/vehicle/toggle-status', requireRole('DRIVER'), toggleJobStatus);

module.exports = router;