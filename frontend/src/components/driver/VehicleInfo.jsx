import React from 'react';

const VehicleInfo = ({ isJobStarted, onStartJob }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full p-4 bg-[#181818] rounded-lg mt-6 shadow-md border border-[#282828]">
      
      {/* Vehicle Type */}
      <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded flex-1 flex flex-col justify-center">
        <span className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider mb-1">Vehicle Type</span>
        <span className="text-white font-bold">EV Shuttle (10 Seater)</span>
      </div>
      
      {/* Vehicle Number */}
      <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded flex-1 flex flex-col justify-center">
        <span className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider mb-1">Vehicle Number</span>
        <span className="text-white font-bold">KA-19-NITK-001</span>
      </div>

      {/* Start Job Button */}
      <button 
        onClick={onStartJob}
        disabled={isJobStarted}
        className={`px-8 py-3 rounded font-bold w-full md:w-auto md:min-w-[150px] transition-all duration-200 focus:outline-none ${
          isJobStarted 
            ? 'bg-[#282828] text-[#555555] cursor-not-allowed' 
            : 'bg-[#1ED760] text-black cursor-pointer hover:scale-105'
        }`}
      >
        {isJobStarted ? 'Job In Progress' : 'Start Job'}
      </button>

    </div>
  );
};

export default VehicleInfo;