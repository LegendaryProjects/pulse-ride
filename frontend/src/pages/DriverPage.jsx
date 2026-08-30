import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import VehicleInfo from '../components/driver/VehicleInfo';
import LiveMap from '../components/driver/LiveMap';
import QRCode from '../components/driver/QRCode';
import RouteControls from '../components/driver/RouteControls';
import StopList from '../components/driver/StopList';

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

const ROUTE_SEQUENCE = [
  "NITK Beach Gate", "LHC-C", "LHC-D", "Main Library", "Adke Circle", 
  "Karavali Hostel", "Guest House", "Girls Coop", "Girls Hostel", "Mega Towers"
];

// Helper to calculate realistic road distance between two lat-long coordinates (Haversine formula)
const calculateDistanceKm = (coord1, coord2) => {
  if (!coord1 || !coord2) return "0.0 km";
  const R = 6371; // Radius of earth in km
  const dLat = (coord2[0] - coord1[0]) * (Math.PI / 180);
  const dLon = (coord2[1] - coord1[1]) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1[0] * (Math.PI / 180)) * Math.cos(coord2[0] * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c * 1.3; // Multiplier accounts for roadway winding vs straight line
  return `${distance.toFixed(1)} km`;
};

const DriverPage = () => {
  const [isJobStarted, setIsJobStarted] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [currentLegDistance, setCurrentLegDistance] = useState("1.2 km");

  useEffect(() => {
    if (currentStopIndex < ROUTE_SEQUENCE.length - 1) {
      const from = NITK_LOCATIONS[ROUTE_SEQUENCE[currentStopIndex]];
      const to = NITK_LOCATIONS[ROUTE_SEQUENCE[currentStopIndex + 1]];
      setCurrentLegDistance(calculateDistanceKm(from, to));
    } else {
      setCurrentLegDistance("0.0 km");
    }
  }, [currentStopIndex]);

  const handleStartJob = () => { setIsJobStarted(true); setCurrentStopIndex(0); };
  const handleReachStop = () => { if (currentStopIndex < ROUTE_SEQUENCE.length) setCurrentStopIndex(prev => prev + 1); };
  const handleEndJob = () => { if (window.confirm("Are you sure you want to end this job?")) { setIsJobStarted(false); setCurrentStopIndex(0); } };

  const isFinished = currentStopIndex >= ROUTE_SEQUENCE.length;
  const currentStopName = isFinished ? "" : ROUTE_SEQUENCE[currentStopIndex];

  return (
    <div className="flex-1 w-full bg-transparent text-white font-sans flex flex-col">
      <Navbar />
      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 flex-1">
        <VehicleInfo isJobStarted={isJobStarted} onStartJob={handleStartJob} />
        
        <div className="flex flex-col md:flex-row gap-6 w-full items-stretch relative z-0">
          <LiveMap 
            stops={ROUTE_SEQUENCE} 
            currentIndex={currentStopIndex} 
            locations={NITK_LOCATIONS} 
          />
          <QRCode />
        </div>

        {isJobStarted && (
          <div className="flex flex-col md:flex-row gap-6 w-full items-start animate-fade-in relative z-10">
            <div className="flex-1 w-full">
              <RouteControls 
                currentStop={currentStopName} 
                onReachStop={handleReachStop} 
                onEndJob={handleEndJob} 
                isFinished={isFinished} 
                legDistance={currentLegDistance}
              />
            </div>
            <div className="w-full md:w-80 shrink-0">
              <StopList stops={ROUTE_SEQUENCE} currentIndex={currentStopIndex} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DriverPage;