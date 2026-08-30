// frontend/src/data/nitkCampusGraph.js

// 1. 10 Curated Campus Locations
export const CAMPUS_LOCATIONS = [
  { id: 'loc_main_gate', name: 'Main Gate (NH66)', coords: [13.0108, 74.7950], node: 'n_main_gate' },
  { id: 'loc_main_bldg', name: 'Main Building / Admin', coords: [13.0112, 74.7925], node: 'n_admin_circle' },
  { id: 'loc_library', name: 'Central Library', coords: [13.0117, 74.7938], node: 'n_library_cross' },
  { id: 'loc_lhc', name: 'Lecture Hall Complex (LHC)', coords: [13.0126, 74.7933], node: 'n_lhc_junction' },
  { id: 'loc_sports', name: 'Sports Complex / Pavilion', coords: [13.0088, 74.7936], node: 'n_sports_junction' },
  { id: 'loc_mega_tower', name: 'Mega Tower Hostels', coords: [13.0145, 74.7920], node: 'n_mega_towers' },
  { id: 'loc_health_centre', name: 'Health Care Centre', coords: [13.0100, 74.7930], node: 'n_health_junction' },
  { id: 'loc_mech_dept', name: 'Mechanical & Mining Dept', coords: [13.0121, 74.7912], node: 'n_mech_cross' },
  { id: 'loc_beach_gate', name: 'Beach Gate / Lighthouse', coords: [13.0104, 74.7885], node: 'n_beach_gate' },
  { id: 'loc_pg_block', name: 'PG Hostels / Guest House', coords: [13.0136, 74.7952], node: 'n_pg_block' }
];

// 2. Physical Roadway Intersections and Geometry Nodes
export const ROADWAY_NODES = {
  n_main_gate: [13.0108, 74.7950],
  n_gate_avenue: [13.0109, 74.7942],
  n_library_cross: [13.0117, 74.7938],
  n_admin_circle: [13.0112, 74.7925],
  n_lhc_junction: [13.0126, 74.7933],
  n_sports_junction: [13.0088, 74.7936],
  n_health_junction: [13.0100, 74.7930],
  n_mega_towers: [13.0145, 74.7920],
  n_north_ring_turn: [13.0135, 74.7918],
  n_mech_cross: [13.0121, 74.7912],
  n_west_road_junction: [13.0108, 74.7900],
  n_beach_gate: [13.0104, 74.7885],
  n_pg_block: [13.0136, 74.7952],
  n_east_ring_mid: [13.0125, 74.7946]
};

// 3. Connected Campus Roadways (u, v, approximate distance in meters)
export const ROADWAY_EDGES = [
  ['n_main_gate', 'n_gate_avenue', 90],
  ['n_gate_avenue', 'n_library_cross', 95],
  ['n_gate_avenue', 'n_health_junction', 160],
  ['n_gate_avenue', 'n_east_ring_mid', 180],
  ['n_east_ring_mid', 'n_pg_block', 130],
  ['n_library_cross', 'n_lhc_junction', 110],
  ['n_library_cross', 'n_admin_circle', 150],
  ['n_lhc_junction', 'n_pg_block', 220],
  ['n_lhc_junction', 'n_mega_towers', 240],
  ['n_mega_towers', 'n_north_ring_turn', 120],
  ['n_north_ring_turn', 'n_mech_cross', 170],
  ['n_admin_circle', 'n_mech_cross', 160],
  ['n_admin_circle', 'n_health_junction', 140],
  ['n_health_junction', 'n_sports_junction', 150],
  ['n_mech_cross', 'n_west_road_junction', 190],
  ['n_west_road_junction', 'n_beach_gate', 170],
  ['n_sports_junction', 'n_west_road_junction', 380]
];

// 4. Client-side Dijkstra Shortest Roadway Path Engine
export function calculateCampusRoute(startLocId, endLocId) {
  const startLocation = CAMPUS_LOCATIONS.find((l) => l.id === startLocId);
  const endLocation = CAMPUS_LOCATIONS.find((l) => l.id === endLocId);

  if (!startLocation || !endLocation) return [];
  if (startLocation.id === endLocation.id) return [startLocation.coords];

  const startNode = startLocation.node;
  const endNode = endLocation.node;

  // Build undirected adjacency graph
  const adj = {};
  Object.keys(ROADWAY_NODES).forEach((k) => (adj[k] = []));
  ROADWAY_EDGES.forEach(([u, v, w]) => {
    if (adj[u] && adj[v]) {
      adj[u].push({ node: v, weight: w });
      adj[v].push({ node: u, weight: w });
    }
  });

  const dist = {};
  const prev = {};
  const visited = new Set();
  const pq = [{ node: startNode, dist: 0 }];

  Object.keys(ROADWAY_NODES).forEach((k) => (dist[k] = Infinity));
  dist[startNode] = 0;

  while (pq.length > 0) {
    pq.sort((a, b) => a.dist - b.dist);
    const { node: curr } = pq.shift();

    if (visited.has(curr)) continue;
    visited.add(curr);

    if (curr === endNode) break;

    for (const neighbor of adj[curr]) {
      const alt = dist[curr] + neighbor.weight;
      if (alt < dist[neighbor.node]) {
        dist[neighbor.node] = alt;
        prev[neighbor.node] = curr;
        pq.push({ node: neighbor.node, dist: alt });
      }
    }
  }

  // Reconstruct path
  const pathCoordinates = [];
  let curr = endNode;

  while (curr) {
    pathCoordinates.unshift(ROADWAY_NODES[curr]);
    curr = prev[curr];
  }

  if (pathCoordinates.length <= 1 && startNode !== endNode) {
    return [startLocation.coords, endLocation.coords];
  }

  return pathCoordinates;
}