import React from 'react';

const RideInfo = ({ onCancel }) => {
  return (
    <div className="bg-[#181818] p-4 rounded-lg shadow-md mt-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#282828] animate-fade-in">
      
      {/* Vehicle Data */}
      <div className="flex flex-col items-center md:items-start text-center md:text-left w-full md:w-auto">
        <span className="text-[#B3B3B3] text-sm font-medium uppercase tracking-wider">Vehicle</span>
        <span className="text-white font-bold text-lg">EV Shuttle (KA-19-NITK)</span>
      </div>

      {/* Distance & ETA */}
      <div className="flex flex-row justify-center gap-8 w-full md:w-auto border-y border-[#282828] md:border-y-0 md:border-x py-3 md:py-0 md:px-8">
        <div className="flex flex-col items-center">
          <span className="text-[#B3B3B3] text-sm font-medium uppercase tracking-wider">Distance</span>
          <span className="text-white font-bold text-lg">1.2 km</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[#B3B3B3] text-sm font-medium uppercase tracking-wider">ETA</span>
          <span className="text-[#1ED760] font-bold text-lg">4 mins</span>
        </div>
      </div>

      {/* Cancel Action */}
      <div className="w-full md:w-auto mt-2 md:mt-0">
        <button 
          onClick={onCancel}
          className="w-full md:w-auto bg-[#E50914] text-white font-bold px-6 py-3 rounded cursor-pointer hover:bg-red-700 transition-colors focus:outline-none"
        >
          Cancel Booking
        </button>
      </div>
      
    </div>
  );
};

export default RideInfo;