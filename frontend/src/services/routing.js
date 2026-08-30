// frontend/src/services/routing.js

export const NITK_LOCATIONS = {
  "LHC-C": [13.010337, 74.792607],
  "LHC-D": [13.009123, 74.793401],
  "Girls Coop": [13.0126698, 74.7964869],
  "Girls Hostel": [13.0129498, 74.7942945],
  "Mega Towers": [13.0067591, 74.7945026],
  "Karavali Hostel": [13.007962, 74.796963],
  "NITK Beach Gate": [13.014104, 74.788171],
  "Main Library": [13.010084, 74.794165],
  "Adke Circle": [13.009133, 74.796558],
  "Guest House": [13.012395, 74.791805] 
};

// Roadway junction points on NITK campus for road snapping
const CAMPUS_JUNCTIONS = [
  [13.0108, 74.7950],
  [13.0109, 74.7942],
  [13.0117, 74.7938],
  [13.0112, 74.7925],
  [13.0126, 74.7933],
  [13.0088, 74.7936],
  [13.0100, 74.7930],
  [13.0145, 74.7920],
  [13.0135, 74.7918],
  [13.0121, 74.7912],
  [13.0108, 74.7900],
  [13.0104, 74.7885]
];

/**
 * Fetch real-world road-following path between 2 or more coordinates using OSRM
 */
export async function getRoadRoute(startCoord, endCoord) {
  if (!startCoord || !endCoord) return { coordinates: [], distanceKm: "0.0 km", durationMins: 1 };

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoord[1]},${startCoord[0]};${endCoord[1]},${endCoord[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
      const path = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const distKm = (route.distance / 1000).toFixed(1);
      const duration = Math.max(1, Math.round(route.duration / 60));

      return {
        coordinates: path,
        distanceKm: `${distKm} km`,
        durationMins: duration
      };
    }
  } catch (error) {
    console.warn("OSRM routing service unreachable, generating campus road curve:", error.message);
  }

  // Fallback: Roadway waypoint interpolation along campus road junctions
  const midLat = (startCoord[0] + endCoord[0]) / 2;
  const midLon = (startCoord[1] + endCoord[1]) / 2;
  
  // Find nearest campus road junction to mid-point
  let nearestJunction = CAMPUS_JUNCTIONS[0];
  let minDist = Infinity;
  for (const junc of CAMPUS_JUNCTIONS) {
    const d = Math.hypot(junc[0] - midLat, junc[1] - midLon);
    if (d < minDist) {
      minDist = d;
      nearestJunction = junc;
    }
  }

  const path = [startCoord, nearestJunction, endCoord];
  const dist = (Math.hypot(endCoord[0] - startCoord[0], endCoord[1] - startCoord[1]) * 111 * 1.3).toFixed(1);

  return {
    coordinates: path,
    distanceKm: `${dist} km`,
    durationMins: 3
  };
}

/**
 * Fetch multi-stop connected route along road network
 */
export async function getMultiStopRoadRoute(stopsList, locationsMap = NITK_LOCATIONS) {
  if (!stopsList || stopsList.length < 2) return [];

  const validCoords = stopsList
    .map(s => locationsMap[s] || null)
    .filter(Boolean);

  if (validCoords.length < 2) return [];

  const fullPath = [];
  for (let i = 0; i < validCoords.length - 1; i++) {
    const leg = await getRoadRoute(validCoords[i], validCoords[i + 1]);
    if (leg.coordinates.length > 0) {
      fullPath.push(...leg.coordinates);
    }
  }

  return fullPath;
}
