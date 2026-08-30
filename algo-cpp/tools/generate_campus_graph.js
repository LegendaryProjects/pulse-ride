#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

// ===== CONFIGURATION BLOCK (easy to edit) =====
const AVG_SPEED_KMH = 15; // Default campus internal road speed (km/h)
const MAX_DIRECT_DISTANCE_METERS = 400; // Maximum distance for direct edge

// Campus locations with real lat/lng coordinates
// Format: { id, name, lat, lng }
const LOCATIONS = [
  { id: 0, name: 'NITK Beach', lat: 13.014117120456433, lng: 74.78839901598512 },
  { id: 1, name: 'LHC-C', lat: 13.010453302938522, lng: 74.79258299961575 },
  { id: 2, name: 'LHC-D', lat: 13.009130572846281, lng: 74.79324093216835 },
  { id: 3, name: 'Guest House', lat: 13.012375275515822, lng: 74.79178526165079 },
  { id: 4, name: 'Girls Hostel', lat: 13.012487238166173, lng: 74.79416475952269 },
  { id: 5, name: 'Girls Co-Op', lat: 13.012446323258711, lng: 74.79657319094767 },
  { id: 6, name: 'Adke Circle', lat: 13.009160622817532, lng: 74.79663265915822 },
  { id: 7, name: 'Karavali Hostel', lat: 13.00779882837179, lng: 74.79699638299711 },
  { id: 8, name: 'Mega Towers', lat: 13.006815680179386, lng: 74.79473102350032 },
  { id: 9, name: 'Library', lat: 13.009812826249965, lng: 74.79503073210114 },
  { id: 10, name: 'Main Building', lat: 13.01079365453772, lng: 74.79418230261578 },
];

// Optional adjacency hints: explicitly connect these pairs even if distance > MAX_DIRECT_DISTANCE_METERS
// Format: [[from_id, to_id], ...]
const ADJACENCY_HINTS = [
  // Add pairs here if you want to force connections despite distance
  // Example: [0, 1], [1, 2]
];

// ===== END CONFIGURATION =====

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function buildOsrmUrl(locations) {
  // Build OSRM /table URL: coordinates as lng,lat pairs separated by semicolons
  const coords = locations.map((loc) => `${loc.lng},${loc.lat}`).join(';');
  return `https://router.project-osrm.org/table/v1/driving/${coords}?annotations=distance`;
}

function fetchOsrmMatrix(locations) {
  return new Promise((resolve, reject) => {
    const url = buildOsrmUrl(locations);
    console.log(`[INFO] Fetching OSRM distance matrix...`);

    https
      .get(url, { timeout: 15000 }, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.code !== 'Ok') {
              throw new Error(`OSRM error: ${json.message || 'unknown'}`);
            }
            if (!json.distances || !Array.isArray(json.distances)) {
              throw new Error('OSRM response missing distances matrix');
            }
            resolve(json.distances);
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

async function getDistanceMatrix(locations) {
  try {
    console.log('[INFO] Attempting to fetch real road distances from OSRM public API...');
    console.log('[NOTE] This demo server is rate-limited; script runs offline only once.\n');
    const matrix = await fetchOsrmMatrix(locations);
    console.log('[SUCCESS] OSRM matrix fetched. Using real road network distances.\n');
    return { matrix, source: 'osrm' };
  } catch (error) {
    console.log(`[FALLBACK] OSRM unreachable or errored: ${error.message}`);
    console.log('[FALLBACK] Using haversine distance * 1.3 detour factor for all edges...\n');

    const n = locations.length;
    const matrix = [];
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(0);
        } else {
          const haversine = haversineDistance(
            locations[i].lat,
            locations[i].lng,
            locations[j].lat,
            locations[j].lng,
          );
          row.push(Math.round(haversine * 1.3)); // Apply detour factor
        }
      }
      matrix.push(row);
    }
    return { matrix, source: 'haversine' };
  }
}

function deriveTravelTime(distanceMeters, speedKmh) {
  // travelTime in minutes = distance_m / (speed_kmh * 1000/60)
  const speedMetersPerMinute = (speedKmh * 1000) / 60;
  return distanceMeters / speedMetersPerMinute;
}

