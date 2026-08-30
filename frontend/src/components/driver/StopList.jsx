import React, { useEffect, useRef } from 'react';

const StopList = ({ stops, currentIndex }) => {
  const activeStopRef = useRef(null);

  // Auto-scroll the active stop to the center of the scrollable container
  useEffect(() => {
    if (activeStopRef.current) {
      activeStopRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex]);

  return (
    <div className="bg-[#181818] border border-[#282828] rounded-lg mt-6 w-full md:w-80 shrink-0 flex flex-col">
      <div className="px-6 py-4 border-b border-[#282828]">
        <h3 className="text-white font-bold tracking-wide">Route Timeline</h3>
      </div>
      
      {/* 400px height ensures exactly 5 items (80px each) are visible */}
      <div className="h-[400px] overflow-y-auto px-6 py-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-[#121212] [&::-webkit-scrollbar-thumb]:bg-[#282828] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="relative flex flex-col pb-4">
          
          {stops.map((stop, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isUpcoming = index > currentIndex;
            const isLast = index === stops.length - 1;

            return (
              <div 
                key={index} 
                ref={isCurrent ? activeStopRef : null}
                className="relative flex items-center h-20"
              >
                {/* Vertical Connecting Line (Skipped for the last item) */}
                {!isLast && (
                  <div 
                    className={`absolute left-[11px] top-10 w-0.5 h-20 z-0 ${
                      isCompleted ? 'bg-[#1ED760]' : 'bg-[#282828]'
                    }`} 
                  />
                )}

                {/* Status Node / Circle */}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-[#121212] ${
                  isCompleted ? 'border-[#1ED760] bg-[#1ED760]' :
                  isCurrent ? 'border-[#1ED760]' :
                  'border-[#555555]'
                }`}>
                  {isCompleted && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {isCurrent && (
                    <div className="w-2 h-2 rounded-full bg-[#1ED760] animate-pulse" />
                  )}
                </div>

                {/* Stop Name Box */}
                <div className={`ml-6 flex-1 px-4 py-3 border rounded transition-colors ${
                  isCurrent 
                    ? 'border-[#1ED760] bg-[#282828] text-white font-bold shadow-lg' 
                    : isCompleted
                      ? 'border-[#282828] bg-[#181818] text-[#B3B3B3]'
                      : 'border-[#282828] bg-[#121212] text-[#555555]'
                }`}>
                  {stop}
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
};

export default StopList;