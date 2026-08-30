import React from 'react';

const RouteControls = ({ currentStop, onReachStop, onEndJob, isFinished }) => {
  return (
    <div className="flex flex-col gap-4 mt-6">
      
      {/* Current Vehicle Capacity */}
      <div className="bg-[#181818] border border-[#282828] px-6 py-4 rounded-lg flex justify-between items-center shadow-sm">
        <span className="text-[#B3B3B3] font-medium tracking-wide">Current Vehicle Capacity</span>
        <span className="text-white font-bold text-xl">5 / 10</span>
      </div>

      {/* Students Requested */}
      <div className="bg-[#181818] border border-[#282828] px-6 py-4 rounded-lg flex justify-between items-center shadow-sm">
        <span className="text-[#B3B3B3] font-medium tracking-wide">Students Need to PickUp</span>
        <span className="text-[#1ED760] font-bold text-xl">3</span>
      </div>

      {/* Reached "X" Stop Button */}
      <button 
        onClick={onReachStop}
        disabled={isFinished}
        className={`px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-md ${
          isFinished 
            ? 'bg-[#282828] text-[#555555] cursor-not-allowed border border-[#282828]' 
            : 'bg-[#121212] border-2 border-[#1ED760] text-[#1ED760] hover:bg-[#1ED760] hover:text-black cursor-pointer'
        }`}
      >
        {isFinished ? 'All Stops Completed' : `Reached "${currentStop}" Stop`}
      </button>

      {/* End Job Button */}
      <button 
        onClick={onEndJob}
        className="bg-[#E50914] text-white px-6 py-4 rounded-lg font-bold text-lg hover:bg-red-700 transition-colors cursor-pointer shadow-md"
      >
        End Job
      </button>

    </div>
  );
};

export default RouteControls;