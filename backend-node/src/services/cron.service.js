const cron = require('node-cron');
const axios = require('axios');

// The internal URL where your Python ML service will be running
const PYTHON_ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const initCronJobs = () => {
  // Runs at 02:00 AM on the 1st and 15th of every month
  cron.schedule('0 2 1,15 * *', async () => {
    console.log('⏰ [CRON] Triggering biweekly ML model training...');
    
    try {
      // Pings the Python service to start the retraining pipeline
      const response = await axios.post(`${PYTHON_ML_SERVICE_URL}/train`);
      
      console.log(`✅ [CRON] ML Training successful: ${response.data.message}`);
    } catch (error) {
      console.error('❌ [CRON] ML Training trigger failed:', error.message);
    }
  });

  console.log('📅 Cron scheduler initialized.');
};

module.exports = { initCronJobs };