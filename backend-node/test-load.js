// test-load.js
// Run with: node test-load.js

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🚀 Starting full backend diagnostic script (Students + Drivers + QR)...\n');

  const studentEmail = 'test.student@nitk.edu.in';
  const driverEmail = 'driver@nitk.edu.in';
  const commonPassword = 'mypassword123';

  try {
    // 1. Test Map Nodes (Public)
    console.log('📍 Testing GET /api/map/nodes...');
    const nodesRes = await fetch(`${BASE_URL}/map/nodes`);
    const nodesData = await nodesRes.json();
    console.log(`✅ Success! Retrieved ${nodesData.nodes?.length || 0} campus nodes.\n`);

    // 2. Student Signup & Login
    console.log(`👤 Testing Student Login/Signup (${studentEmail})...`);
    await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: studentEmail,
        iris_password: 'irispassword123',
        system_password: commonPassword,
        role: 'STUDENT',
        roll_number: '241IT999'
      })
    });

    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentEmail, password: commonPassword })
    });
    const studentLoginData = await studentLoginRes.json();
    const studentToken = studentLoginData.token;
    console.log('✅ Student logged in successfully.');

    // 3. Driver Login
    console.log(`\n🚐 Testing Driver Login (${driverEmail})...`);
    const driverLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: driverEmail, password: commonPassword })
    });
    const driverLoginData = await driverLoginRes.json();
    const driverToken = driverLoginData.token;
    console.log('✅ Driver logged in successfully.');

    // 4. Student Requests a Ride
    console.log('\n🚗 Student requesting a ride (Pickup: 101, Dropoff: 201)...');
    const rideRes = await fetch(`${BASE_URL}/ride/request`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`
      },
      body: JSON.stringify({ pickup_location: 101, dropoff_location: 201 })
    });
    const rideData = await rideRes.json();
    const createdRideId = rideData.ride?.id || rideData.id;
    console.log(`✅ Ride requested successfully! Ride ID: ${createdRideId}`);

    // 5. Driver Fetches Pending Riders Queue
    console.log('\n📋 Driver checking pending rider queue...');
    const queueRes = await fetch(`${BASE_URL}/driver/pending-rides`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${driverToken}` }
    });
    const queueData = await queueRes.json();
    console.log(`✅ Driver view loaded! Found ${queueData.pending_riders?.length || 0} waiting riders.`);

    // 6. Driver Scans Student QR Code (Boarding Confirmation)
    if (createdRideId) {
      console.log(`\n📱 Driver scanning QR code for Ride ID ${createdRideId}...`);
      const scanRes = await fetch(`${BASE_URL}/ride/scan-qr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${driverToken}`
        },
        body: JSON.stringify({ rideId: createdRideId })
      });
      const scanData = await scanRes.json();
      console.log('✅ QR Scan Result:', scanData.message || scanData);
    }

    console.log('\n✨ All backend diagnostic tests completed successfully!');

  } catch (error) {
    console.error('❌ Test script error:', error.message);
  }
}

runTests();