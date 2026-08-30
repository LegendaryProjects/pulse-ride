import React, { useState } from 'react';
import Navbar from '../components/common/Navbar';
import TripSelector from '../components/student/TripSelector';
import RideInfo from '../components/student/RideInfo';
import CampusMap from '../components/student/CampusMap';

// Verified 10 NITK Campus Nodes
const NITK_LOCATIONS = {
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

const StudentPage = () => {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [routePath, setRoutePath] = useState([]);

  const handleConfirm = async () => {
    if (!pickup || !dropoff) return;

    const start = NITK_LOCATIONS[pickup];
    const end = NITK_LOCATIONS[dropoff];

    try {
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      const path = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      setRoutePath(path);
      setIsConfirmed(true);
    } catch (error) {
      console.error("Routing error:", error);
      alert("Failed to calculate route. Please try again.");
    }
  };

  const handleCancelBooking = () => {
    setIsConfirmed(false);
    setPickup("");
    setDropoff("");
    setRoutePath([]);
  };

  return (
    <div className="flex-1 w-full bg-transparent text-white font-sans flex flex-col">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full flex-1">
        
        <div className="relative z-50">
          <TripSelector 
            pickup={pickup} 
            setPickup={setPickup} 
            dropoff={dropoff} 
            setDropoff={setDropoff} 
            isConfirmed={isConfirmed} 
            onConfirm={handleConfirm} 
          />
        </div>
        
        <div className="mt-6 rounded-lg w-full relative z-0">
          <CampusMap 
            locations={NITK_LOCATIONS}
            pickup={pickup} 
            setPickup={setPickup}
            dropoff={dropoff} 
            setDropoff={setDropoff}
            routePath={routePath} 
            isConfirmed={isConfirmed}
          />
        </div>

        {isConfirmed && (
          <RideInfo onCancel={handleCancelBooking} />
        )}

      </main>
    </div>
  );
};

export default StudentPage;