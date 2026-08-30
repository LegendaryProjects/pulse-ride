import React from 'react';

const RideInfo = ({
  ride,
  onCancel,
  onOpenScanner,
  distance = "1.2 km",
  eta = "3 mins",
  batchInfo = null
}) => {
  const rideStatus = ride?.status || "REQUESTED";
  const isAssigned = rideStatus === 'ASSIGNED' || rideStatus === 'PICKED_UP';
  const isOnboard = rideStatus === 'PICKED_UP';
  const isPendingBatch = rideStatus === 'REQUESTED';
  const isNoVehicles = rideStatus === 'NO_VEHICLES_AVAILABLE';

  const vehicleType = isAssigned ? (ride?.vehicleType || ride?.vehicle_type || "Campus Shuttle") : "Matching Active Driver";
  const vehicleNumber = isAssigned ? (ride?.vehicleNumber || ride?.vehicle_number || "KA-19-NITK") : "En Route";

  return (
    <div className="bg-[#181818] p-5 rounded-2xl shadow-xl mt-6 flex flex-col gap-4 border border-[#282828] animate-fade-in w-full">
      
      {/* 1. No Vehicles Available Banner */}
      {isNoVehicles && (
        <div className="bg-red-500/15 border-2 border-red-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xl shrink-0 font-bold">
              ⚠️
            </div>
            <div>
              <h4 className="text-sm font-black text-red-400">
                No Drivers Currently Available
              </h4>
              <p className="text-xs text-[#CCCCCC] mt-0.5">
                All campus shuttles are currently off-duty. A vehicle will be assigned once an active driver clicks "Start Job" on their dashboard.
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="bg-red-500 hover:bg-red-600 text-white font-black text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-transform hover:scale-105 shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* 2. Ride Requested (Waiting period during 30s driver batch dispatch) */}
      {!isNoVehicles && isPendingBatch && (
        <div className="bg-[#121212] border-2 border-[#1ED760]/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1ED760]/15 text-[#1ED760] flex items-center justify-center font-black text-lg shrink-0">
              ⏱️
            </div>
            <div>
              <h4 className="text-sm font-black text-white">
                Ride Request Confirmed — Waiting for Batch Dispatch
              </h4>
              <p className="text-xs text-[#B3B3B3]">
                Your ride is in the waiting queue. The driver's 30-second aggregation timer is routing all campus pickups together.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#181818] border border-[#1ED760]/40 px-4 py-2 rounded-xl shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#1ED760] animate-ping" />
            <span className="text-xs font-bold text-[#B3B3B3]">Dispatching In:</span>
            <span className="text-sm font-black text-[#1ED760]">
              {batchInfo?.remainingSeconds !== undefined ? `${batchInfo.remainingSeconds}s` : '30s'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Assigned / In-Transit En-Route Status Banner (Your bus is coming!) */}
      {!isNoVehicles && !isPendingBatch && (
        <div className={`p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-inner border transition-all duration-300 ${
          isOnboard 
            ? 'bg-[#1ED760]/10 border-[#1ED760]/40' 
            : 'bg-[#181818] border-[#1ED760] shadow-lg shadow-[#1ED760]/10'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1ED760] text-black flex items-center justify-center text-xl font-black shrink-0 shadow-md shadow-[#1ED760]/30">
              {isOnboard ? '🚀' : '🚐'}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-white">
                {isOnboard ? 'Currently Onboard Vehicle' : 'Your Bus is Coming! 🎉'}
              </span>
              <span className="text-xs text-[#B3B3B3]">
                {isOnboard 
                  ? 'Heading to dropoff destination. Scan Driver QR code with camera upon arrival to complete trip.' 
                  : `Driver in ${vehicleType} (${vehicleNumber}) is en route to pick you up. Please wait at your stop.`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#121212] border border-[#282828] px-3.5 py-2 rounded-xl shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1ED760] animate-pulse" />
            <span className="text-xs font-bold text-[#B3B3B3]">
              {isOnboard ? 'Status:' : 'Est. Arrival:'}
            </span>
            <span className="text-sm font-black text-[#1ED760]">
              {isOnboard ? 'IN TRANSIT' : (eta || "3 mins")}
            </span>
          </div>
        </div>
      )}

      {!isNoVehicles && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: Open Camera QR Scanner Button */}
          <div className="w-full md:w-auto">
            <button 
              onClick={onOpenScanner}
              disabled={!isAssigned}
              className={`w-full md:w-60 py-3.5 flex items-center justify-center gap-2.5 font-black rounded-xl transition-all duration-200 focus:outline-none shadow-lg ${
                !isAssigned
                  ? 'bg-[#121212] border border-[#282828] text-gray-500 cursor-not-allowed opacity-60'
                  : isOnboard
                    ? 'bg-[#1ED760] hover:bg-[#1db954] text-black shadow-[#1ED760]/20 animate-pulse cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-[#121212] border-2 border-[#1ED760] text-[#1ED760] hover:bg-[#1ED760] hover:text-black shadow-[#1ED760]/10 cursor-pointer hover:scale-105 active:scale-95'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{isOnboard ? 'Scan QR to Deboard' : (isAssigned ? 'Open Camera QR Scanner' : 'Awaiting Driver Match...')}</span>
            </button>
          </div>

          {/* Center: Vehicle & ETA Stats */}
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-center w-full py-2 border-y sm:border-y-0 sm:border-x border-[#282828]">
            
            <div className="flex flex-col items-center">
              <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-wider mb-1">Assigned Vehicle</span>
              {isAssigned ? (
                <span className="text-white font-black text-sm md:text-base">{vehicleType} ({vehicleNumber})</span>
              ) : (
                <span className="text-amber-400 font-bold text-xs">Matching Active Driver...</span>
              )}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-wider mb-1">Campus Distance</span>
              <span className="text-white font-black text-sm md:text-base">{distance}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[#B3B3B3] text-[10px] font-bold uppercase tracking-wider mb-1">
                {isOnboard ? 'Ride Phase' : 'Est. Arrival Time'}
              </span>
              <span className="text-[#1ED760] font-black text-sm md:text-base">
                {isOnboard ? 'ONBOARD' : eta}
              </span>
            </div>

          </div>

          {/* Right: Cancel Booking */}
          <div className="w-full md:w-auto">
            {!isOnboard ? (
              <button 
                onClick={onCancel}
                className="w-full md:w-44 py-3.5 bg-[#121212] border border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white font-bold rounded-xl cursor-pointer transition-colors focus:outline-none flex items-center justify-center"
              >
                Cancel Booking
              </button>
            ) : (
              <div className="w-full md:w-44 py-3.5 bg-[#121212] border border-[#282828] text-[#B3B3B3] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1ED760]" />
                <span>In Transit</span>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
};

export default RideInfo;