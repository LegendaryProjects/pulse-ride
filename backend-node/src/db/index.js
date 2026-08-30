const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { NITK_CAMPUS_NODES, SEED_VEHICLES, SEED_USERS } = require('./seeds');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let pool = null;
let useInMemory = false;

// In-Memory Database Store (Fallback when PostgreSQL is not configured or fails)
const inMemoryStore = {
  users: [],
  vehicles: [],
  campus_nodes: [],
  ride_requests: [],
  iris_credentials: [],
  notifications: [],
  ml_demand_history: [],
  seq: { users: 10, vehicles: 10, campus_nodes: 20, ride_requests: 100, notifications: 10 }
};

// Seed initial in-memory data
const seedInMemoryDatabase = async () => {
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  
  // 1. Campus Nodes
  inMemoryStore.campus_nodes = NITK_CAMPUS_NODES.map(n => ({ ...n }));

  // 2. Vehicles
  inMemoryStore.vehicles = SEED_VEHICLES.map(v => ({
    ...v,
    current_route: []
  }));

  // 3. Users & IRIS credentials
  inMemoryStore.users = SEED_USERS.map(u => ({
    ...u,
    password_hash: defaultPasswordHash,
    penalty_count: 0,
    is_blocked: false,
    blocked_until: null,
    created_at: new Date().toISOString()
  }));

  inMemoryStore.iris_credentials = SEED_USERS.map(u => ({
    email: u.email,
    password_hash: defaultPasswordHash
  }));

  console.log('✅ In-memory database initialized with seed vehicles, nodes, and demo users.');
};

