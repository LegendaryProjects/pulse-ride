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