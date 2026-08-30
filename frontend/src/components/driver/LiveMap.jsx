import React from 'react';

const LiveMap = () => {
  return (
    <div className="bg-[#181818] border border-[#282828] rounded-lg flex-1 min-h-[400px] flex flex-col items-center justify-center text-center p-6">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[#555555] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
      <h3 className="text-white font-bold text-lg mb-2">NITK Map with all Points</h3>
      <p className="text-[#B3B3B3] text-sm max-w-sm">
        Shows all the points where students requested and shows the path to drive.
      </p>
    </div>
  );
};

export default LiveMap;