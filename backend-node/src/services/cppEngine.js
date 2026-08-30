const calculateOptimizedRoute = async (payload) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      
      // Fallback: If payload.requests is undefined, it wraps payload.newRequest in an array
      const requestArray = payload.requests || [payload.newRequest];

      const assignments = requestArray.map((req) => ({
        rideId: req.id || req.riderId, 
        vehicleId: 1, 
        etaMins: 4.5,
        updatedRoute: [
          { location: req.pickup || req.pickup_location, riderId: req.id || req.riderId, type: "PICKUP", passengerChange: 1 },
          { location: req.dropoff || req.dropoff_location, riderId: req.id || req.riderId, type: "DROP", passengerChange: -1 }
        ],
        explanation: { waitTimeMins: 2.1, detourMins: 0, score: 5.4 }
      }));

      // Return both formats to prevent controller crashes
      resolve({ 
        assignments, 
        vehicleId: 1, 
        updatedRoute: assignments[0]?.updatedRoute // backward compatibility for single requests
      });
      
    }, 200);
  });
};

module.exports = { calculateOptimizedRoute };