import React, { useState } from 'react';
import Navbar from '../components/common/Navbar';
import VehicleInfo from '../components/driver/VehicleInfo';
import LiveMap from '../components/driver/LiveMap';
import QRCode from '../components/driver/QRCode';
import RouteControls from '../components/driver/RouteControls';
import StopList from '../components/driver/StopList';

const RANDOM_NITK_STOPS = [
  "Main Building",
  "Silver Jubilee Auditorium",
  "Central Library",
  "Student Activity Center",
  "Mega Hostel Tower 1",
  "Lecture Hall Complex A",
  "Lecture Hall Complex B",
  "Health Care Centre",
  "Pavilion Ground",
  "Vikram Sarabhai Guest House"
];

const DriverPage = () => {
  const [isJobStarted, setIsJobStarted] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  const handleStartJob = () => {
    setIsJobStarted(true);
    setCurrentStopIndex(0);
  };

  const handleReachStop = () => {
    // Allow the index to reach the total length of the array
    if (currentStopIndex < RANDOM_NITK_STOPS.length) {
      setCurrentStopIndex(prev => prev + 1);
    }
  };

  const handleEndJob = () => {
    if (window.confirm("Are you sure you want to end this job?")) {
      setIsJobStarted(false);
      setCurrentStopIndex(0);
    }
  };

  // Job is finished only when the index surpasses the final array element
  const isFinished = currentStopIndex >= RANDOM_NITK_STOPS.length;
  // Prevent undefined array access when the route is finished
  const currentStopName = isFinished ? "" : RANDOM_NITK_STOPS[currentStopIndex];

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col">
      <Navbar />
      
      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 flex-1">
        
        <VehicleInfo 
          isJobStarted={isJobStarted} 
          onStartJob={handleStartJob} 
        />

        <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
          <LiveMap />
          <QRCode />
        </div>

        {isJobStarted && (
          <div className="flex flex-col md:flex-row gap-6 w-full items-start animate-fade-in">
            <div className="flex-1 w-full">
              <RouteControls 
                currentStop={currentStopName}
                onReachStop={handleReachStop}
                onEndJob={handleEndJob}
                isFinished={isFinished}
              />
            </div>
            
            <div className="w-full md:w-80 shrink-0">
              <StopList 
                stops={RANDOM_NITK_STOPS} 
                currentIndex={currentStopIndex} 
              />
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default DriverPage;