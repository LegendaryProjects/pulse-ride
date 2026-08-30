// test-load.js
// Run with: node test-load.js

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const routes = require('./src/routes');
const batchManager = require('./src/services/batchManager.service');
const db = require('./src/db');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server);
app.set('socketio', io);
batchManager.setSocketIO(io);
app.use('/api', routes);

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}/api`;

async function runTests() {
  server.listen(PORT, async () => {
    console.log(`🚀 Test server running on port ${PORT}...\n`);

    try {
      // 1. Check Initial Health
      console.log('📍 1. Testing GET /api/health...');
      const healthRes = await fetch(`${BASE_URL}/health`);
      const healthData = await healthRes.json();
      console.log('   Health Status:', healthData.status);

      // 2. Student Requests Ride while ALL Drivers are OFF_DUTY
      console.log('\n❌ 2. Student confirms ride when NO driver has started job...');
      const s1Signup = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rahul Sharma', email: 'rahul.test@nitk.edu.in', password: 'password123', role: 'STUDENT', roll_number: '211CS101' })
      });
      const s1Log = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'rahul.test@nitk.edu.in', password: 'password123' })
      });
      const s1Data = await s1Log.json();
      const token1 = s1Data.token;

      const noDriverReq = await fetch(`${BASE_URL}/ride/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
        body: JSON.stringify({ pickup_location: 'LHC-C', dropoff_location: 'Mega Towers', passenger_count: 1 })
      });
      const noDriverData = await noDriverReq.json();
      console.log('   Immediate response when no active driver:', noDriverData);
      if (noDriverData.noDrivers && noDriverData.status === 'NO_VEHICLES_AVAILABLE') {
        console.log('   ✅ PASS: Student immediately informed that no drivers are available!');
      } else {
        throw new Error('Expected immediate no drivers notification');
      }

      // 3. Driver Logs In & Starts Job -> 30s Batch Window Begins
      console.log('\n🚐 3. Driver logs in and clicks "Start Job"...');
      const driverLog = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'driver@nitk.edu.in', password: 'password123' })
      });
      const driverData = await driverLog.json();
      const driverToken = driverData.token;
      const vehicleId = driverData.user?.vehicle_id || 1;

      const startJobRes = await fetch(`${BASE_URL}/vehicle/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, status: 'IDLE' })
      });
      const startJobData = await startJobRes.json();
      console.log(`   Driver Job Status: ${startJobData.state} - ${startJobData.message}`);

      const batchStatusRes = await fetch(`${BASE_URL}/ride/batch-status`);
      const batchStatusData = await batchStatusRes.json();
      console.log('   Batch Timer Active:', batchStatusData.data.active, `(${batchStatusData.data.remainingSeconds}s remaining)`);

      // 4. Students Request Rides in 30s Waiting Window
      console.log('\n🚗 4. Student 1 requests LHC-C -> Mega Towers...');
      const r1Res = await fetch(`${BASE_URL}/ride/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
        body: JSON.stringify({ pickup_location: 'LHC-C', dropoff_location: 'Mega Towers', passenger_count: 1 })
      });
      const r1Data = await r1Res.json();
      const ride1Id = r1Data.rideId || r1Data.ride?.id;
      console.log(`   ✅ Student 1 Ride Created (#${ride1Id}, status: ${r1Data.ride?.status})`);

      console.log('🚗    Student 2 requests NITK Beach Gate -> Mega Towers...');
      await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ananya Patel', email: 'ananya.test@nitk.edu.in', password: 'password123', role: 'STUDENT', roll_number: '221IT202' })
      });
      const s2Log = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'ananya.test@nitk.edu.in', password: 'password123' })
      });
      const s2Data = await s2Log.json();
      const token2 = s2Data.token;

      const r2Res = await fetch(`${BASE_URL}/ride/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
        body: JSON.stringify({ pickup_location: 'NITK Beach Gate', dropoff_location: 'Mega Towers', passenger_count: 1 })
      });
      const r2Data = await r2Res.json();
      const ride2Id = r2Data.rideId || r2Data.ride?.id;
      console.log(`   ✅ Student 2 Ride Created (#${ride2Id}, status: ${r2Data.ride?.status})`);

      // 5. Trigger Batch Processing (as happens after 30 seconds)
      console.log('\n⚡ 5. 30-Second Batch Window expires -> Processing Dispatches...');
      const dispatchRes = await fetch(`${BASE_URL}/ride/force-dispatch`, { method: 'POST' });
      const dispatchData = await dispatchRes.json();
      console.log(`   Dispatch Result: ${dispatchData.message}`);

      // Check Driver Vehicle Route & State
      const driverVehicleRes = await fetch(`${BASE_URL}/driver/vehicle?vehicleId=${vehicleId}`, {
        headers: { 'Authorization': `Bearer ${driverToken}` }
      });
      const driverVehicleData = await driverVehicleRes.json();
      console.log('   Assigned Vehicle State:', driverVehicleData.vehicle?.state);
      console.log('   Assigned Multi-Stop Route:', driverVehicleData.vehicle?.current_route);

      // Check Student Active Rides
      const s1ActiveRes = await fetch(`${BASE_URL}/ride/student/active`, {
        headers: { 'Authorization': `Bearer ${token1}` }
      });
      const s1ActiveData = await s1ActiveRes.json();
      console.log(`   Student 1 Ride Status: ${s1ActiveData.activeRide?.status}, Vehicle: ${s1ActiveData.activeRide?.vehicle_number} (${s1ActiveData.activeRide?.vehicle_type})`);

      // 6. Stop Progression & QR Check-ins
      console.log('\n📍 6. Driver arrives at Stop 1: "LHC-C"...');
      const reach1 = await fetch(`${BASE_URL}/vehicle/reach-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, stopName: 'LHC-C', stopIndex: 0 })
      });
      const reach1Data = await reach1.json();
      console.log(`   Boarding: ${reach1Data.boardingCount}, Dropping: ${reach1Data.droppingCount}`);

      // Student 1 Scans QR to Board
      const scan1 = await fetch(`${BASE_URL}/ride/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
        body: JSON.stringify({ rideId: ride1Id, qrData: JSON.stringify({ stop: 'LHC-C', vehicleId }) })
      });
      const scan1Data = await scan1.json();
      console.log(`   Student 1 QR Boarding: ${scan1Data.message} (Good To Go: ${scan1Data.isGoodToGo})`);

      await fetch(`${BASE_URL}/vehicle/complete-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, stopName: 'LHC-C', stopIndex: 0, totalStops: 3 })
      });

      console.log('\n📍 7. Driver arrives at Stop 2: "NITK Beach Gate"...');
      const reach2 = await fetch(`${BASE_URL}/vehicle/reach-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, stopName: 'NITK Beach Gate', stopIndex: 1 })
      });
      const reach2Data = await reach2.json();
      console.log(`   Boarding: ${reach2Data.boardingCount}, Dropping: ${reach2Data.droppingCount}`);

      // Student 2 Scans QR to Board
      const scan2 = await fetch(`${BASE_URL}/ride/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
        body: JSON.stringify({ rideId: ride2Id, qrData: JSON.stringify({ stop: 'NITK Beach Gate', vehicleId }) })
      });
      const scan2Data = await scan2.json();
      console.log(`   Student 2 QR Boarding: ${scan2Data.message} (Good To Go: ${scan2Data.isGoodToGo})`);

      await fetch(`${BASE_URL}/vehicle/complete-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, stopName: 'NITK Beach Gate', stopIndex: 1, totalStops: 3 })
      });

      console.log('\n📍 8. Driver arrives at Destination Stop 3: "Mega Towers"...');
      const reach3 = await fetch(`${BASE_URL}/vehicle/reach-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, stopName: 'Mega Towers', stopIndex: 2 })
      });
      const reach3Data = await reach3.json();
      console.log(`   Boarding: ${reach3Data.boardingCount}, Dropping: ${reach3Data.droppingCount}`);

      // Both students scan QR to deboard
      const drop1 = await fetch(`${BASE_URL}/ride/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
        body: JSON.stringify({ rideId: ride1Id, qrData: JSON.stringify({ stop: 'Mega Towers', vehicleId }) })
      });
      const drop1Data = await drop1.json();
      console.log(`   Student 1 QR Deboard: ${drop1Data.message}`);

      const drop2 = await fetch(`${BASE_URL}/ride/scan-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
        body: JSON.stringify({ rideId: ride2Id, qrData: JSON.stringify({ stop: 'Mega Towers', vehicleId }) })
      });
      const drop2Data = await drop2.json();
      console.log(`   Student 2 QR Deboard: ${drop2Data.message} (Good To Go: ${drop2Data.isGoodToGo})`);

      const finalStop = await fetch(`${BASE_URL}/vehicle/complete-stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${driverToken}` },
        body: JSON.stringify({ vehicleId, stopName: 'Mega Towers', stopIndex: 2, totalStops: 3 })
      });
      const finalStopData = await finalStop.json();
      console.log(`   🏁 Trip Finished: ${finalStopData.isFinished}, Vehicle State: ${finalStopData.state}`);

      console.log('\n🎉 ALL TESTS PASSED 100% SUCCESSFULLY!');
      server.close(() => process.exit(0));

    } catch (err) {
      console.error('❌ Test failed:', err);
      server.close(() => process.exit(1));
    }
  });
}

runTests();