// In-memory SQL query simulator for seamless zero-config operation
const queryInMemory = async (text, params = []) => {
  const sql = text.trim();
  const lower = sql.toLowerCase();

  // 1. CAMPUS NODES
  if (lower.startsWith('select * from campus_nodes')) {
    const nodes = [...inMemoryStore.campus_nodes].sort((a, b) => a.id - b.id);
    return { rows: nodes };
  }

  // 2. FLEET / VEHICLES
  // 2a. Vehicle with Campus Node join by ID: SELECT v.*, c.name ... FROM vehicles v LEFT JOIN campus_nodes c ... WHERE v.id = $1
  if (lower.includes('from vehicles v') && lower.includes('join campus_nodes') && lower.includes('where v.id = $1')) {
    const vId = Number(params[0]);
    const v = inMemoryStore.vehicles.find(item => item.id === vId);
    if (!v) return { rows: [] };
    const node = inMemoryStore.campus_nodes.find(n => n.id === v.current_location);
    return {
      rows: [{
        ...v,
        location_name: node ? node.name : `Node ${v.current_location}`,
        latitude: node ? node.latitude : 13.0115,
        longitude: node ? node.longitude : 74.7940
      }]
    };
  }

  // 2b. All vehicles with campus nodes join
  if (lower.includes('from vehicles') && (lower.includes('left join campus_nodes') || lower.includes('select v.'))) {
    const rows = inMemoryStore.vehicles.map(v => {
      const node = inMemoryStore.campus_nodes.find(n => n.id === v.current_location);
      return {
        id: v.id,
        type: v.type,
        capacity: v.capacity,
        state: v.state,
        current_location: v.current_location,
        vehicle_number: v.vehicle_number,
        current_route: v.current_route || [],
        location_name: node ? node.name : `Node ${v.current_location}`,
        latitude: node ? node.latitude : 13.0115,
        longitude: node ? node.longitude : 74.7940
      };
    });
    return { rows };
  }

  // 2c. Vehicles with state IN ('IDLE', 'ON_TRIP', ...)
  if (lower.includes('from vehicles') && lower.includes('state in')) {
    // Extract states from sql string
    const match = sql.match(/state\s+in\s*\(([^)]+)\)/i);
    let allowedStates = ['IDLE', 'ON_TRIP'];
    if (match && match[1]) {
      allowedStates = match[1].split(',').map(s => s.trim().replace(/['"]/g, '').toUpperCase());
    }
    const rows = inMemoryStore.vehicles.filter(v => allowedStates.includes(v.state.toUpperCase()));
    return { rows };
  }

  // 2d. Vehicles with state = 'IDLE' or specific state
  if (lower.includes('from vehicles') && (lower.includes("state = 'idle'") || lower.includes('state = "idle"'))) {
    const rows = inMemoryStore.vehicles
      .filter(v => v.state === 'IDLE')
      .sort((a, b) => (a.capacity || 0) - (b.capacity || 0));
    return { rows };
  }

  // 2e. Vehicles list with active passengers count
  if (lower.startsWith('select id, type, capacity') && lower.includes('from vehicles')) {
    const available = inMemoryStore.vehicles.filter(v => ['IDLE', 'ON_TRIP', 'RETURNING', 'OFF_DUTY'].includes(v.state));
    const rows = available.map(v => ({
      ...v,
      active_passengers: (Array.isArray(v.current_route) ? v.current_route : []).filter(s => s.type === 'PICKUP').length
    }));
    return { rows };
  }

  // 2f. Vehicle by ID
  if (lower.includes('from vehicles where id = $1') || lower.includes('from vehicles where id = $1') || lower.startsWith('select current_route from vehicles where id = $1') || lower.startsWith('select * from vehicles where id = $1')) {
    const vId = Number(params[0]);
    const vehicle = inMemoryStore.vehicles.find(v => v.id === vId);
    return { rows: vehicle ? [{ ...vehicle }] : [] };
  }

  // 2g. Update Vehicle State
  if (lower.startsWith('update vehicles set state = $1 where id = $2')) {
    const [state, vId] = params;
    const v = inMemoryStore.vehicles.find(item => item.id === Number(vId));
    if (v) v.state = state;
    return { rows: v ? [{ ...v }] : [] };
  }

  // 2h. Update Vehicle Route & State
  if (lower.startsWith('update vehicles set current_route = $1') || lower.startsWith('update vehicles set current_route = $1::jsonb')) {
    let route = params[0];
    if (typeof route === 'string') {
      try { route = JSON.parse(route); } catch (e) {}
    }
    if (lower.includes('state = $2')) {
      const state = params[1];
      const vId = Number(params[2]);
      const v = inMemoryStore.vehicles.find(item => item.id === vId);
      if (v) {
        v.current_route = Array.isArray(route) ? route : [];
        v.state = state;
      }
      return { rows: v ? [{ ...v }] : [] };
    } else {
      const vId = Number(params[1]);
      const v = inMemoryStore.vehicles.find(item => item.id === vId);
      if (v) v.current_route = Array.isArray(route) ? route : [];
      return { rows: v ? [{ ...v }] : [] };
    }
  }

  // 3. USERS & AUTH
  if (lower.startsWith('select * from users where email = $1')) {
    const user = inMemoryStore.users.find(u => u.email.toLowerCase() === String(params[0]).toLowerCase());
    return { rows: user ? [{ ...user }] : [] };
  }

  if (lower.startsWith('select * from users where id = $1') || lower.includes('from users where id = $1')) {
    const user = inMemoryStore.users.find(u => u.id === Number(params[0]));
    return { rows: user ? [{ ...user }] : [] };
  }

  if (lower.startsWith('select * from iris_credentials where email = $1')) {
    const cred = inMemoryStore.iris_credentials.find(c => c.email.toLowerCase() === String(params[0]).toLowerCase());
    return { rows: cred ? [{ ...cred }] : [] };
  }

  if (lower.startsWith('insert into users')) {
    const id = ++inMemoryStore.seq.users;
    const newUser = {
      id,
      name: params[0],
      email: params[1],
      password_hash: params[2],
      role: params[3] || 'STUDENT',
      roll_number: params[4] || null,
      driver_id: params[5] || null,
      vehicle_id: params[6] || null,
      penalty_count: 0,
      is_blocked: false,
      blocked_until: null,
      created_at: new Date().toISOString()
    };
    inMemoryStore.users.push(newUser);
    return { rows: [newUser] };
  }

  if (lower.startsWith('update users set')) {
    const user = inMemoryStore.users.find(u => u.id === Number(params[params.length - 1]));
    if (user) {
      if (lower.includes('penalty_count')) {
        user.penalty_count = params[0];
        user.last_penalty_date = params[1];
        user.is_blocked = params[2];
        user.blocked_until = params[3];
      }
    }
    return { rows: user ? [user] : [] };
  }

  // 4. RIDE REQUESTS
  if (lower.startsWith('insert into ride_requests')) {
    const id = ++inMemoryStore.seq.ride_requests;
    const newRide = {
      id,
      student_id: params[0],
      pickup_location: params[1],
      dropoff_location: params[2],
      passenger_count: params[3] || 1,
      status: 'REQUESTED',
      assigned_vehicle_id: null,
      request_time: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    inMemoryStore.ride_requests.push(newRide);
    return { rows: [newRide] };
  }

  // 4a. Student active ride lookup: SELECT r.*, v.type as vehicle_type... FROM ride_requests r LEFT JOIN vehicles v ...
  if (lower.includes('from ride_requests r') && lower.includes('left join vehicles v') && lower.includes('r.student_id = $1')) {
    const studentId = Number(params[0]);
    const allowedStatuses = ['REQUESTED', 'ASSIGNED', 'PICKED_UP'];
    const matching = inMemoryStore.ride_requests
      .filter(r => r.student_id === studentId && allowedStatuses.includes(r.status))
      .sort((a, b) => b.id - a.id);

    if (matching.length === 0) return { rows: [] };
    const latestRide = matching[0];
    const assignedVehicle = latestRide.assigned_vehicle_id 
      ? inMemoryStore.vehicles.find(v => v.id === latestRide.assigned_vehicle_id) 
      : null;

    return {
      rows: [{
        ...latestRide,
        vehicle_type: assignedVehicle ? assignedVehicle.type : null,
        vehicle_number: assignedVehicle ? assignedVehicle.vehicle_number : null,
        capacity: assignedVehicle ? assignedVehicle.capacity : null
      }]
    };
  }

  // 4b. Single ride request status by rideId with vehicle details: SELECT r.id as "rideId" ... FROM ride_requests r LEFT JOIN vehicles v ... WHERE r.id = $1
  if (lower.includes('from ride_requests r') && lower.includes('left join vehicles v') && lower.includes('where r.id = $1')) {
    const rideId = Number(params[0]);
    const ride = inMemoryStore.ride_requests.find(r => r.id === rideId);
    if (!ride) return { rows: [] };

    const vehicle = ride.assigned_vehicle_id 
      ? inMemoryStore.vehicles.find(v => v.id === ride.assigned_vehicle_id)
      : null;

    return {
      rows: [{
        rideId: ride.id,
        status: ride.status,
        pickup_location: ride.pickup_location,
        dropoff_location: ride.dropoff_location,
        passenger_count: ride.passenger_count,
        vehicleId: vehicle ? vehicle.id : null,
        vehicleType: vehicle ? vehicle.type : null,
        vehicleNumber: vehicle ? vehicle.vehicle_number : null,
        currentRoute: vehicle ? (vehicle.current_route || []) : []
      }]
    };
  }

  // 4c. Select single ride by id: SELECT * FROM ride_requests WHERE id = $1
  if (lower.startsWith('select * from ride_requests where id = $1')) {
    const ride = inMemoryStore.ride_requests.find(r => r.id === Number(params[0]));
    return { rows: ride ? [{ ...ride }] : [] };
  }

  // 4d. Active ride id by student_id
  if (lower.includes('select id from ride_requests where student_id = $1')) {
    const studentId = Number(params[0]);
    const allowedStatuses = ['ASSIGNED', 'REQUESTED', 'PICKED_UP'];
    const matching = inMemoryStore.ride_requests
      .filter(r => r.student_id === studentId && allowedStatuses.includes(r.status))
      .sort((a, b) => b.id - a.id);
    return { rows: matching.length > 0 ? [{ id: matching[0].id }] : [] };
  }

  // 4e. Stop boarding and dropping lookup by assigned vehicle and stop location
  if (lower.includes('from ride_requests') && lower.includes('assigned_vehicle_id = $1')) {
    const vId = Number(params[0]);
    const stopLoc = String(params[1] || '').trim().toLowerCase();

    if (lower.includes('pickup_location = $2')) {
      const allowedStatuses = ['ASSIGNED', 'REQUESTED'];
      const rows = inMemoryStore.ride_requests.filter(r => 
        r.assigned_vehicle_id === vId && 
        String(r.pickup_location || '').trim().toLowerCase() === stopLoc &&
        allowedStatuses.includes(r.status)
      );
      return { rows };
    }

    if (lower.includes('dropoff_location = $2')) {
      const rows = inMemoryStore.ride_requests.filter(r => 
        r.assigned_vehicle_id === vId && 
        String(r.dropoff_location || '').trim().toLowerCase() === stopLoc &&
        r.status === 'PICKED_UP'
      );
      return { rows };
    }
  }

  // 4f. Any active ride id
  if (lower.includes('select id from ride_requests where status in')) {
    const allowedStatuses = ['ASSIGNED', 'REQUESTED', 'PICKED_UP'];
    const matching = inMemoryStore.ride_requests
      .filter(r => allowedStatuses.includes(r.status))
      .sort((a, b) => b.id - a.id);
    return { rows: matching.length > 0 ? [{ id: matching[0].id }] : [] };
  }

  // 4g. Pending ride requests with joined user info
  if (lower.includes('from ride_requests r') && lower.includes('join users u')) {
    const pending = inMemoryStore.ride_requests
      .filter(r => r.status === 'REQUESTED' || r.status === 'WAITING' || r.status === 'ASSIGNED')
      .map(r => {
        const student = inMemoryStore.users.find(u => u.id === r.student_id) || {};
        return {
          ride_id: r.id,
          id: r.id,
          pickup_location: r.pickup_location,
          dropoff_location: r.dropoff_location,
          passenger_count: r.passenger_count || 1,
          status: r.status,
          assigned_vehicle_id: r.assigned_vehicle_id,
          created_at: r.created_at,
          student_id: student.id,
          student_name: student.name,
          roll_number: student.roll_number,
          email: student.email
        };
      });
    return { rows: pending };
  }

  // 4f. Update ride request status: UPDATE ride_requests SET status = $1 WHERE id = $2
  if (lower.startsWith('update ride_requests set status = $1 where id = $2')) {
    const [status, id] = params;
    const ride = inMemoryStore.ride_requests.find(r => r.id === Number(id));
    if (ride) ride.status = status;
    return { rows: ride ? [{ ...ride }] : [] };
  }

  // 4g. Update ride request status & assigned_vehicle_id: UPDATE ride_requests SET status = $1, assigned_vehicle_id = $2 WHERE id = $3
  if (lower.startsWith('update ride_requests set status = $1') && lower.includes('assigned_vehicle_id = $2 where id = $3')) {
    const [status, vehicleId, rideId] = params;
    const ride = inMemoryStore.ride_requests.find(r => r.id === Number(rideId));
    if (ride) {
      ride.status = status || 'ASSIGNED';
      ride.assigned_vehicle_id = Number(vehicleId);
    }
    return { rows: ride ? [{ ...ride }] : [] };
  }

  // 4h. Cancel / No vehicle updates with hardcoded status: UPDATE ride_requests SET status = '...' WHERE id = $1
  if (lower.startsWith('update ride_requests set status =') && lower.includes('where id = $1')) {
    const id = Number(params[0]);
    const ride = inMemoryStore.ride_requests.find(r => r.id === id);
    if (ride) {
      if (lower.includes("'cancelled'")) ride.status = 'CANCELLED';
      else if (lower.includes("'no_vehicles_available'")) ride.status = 'NO_VEHICLES_AVAILABLE';
    }
    return { rows: ride ? [{ ...ride }] : [] };
  }

  // 5. ML DEMAND & NOTIFICATIONS
  if (lower.startsWith('insert into ml_demand_history')) {
    inMemoryStore.ml_demand_history.push({
      date: params[0],
      time: params[1],
      day: params[2],
      node: params[3],
      count: params[4]
    });
    return { rows: [{ success: true }] };
  }

  // Default fallback
  return { rows: [] };
};

// Initialize DB connection
if (process.env.DATABASE_URL) {
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    console.log('🔗 PostgreSQL pool created from DATABASE_URL.');
  } catch (err) {
    console.warn('⚠️ PostgreSQL initialization failed, falling back to In-Memory DB:', err.message);
    useInMemory = true;
  }
} else {
  console.log('ℹ️ No DATABASE_URL provided. Running with In-Memory Mock Database.');
  useInMemory = true;
}

// Pre-seed in-memory store immediately
seedInMemoryDatabase();

module.exports = {
  query: async (text, params) => {
    if (useInMemory || !pool) {
      return queryInMemory(text, params);
    }
    try {
      return await pool.query(text, params);
    } catch (dbErr) {
      console.warn('⚠️ PostgreSQL query failed, attempting In-Memory fallback:', dbErr.message);
      return queryInMemory(text, params);
    }
  },
  inMemoryStore
};