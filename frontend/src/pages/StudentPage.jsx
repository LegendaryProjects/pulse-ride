import React, { useState } from 'react';
import Navbar from '../components/common/Navbar';
import TripSelector from '../components/student/TripSelector';
import RideInfo from '../components/student/RideInfo';

const StudentPage = () => {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirm = () => {
    setIsConfirmed(true);
  };

  const handleCancelBooking = () => {
    setIsConfirmed(false);
    setPickup("");
    setDropoff("");
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        
        <TripSelector 
          pickup={pickup}
          setPickup={setPickup}
          dropoff={dropoff}
          setDropoff={setDropoff}
          isConfirmed={isConfirmed}
          onConfirm={handleConfirm}
        />
        
        <div className="mt-6 border-2 border-dashed border-[#282828] rounded-lg h-[400px] flex items-center justify-center text-[#B3B3B3]">
          <p>NITK Map Component Placeholder</p>
        </div>

        {/* Conditionally render the Ride Info bar */}
        {isConfirmed && (
          <RideInfo onCancel={handleCancelBooking} />
        )}

      </main>
    </div>
  );
};

export default StudentPage;