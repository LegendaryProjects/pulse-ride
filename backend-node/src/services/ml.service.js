const axios = require('axios');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const STOP_PEAK_TIMES = {
  "Mega Towers": "Morning 8:00 AM",
  "LHC-C": "Evening 5:00 PM",
  "LHC-D": "Morning 8:45 AM",
  "Main Library": "Evening 6:30 PM",
  "Girls Hostel": "Morning 8:15 AM",
  "Adke Circle": "Afternoon 1:15 PM",
  "Karavali Hostel": "Morning 8:30 AM",
  "NITK Beach Gate": "Evening 5:30 PM",
  "Girls Coop": "Afternoon 12:45 PM",
  "Guest House": "Morning 9:30 AM"
};

/**
 * Predict crowd size and vehicle recommendation for a specific location and time
 */
const getDemandPrediction = async ({ date, dayOfWeek, hour, minute, place, isHoliday = false }) => {
  try {
    const response = await axios.post(`${ML_BASE_URL}/predict-crowd`, {
      date: date || new Date().toISOString().split('T')[0],
      day_of_week: dayOfWeek !== undefined ? dayOfWeek : new Date().getDay(),
      hour: hour !== undefined ? hour : new Date().getHours(),
      minute: minute !== undefined ? minute : new Date().getMinutes(),
      place: place || "LHC-C",
      is_holiday: isHoliday
    }, { timeout: 2000 });

    return response.data;
  } catch (error) {
    // Fallback baseline calculation when Python service is offline
    const defaultCounts = {
      "Mega Towers": 45,
      "LHC-C": 38,
      "Main Library": 22,
      "Girls Hostel": 28,
      "LHC-D": 30,
      "Adke Circle": 18,
      "Karavali Hostel": 24,
      "NITK Beach Gate": 14,
      "Girls Coop": 12,
      "Guest House": 8
    };
    const count = defaultCounts[place] || 20;
    let rec = "Buggy";
    if (count >= 5) rec = "Bus";
    else if (count <= 1) rec = "2-Wheeler";

    return {
      place: place || "LHC-C",
      peak_time: STOP_PEAK_TIMES[place] || "Morning 8:00 AM",
      timestamp: `${hour || 8}:${minute || 0}`,
      predicted_students_count: count,
      recommended_vehicle: rec
    };
  }
};

/**
 * Query ML microservice for all campus hotspots across the next hour
 */
const getCampusHotspots = async (date, hour) => {
  try {
    const response = await axios.post(`${ML_BASE_URL}/predict-hotspots`, {
      date: date || new Date().toISOString().split('T')[0],
      hour: hour !== undefined ? hour : new Date().getHours()
    }, { timeout: 2500 });
    return response.data;
  } catch (error) {
    // Fallback hotspots with exact peak times
    return {
      hotspots: [
        { place: "Mega Towers", peak_time: "Morning 8:00 AM", predicted_students: 48, recommended_vehicle: "Bus", urgency: "HIGH" },
        { place: "LHC-C", peak_time: "Evening 5:00 PM", predicted_students: 42, recommended_vehicle: "Bus", urgency: "HIGH" },
        { place: "Main Library", peak_time: "Evening 6:30 PM", predicted_students: 24, recommended_vehicle: "Buggy", urgency: "MEDIUM" },
        { place: "Girls Hostel", peak_time: "Morning 8:15 AM", predicted_students: 30, recommended_vehicle: "Bus", urgency: "HIGH" },
        { place: "Adke Circle", peak_time: "Afternoon 1:15 PM", predicted_students: 18, recommended_vehicle: "Buggy", urgency: "MEDIUM" }
      ],
      alert: "Surge expected at Mega Towers (Morning 8:00 AM) & LHC-C (Evening 5:00 PM)."
    };
  }
};

module.exports = {
  getDemandPrediction,
  getCampusHotspots
};
