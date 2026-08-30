import React from 'react';

const VehicleInfo = ({ vehicle, isJobStarted, onStartJob, onEndJob }) => {
  const vehicleType = vehicle?.type || "BUS (15 Seater)";
  const vehicleNumber = vehicle?.vehicle_number || "KA-19-NITK-001";
  const capacity = vehicle?.capacity || 15;
  const state = vehicle?.state || (isJobStarted ? 'IDLE' : 'OFF_DUTY');

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full p-4 bg-[#181818] rounded-2xl shadow-md border border-[#282828] items-stretch">
      
      {/* Vehicle Type */}
      <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded-xl flex-1 flex flex-col justify-center">
        <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-wider mb-0.5">Vehicle Type</span>
        <span className="text-white font-black text-base">{vehicleType}</span>
      </div>
      
      {/* Vehicle Number */}
      <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded-xl flex-1 flex flex-col justify-center">
        <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-wider mb-0.5">License Plate</span>
        <span className="text-white font-black text-base">{vehicleNumber}</span>
      </div>

      {/* Capacity & Fleet Status */}
      <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded-xl flex-1 flex flex-col justify-center">
        <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-wider mb-0.5">Fleet Status</span>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isJobStarted ? 'bg-[#1ED760]' : 'bg-gray-500'} animate-pulse`} />
          <span className="text-white font-black text-sm">
            {state === 'ON_TRIP' ? 'On Trip' : (isJobStarted ? 'Available for Dispatch' : 'Off Duty')}
          </span>
        </div>
      </div>

      {/* Start Job / End Job Controls */}
      <div className="flex items-center">
        {!isJobStarted ? (
          <button 
            onClick={onStartJob}
            className="w-full md:w-auto bg-[#1ED760] hover:bg-[#1db954] text-black font-black px-8 py-3.5 rounded-xl cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-[#1ED760]/20 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span>Start Job</span>
          </button>
        ) : (
          <button 
            onClick={onEndJob}
            className="w-full md:w-auto bg-[#121212] border border-red-500/50 hover:bg-red-500 text-red-400 hover:text-white font-bold px-6 py-3.5 rounded-xl cursor-pointer transition-all duration-200"
          >
            End Job
          </button>
        )}
      </div>

    </div>
  );
};

export default VehicleInfo;