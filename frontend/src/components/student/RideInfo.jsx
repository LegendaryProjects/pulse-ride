import React from 'react';

const RideInfo = ({ onCancel, onScanQR, distance = "1.2 km", eta = "4 mins" }) => {
  return (
    <div className="bg-[#181818] p-4 rounded-lg shadow-md mt-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-[#282828] animate-fade-in">
      
      {/* 1. Left: Scan QR Code Button */}
      <div className="w-full md:w-auto">
        <button 
          onClick={onScanQR || (() => alert("Opening Camera / Scanner..."))}
          className="w-full md:w-44 py-3 flex items-center justify-center gap-2 bg-[#121212] border border-[#1ED760] text-[#1ED760] hover:bg-[#1ED760] hover:text-black font-bold rounded cursor-pointer transition-all duration-200 focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <span>Scan QR</span>
        </button>
      </div>

      {/* 2 & 3. Middle: Perfectly Centered Vehicle Data, Distance, and ETA */}
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-center w-full py-2 border-y sm:border-y-0 sm:border-x border-[#282828]">
        
        {/* Vehicle Details */}
        <div className="flex flex-col items-center">
          <span className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider mb-1">Vehicle</span>
          <span className="text-white font-bold text-base md:text-lg">EV Shuttle (KA-19-NITK)</span>
        </div>

        {/* Distance */}
        <div className="flex flex-col items-center">
          <span className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider mb-1">Distance</span>
          <span className="text-white font-bold text-base md:text-lg">{distance}</span>
        </div>

        {/* ETA */}
        <div className="flex flex-col items-center">
          <span className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider mb-1">ETA</span>
          <span className="text-[#1ED760] font-bold text-base md:text-lg">{eta}</span>
        </div>

      </div>

      {/* 4. Right: Cancel Booking Button */}
      <div className="w-full md:w-auto">
        <button 
          onClick={onCancel}
          className="w-full md:w-44 py-3 bg-[#E50914] text-white font-bold rounded cursor-pointer hover:bg-red-700 transition-colors focus:outline-none flex items-center justify-center"
        >
          Cancel Booking
        </button>
      </div>
      
    </div>
  );
};

export default RideInfo;