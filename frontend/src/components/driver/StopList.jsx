import React, { useEffect, useRef } from 'react';

const StopList = ({ stops = [], currentIndex = 0 }) => {
  const activeStopRef = useRef(null);

  useEffect(() => {
    if (activeStopRef.current) {
      activeStopRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentIndex]);

  const displayStops = stops.length > 0 ? stops : [
    "NITK Beach Gate", "LHC-C", "LHC-D", "Main Library", "Adke Circle", 
    "Karavali Hostel", "Guest House", "Girls Coop", "Girls Hostel", "Mega Towers"
  ];

  return (
    <div className="bg-[#181818] border border-[#282828] rounded-2xl w-full md:w-80 shrink-0 flex flex-col shadow-xl">
      <div className="px-6 py-4 border-b border-[#282828] flex items-center justify-between">
        <h3 className="text-white font-bold text-sm tracking-wide">Route Sequence</h3>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#1ED760]/10 text-[#1ED760]">
          {currentIndex < displayStops.length ? `Stop ${currentIndex + 1} of ${displayStops.length}` : 'Completed'}
        </span>
      </div>
      
      <div className="h-[360px] overflow-y-auto px-5 py-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#121212] [&::-webkit-scrollbar-thumb]:bg-[#282828] [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="relative flex flex-col pb-2">
          
          {displayStops.map((stopItem, index) => {
            const stopName = typeof stopItem === 'string' ? stopItem : (stopItem.location || `Stop ${index + 1}`);
            const stopType = typeof stopItem === 'object' ? stopItem.type : null;
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isLast = index === displayStops.length - 1;

            return (
              <div 
                key={index} 
                ref={isCurrent ? activeStopRef : null}
                className="relative flex items-center h-16"
              >
                {!isLast && (
                  <div 
                    className={`absolute left-[11px] top-8 w-0.5 h-16 z-0 ${
                      isCompleted ? 'bg-[#1ED760]' : 'bg-[#282828]'
                    }`} 
                  />
                )}

                {/* Node Dot / Check */}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-[#121212] shrink-0 ${
                  isCompleted ? 'border-[#1ED760] bg-[#1ED760]' :
                  isCurrent ? 'border-[#1ED760] ring-4 ring-[#1ED760]/20' :
                  'border-[#444444]'
                }`}>
                  {isCompleted ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-black" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 rounded-full bg-[#1ED760] animate-pulse" />
                  ) : null}
                </div>

                {/* Stop Name & Type Badge */}
                <div className={`ml-4 flex-1 px-3.5 py-2 border rounded-xl transition-all flex items-center justify-between ${
                  isCurrent 
                    ? 'border-[#1ED760] bg-[#222222] text-white font-bold shadow-md' 
                    : isCompleted
                      ? 'border-[#282828] bg-[#181818] text-[#888888]'
                      : 'border-[#282828] bg-[#121212] text-[#666666]'
                }`}>
                  <span className="text-xs truncate">{stopName}</span>
                  {stopType && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ml-2 ${
                      stopType === 'PICKUP' ? 'bg-[#1ED760]/20 text-[#1ED760]' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {stopType}
                    </span>
                  )}
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