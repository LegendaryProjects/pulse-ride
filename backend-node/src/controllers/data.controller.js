const db = require('../db');

// --- 1. ETA & Distance Helper Functions ---

// Calculates travel time per hop based on vehicle speed
const calculateHopTime = (distanceMeters, speedKmh = 20) => {
  if (!distanceMeters || distanceMeters <= 0) return 0;
  // (distance / (speed * 1000 / 60)) = minutes
  const timeMins = (distanceMeters * 0.06) / speedKmh;
  return parseFloat(timeMins.toFixed(1));
};

// Enriches the route sequence with distances and dynamic ETAs
const enrichRouteWithDistancesAndETA = async (routeNodes, vehicleCurrentNode, vehicleSpeedKmh = 20) => {
  const enrichedRoute = [];
  let cumulativeDistance = 0;
  let cumulativeTimeMins = 0;

  // Track the journey starting from vehicle's current position
  let startNode = vehicleCurrentNode;

  for (let i = 0; i < routeNodes.length; i++) {
    const currentNode = routeNodes[i];
    const source = (i === 0) ? startNode : routeNodes[i - 1].id;
    const destination = currentNode.id;

    let hopDistance = 0;
    if (source && destination && source !== destination) {
      const distRes = await db.query(
        `SELECT distance_meters FROM node_distances 
         WHERE source_node = $1 AND destination_node = $2`,
        [source, destination]
      );
      if (distRes.rows.length > 0) {
        hopDistance = parseFloat(distRes.rows[0].distance_meters);
      }
    }

    const hopTime = calculateHopTime(hopDistance, vehicleSpeedKmh);
    const stopDwellTime = 0.5; // 30s buffer per stop for student boarding/deboarding

    cumulativeDistance += hopDistance;
    cumulativeTimeMins += (hopTime + stopDwellTime);

    enrichedRoute.push({
      ...currentNode,
      distanceFromPrevMeters: hopDistance,
      timeFromPrevMins: hopTime,
      cumulativeDistanceMeters: Math.round(cumulativeDistance),
      etaMins: parseFloat(cumulativeTimeMins.toFixed(1))
    });
  }

  return enrichedRoute;
};

// --- 2. Existing Map Endpoints ---

const getCampusNodes = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM campus_nodes ORDER BY id ASC');
    res.json({ success: true, nodes: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campus map data' });
  }
};

const getLiveFleet = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT v.id, v.type, v.capacity, v.state, v.current_route, 
             c.name as location_name, c.latitude, c.longitude
      FROM vehicles v
      LEFT JOIN campus_nodes c ON v.current_location = c.id
    `);
    res.json({ success: true, fleet: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fleet status' });
  }
};

// --- 3. Updated Ride Status Endpoint with ETA ---

const getRideStatus = async (req, res) => {
  try {
    const { rideId } = req.params;

    const result = await db.query(`
      SELECT 
        r.id as "rideId",
        r.status,
        r.pickup_location,
        r.dropoff_location,
        v.id as "vehicleId",
        v.type as "vehicleType",
        v.avg_speed_kmh,
        v.current_location as "vehicleCurrentNode",
        v.current_route
      FROM ride_requests r
      LEFT JOIN vehicles v ON r.assigned_vehicle_id = v.id
      WHERE r.id = $1
    `, [rideId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    const ride = result.rows[0];
    const speed = parseFloat(ride.avg_speed_kmh) || 20.0;
    const currentRoute = ride.current_route || [];

    const rawRouteNodes = currentRoute.map(stop => ({
      id: stop.location,
      name: `Node ${stop.location}`,
      type: stop.type,
      riderId: stop.riderId
    }));

    const enrichedRoute = await enrichRouteWithDistancesAndETA(
      rawRouteNodes,
      ride.vehicleCurrentNode,
      speed
    );

    // Find the specific stop relevant to the current rider
    const targetNode = ride.status === 'ASSIGNED' ? ride.pickup_location : ride.dropoff_location;
    const targetStop = enrichedRoute.find(s => s.id === targetNode);

    res.json({
      success: true,
      rideId: ride.rideId,
      status: ride.status,
      vehicleId: ride.vehicleId,
      vehicleSpeedKmh: speed,
      vehicleCurrentNode: ride.vehicleCurrentNode,
      estimatedArrivalMins: targetStop ? targetStop.etaMins : 0,
      routeNodes: enrichedRoute
    });

  } catch (error) {
    console.error('Error calculating ride ETA:', error.message);
    res.status(500).json({ error: 'Failed to calculate expected time' });
  }
};

module.exports = { getCampusNodes, getLiveFleet, getRideStatus };