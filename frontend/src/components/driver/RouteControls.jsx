import React from 'react';

const RouteControls = ({
  currentStop,
  nextStop,
  onReachStop,
  onEndJob,
  isReachedStop,
  boardingCount = 0,
  droppingCount = 0,
  isGoodToGo = false,
  isFinished = false,
  legDistance = "0.8 km",
  currentOccupancy = 0,
  maxCapacity = 15
}) => {
  return (
    <div className="flex flex-col gap-4">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-[#181818] border border-[#282828] px-6 py-4 rounded-xl flex justify-between items-center shadow-sm">
          <span className="text-[#B3B3B3] font-medium text-xs uppercase tracking-wider">Vehicle Occupancy</span>
          <span className="text-white font-black text-xl">{currentOccupancy} / {maxCapacity}</span>
        </div>

        <div className="bg-[#181818] border border-[#282828] px-6 py-4 rounded-xl flex justify-between items-center shadow-sm">
          <span className="text-[#B3B3B3] font-medium text-xs uppercase tracking-wider">Leg Distance</span>
          <span className="text-[#1ED760] font-black text-xl">{legDistance}</span>
        </div>
      </div>

      {/* Main Single Progression Button */}
      {isFinished ? (
        <button 
          disabled
          className="px-6 py-4 rounded-xl font-black text-lg bg-[#282828] text-gray-500 cursor-not-allowed border border-[#282828] shadow-md flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1ED760]" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>All Route Stops Completed</span>
        </button>
      ) : isReachedStop ? (
        <button 
          disabled
          className="px-6 py-4 rounded-xl font-black text-base md:text-lg bg-[#181818] border-2 border-amber-500/60 text-amber-300 cursor-wait shadow-lg flex items-center justify-center gap-3 animate-pulse"
        >
          <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <span>
            {isGoodToGo 
              ? `Good to Go! Advancing to ${nextStop || 'next stop'}...` 
              : `At "${currentStop}" — Waiting for QR Scan (${boardingCount} boarding, ${droppingCount} dropping)`}
          </span>
        </button>
      ) : (
        <button 
          onClick={onReachStop}
          className="px-6 py-4 rounded-xl font-black text-lg bg-[#121212] border-2 border-[#1ED760] text-[#1ED760] hover:bg-[#1ED760] hover:text-black cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-lg shadow-[#1ED760]/10 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Reached "{currentStop}" Stop</span>
        </button>
      )}

      {/* End Trip / Shift Button */}
      <button 
        onClick={onEndJob}
        className="bg-[#181818] border border-[#282828] hover:border-red-500 text-gray-400 hover:text-red-400 px-6 py-3 rounded-xl font-bold text-xs md:text-sm transition-colors cursor-pointer"
      >
        Cancel & End Current Shift
      </button>

    </div>
  );
};

export default RouteControls;