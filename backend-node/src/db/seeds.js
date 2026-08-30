// backend-node/src/db/seeds.js
const NITK_CAMPUS_NODES = [
  { id: 1, name: "LHC-C", latitude: 13.010337, longitude: 74.792607 },
  { id: 2, name: "LHC-D", latitude: 13.009123, longitude: 74.793401 },
  { id: 3, name: "Girls Coop", latitude: 13.0126698, longitude: 74.7964869 },
  { id: 4, name: "Girls Hostel", latitude: 13.0129498, longitude: 74.7942945 },
  { id: 5, name: "Mega Towers", latitude: 13.0067591, longitude: 74.7945026 },
  { id: 6, name: "Karavali Hostel", latitude: 13.007962, longitude: 74.796963 },
  { id: 7, name: "NITK Beach Gate", latitude: 13.014104, longitude: 74.788171 },
  { id: 8, name: "Main Library", latitude: 13.010084, longitude: 74.794165 },
  { id: 9, name: "Adke Circle", latitude: 13.009133, longitude: 74.796558 },
  { id: 10, name: "Guest House", latitude: 13.012395, longitude: 74.791805 }
];

const SEED_VEHICLES = [
  {
    id: 1,
    type: "BUS",
    capacity: 15,
    vehicle_number: "KA-19-NITK-001",
    current_location: 1, // LHC-C
    state: "OFF_DUTY",
    current_route: [],
    avg_speed_kmh: 20.0
  },
  {
    id: 2,
    type: "BUGGY",
    capacity: 4,
    vehicle_number: "KA-19-NITK-002",
    current_location: 5, // Mega Towers
    state: "OFF_DUTY",
    current_route: [],
    avg_speed_kmh: 15.0
  },
  {
    id: 3,
    type: "TWO_WHEELER",
    capacity: 1,
    vehicle_number: "KA-19-NITK-003",
    current_location: 8, // Main Library
    state: "OFF_DUTY",
    current_route: [],
    avg_speed_kmh: 25.0
  },
  {
    id: 4,
    type: "BUGGY",
    capacity: 4,
    vehicle_number: "KA-19-NITK-004",
    current_location: 4, // Girls Hostel
    state: "OFF_DUTY",
    current_route: [],
    avg_speed_kmh: 15.0
  },
  {
    id: 5,
    type: "BUS",
    capacity: 20,
    vehicle_number: "KA-19-NITK-005",
    current_location: 7, // NITK Beach Gate
    state: "OFF_DUTY",
    current_route: [],
    avg_speed_kmh: 20.0
  }
];

const SEED_USERS = [
  {
    id: 1,
    name: "Rahul Sharma",
    email: "rahul.211cs123@nitk.edu.in",
    role: "STUDENT",
    roll_number: "211CS123",
    driver_id: null,
    vehicle_id: null
  },
  {
    id: 2,
    name: "Ananya Patel",
    email: "ananya.221it105@nitk.edu.in",
    role: "STUDENT",
    roll_number: "221IT105",
    driver_id: null,
    vehicle_id: null
  },
  {
    id: 3,
    name: "Demo Student",
    email: "student@nitk.edu.in",
    role: "STUDENT",
    roll_number: "221CS999",
    driver_id: null,
    vehicle_id: null
  },
  {
    id: 4,
    name: "Ramesh Kumar",
    email: "ramesh.driver@nitk.edu.in",
    role: "DRIVER",
    roll_number: null,
    driver_id: "DRV-NITK-042",
    vehicle_id: 1
  },
  {
    id: 5,
    name: "Demo Driver",
    email: "driver@nitk.edu.in",
    role: "DRIVER",
    roll_number: null,
    driver_id: "DRV-DEMO-001",
    vehicle_id: 1
  },
  {
    id: 6,
    name: "Suresh Gowda",
    email: "suresh.driver@nitk.edu.in",
    role: "DRIVER",
    roll_number: null,
    driver_id: "DRV-NITK-088",
    vehicle_id: 2
  }
];

module.exports = {
  NITK_CAMPUS_NODES,
  SEED_VEHICLES,
  SEED_USERS
};
