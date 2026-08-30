// backend-node/src/services/algoClient.js
const { spawn } = require('child_process');
const path = require('path');

const ENGINE_BIN_PATH = path.resolve(__dirname, '../../../algo-cpp/bin/engine_main');

/**
 * Executes the C++ optimization engine binary
 * @param {Object} payload { graph, vehicles, requests, configs }
 * @returns {Promise<Object>} Optimized fleet routing assignment
 */
function runOptimizer(payload) {
  return new Promise((resolve, reject) => {
    const processInstance = spawn(ENGINE_BIN_PATH, [], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let errorOutput = '';

    processInstance.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });

    processInstance.stderr.on('data', (chunk) => {
      errorOutput += chunk.toString();
    });

    processInstance.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`C++ Engine failed with code ${code}: ${errorOutput}`));
      }
      try {
        const parsed = JSON.parse(output);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse engine JSON: ${err.message}`));
      }
    });

    // Write input payload to C++ stdin
    processInstance.stdin.write(JSON.stringify(payload));
    processInstance.stdin.end();
  });
}

module.exports = { runOptimizer };