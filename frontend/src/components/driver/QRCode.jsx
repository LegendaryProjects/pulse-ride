import React, { useState } from 'react';

const QRCode = () => {
  // Toggle this state to see the Wait vs Good to Go UI change
  const [isReadyToGo, setIsReadyToGo] = useState(true);

  return (
    <div className="bg-[#181818] border border-[#282828] rounded-lg p-4 flex flex-col gap-4 w-full md:w-80 shrink-0">
      
      {/* QR Code Placeholder */}
      <div className="bg-[#121212] border border-[#282828] aspect-square rounded flex flex-col items-center justify-center">
        <div className="border-4 border-dashed border-[#555555] w-3/4 h-3/4 flex items-center justify-center rounded-lg">
          <span className="text-[#B3B3B3] font-medium tracking-wide">QR CODE</span>
        </div>
      </div>

      {/* Passenger Stats */}
      <div className="flex flex-col gap-2">
        <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded flex justify-between items-center">
          <span className="text-[#B3B3B3] text-sm font-medium">Boarding</span>
          <span className="text-[#1ED760] font-bold text-lg">5</span>
        </div>
        
        <div className="bg-[#121212] border border-[#282828] px-4 py-3 rounded flex justify-between items-center">
          <span className="text-[#B3B3B3] text-sm font-medium">Dropping Off</span>
          <span className="text-white font-bold text-lg">10</span>
        </div>
      </div>

      {/* Status Indicator */}
      <div 
        className={`mt-2 px-4 py-3 rounded border font-bold flex items-center justify-center gap-2 transition-colors ${
          isReadyToGo 
            ? 'bg-[#1ED760]/10 border-[#1ED760] text-[#1ED760]' 
            : 'bg-[#E50914]/10 border-[#E50914] text-[#E50914]'
        }`}
      >
        {isReadyToGo ? (
          <>
            <span>Good to Go</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </>
        ) : (
          <>
            <span>Wait</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </>
        )}
      </div>

    </div>
  );
};

export default QRCode;