async function generateCampusGraph() {
  console.log('='.repeat(70));
  console.log('NITK Campus Graph Generator');
  console.log('='.repeat(70));
  console.log('');

  // Fetch distance matrix
  const { matrix, source } = await getDistanceMatrix(LOCATIONS);

  // Build edges
  const edges = [];
  const edgeTable = [];
  let createdEdges = 0;

  for (let i = 0; i < LOCATIONS.length; i++) {
    for (let j = i + 1; j < LOCATIONS.length; j++) {
      const distance = matrix[i][j];
      const haversine = haversineDistance(
        LOCATIONS[i].lat,
        LOCATIONS[i].lng,
        LOCATIONS[j].lat,
        LOCATIONS[j].lng,
      );

      // Decide whether to create an edge
      const withinThreshold = distance <= MAX_DIRECT_DISTANCE_METERS;
      const inHints = ADJACENCY_HINTS.some(
        ([a, b]) => (a === i && b === j) || (a === j && b === i),
      );
      const shouldCreate = withinThreshold || inHints;

      if (shouldCreate) {
        const travelTime = deriveTravelTime(distance, AVG_SPEED_KMH);
        edges.push({
          from: i,
          to: j,
          distance: Math.round(distance),
          travelTime: Math.round(travelTime * 100) / 100, // Round to 2 decimals
          directed: false,
        });

        // Record for preview table
        const ratio = (distance / haversine).toFixed(2);
        const suspicious = distance / haversine > 3;
        edgeTable.push({
          from: LOCATIONS[i].name,
          to: LOCATIONS[j].name,
          distance: Math.round(distance),
          travelTime: (Math.round(travelTime * 100) / 100).toFixed(2),
          source: source === 'osrm' ? 'OSRM' : 'haversine*1.3',
          ratio: ratio,
          suspicious: suspicious,
        });
        createdEdges++;
      }
    }
  }

  // Build JSON output
  const graphJson = {
    nodes: LOCATIONS.map((loc) => ({ id: loc.id, name: loc.name })),
    edges: edges,
  };

  // Write JSON to file
  const outputPath = path.join(__dirname, 'campus_graph_nitk.json');
  fs.writeFileSync(outputPath, JSON.stringify(graphJson, null, 2), 'utf8');
  console.log(`[OUTPUT] Wrote campus_graph_nitk.json (${LOCATIONS.length} nodes, ${edges.length} edges)`);

  // Write preview text file
  const previewPath = path.join(__dirname, 'campus_graph_nitk_preview.txt');
  let previewLines = [
    '# NITK Campus Graph — Adjacency List Preview',
    '# (Readable format for manual verification before feeding to engine_main)',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Distance source: ${source === 'osrm' ? 'OSRM real road network' : 'haversine distance * 1.3 (fallback)'}`,
    `Average speed: ${AVG_SPEED_KMH} km/h`,
    `Max direct distance: ${MAX_DIRECT_DISTANCE_METERS}m`,
    '',
    '---',
    '',
  ];

  for (const row of edgeTable) {
    const warn = row.suspicious ? ' [⚠ SUSPICIOUS: ratio > 3.0x]' : '';
    previewLines.push(
      `${row.from.padEnd(25)} -- ${row.to.padEnd(25)} : ${String(row.distance).padStart(5)}m, ${row.travelTime.padStart(5)}min${warn}`,
    );
  }

  previewLines.push('');
  previewLines.push('---');
  previewLines.push(`Total edges: ${edges.length}`);

  fs.writeFileSync(previewPath, previewLines.join('\n'), 'utf8');
  console.log(`[OUTPUT] Wrote campus_graph_nitk_preview.txt (human-readable adjacency list)`);

  // Print preview table
  console.log('\n' + '='.repeat(130));
  console.log('CAMPUS GRAPH EDGES — ADJACENCY PREVIEW');
  console.log('='.repeat(130));
  console.log('');
  console.log(
    'From'.padEnd(25) +
      ' → '.padEnd(5) +
      'To'.padEnd(25) +
      ' | Distance (m) | Time (min) | Source          | Ratio',
  );
  console.log('-'.repeat(130));

  for (const row of edgeTable) {
    const fromPad = row.from.padEnd(22);
    const toPad = row.to.padEnd(22);
    const distancePad = String(row.distance).padStart(12);
    const timePad = row.travelTime.padStart(8);
    const sourcePad = row.source.padEnd(15);
    const ratioStr = `${row.ratio}x${row.suspicious ? ' [SUSPICIOUS]' : ''}`;

    console.log(
      `${fromPad} → ${toPad} | ${distancePad} | ${timePad} | ${sourcePad} | ${ratioStr}`,
    );
  }

  console.log('\n' + '='.repeat(130));
  console.log('SUMMARY');
  console.log('='.repeat(130));
  console.log(`Nodes:                     ${LOCATIONS.length}`);
  console.log(`Edges created:             ${edges.length}`);
  console.log(`Distance source:           ${source === 'osrm' ? 'OSRM real road network' : 'haversine distance * 1.3 (fallback)'}`);
  console.log(`Average speed assumption:  ${AVG_SPEED_KMH} km/h`);
  console.log(`Max direct distance:       ${MAX_DIRECT_DISTANCE_METERS} meters`);
  console.log(`Adjacency hints:           ${ADJACENCY_HINTS.length}`);
  console.log('');
  console.log(`Output file: campus_graph_nitk.json`);
  console.log('');
  console.log('[✓] Complete. Ready to use with engine_main init message.');
  console.log('');
}

// Run
generateCampusGraph().catch((error) => {
  console.error('[ERROR]', error.message);
  process.exit(1);
});
