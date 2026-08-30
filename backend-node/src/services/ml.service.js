<<<<<<< HEAD
const axios=require('axios');

const getDemandPrediction = async (zone, timeOfDay) => {
  try {
    const response = await axios.post(`${ML_BASE_URL}/predict`, {
      zone,
      time_of_day: timeOfDay
    });
    return response.data;
  } catch (error) {
    console.error('Python ML Service is down or unreachable:', error.message);
    return { predicted_requests: 0, surge_pricing: 1.0 };
  }
};

module.exports = { getDemandPrediction };
=======
// backend-node/src/services/mlClient.js
const axios = require('axios');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Fetches dynamic ETA delays and surge pricing weights
 */
async function getMLPredictions({ pickupNode, dropNode, timeOfDay, activeRequestsCount }) {
  try {
    const response = await axios.post(`${ML_BASE_URL}/predict`, {
      pickup_node: pickupNode,
      dropoff_node: dropNode,
      timestamp: timeOfDay,
      demand_density: activeRequestsCount
    }, { timeout: 1500 });

    return response.data; // e.g. { surge_multiplier: 1.25, traffic_delay_factor: 1.15 }
  } catch (error) {
    // Fallback gracefully to default heuristic if ML service is down
    console.warn('ML Service unavailable, using default baseline heuristics');
    return { surge_multiplier: 1.0, traffic_delay_factor: 1.0 };
  }
}

module.exports = { getMLPredictions };
>>>>>>> 895e98f22a288a8a2bc01ad2ee16607f6bfae909
