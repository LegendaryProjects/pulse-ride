import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const QRCode = ({
  stopName = "LHC-C",
  boardingCount = 0,
  droppingCount = 0,
  isGoodToGo = true,
  qrPayload = null,
  isVisible = true
}) => {
  if (!isVisible) {
    return (
      <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 flex flex-col items-center justify-center text-center w-full md:w-80 shrink-0 min-h-[360px]">
        <div className="w-16 h-16 rounded-full bg-[#121212] border border-[#282828] flex items-center justify-center text-[#555555] mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <h4 className="text-white font-bold text-base mb-1">QR Verification Ready</h4>
        <p className="text-xs text-[#B3B3B3] leading-relaxed">
          Click <span className="text-[#1ED760] font-semibold">"Reached Stop"</span> when arriving at a stop to display the stop check-in QR code.
        </p>
      </div>
    );
  }

  // Dynamic QR Code value formatted as JSON string
  const qrValue = typeof qrPayload === 'string' 
    ? qrPayload 
    : JSON.stringify(qrPayload || { stop: stopName, action: 'SCAN_CHECKIN', timestamp: Date.now() });

  return (
    <div className="bg-[#181818] border border-[#282828] rounded-2xl p-5 flex flex-col justify-between w-full md:w-80 shrink-0 shadow-2xl animate-fade-in">
      
      <div className="flex flex-col gap-4">
        
        {/* Header with Stop Name */}
        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-[#B3B3B3] font-bold">Current Stop QR</span>
            <span className="text-white font-bold text-sm truncate">{stopName}</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1ED760]/10 border border-[#1ED760]/30 text-[#1ED760]">
            Active Stop
          </span>
        </div>

        {/* Real Dynamic High-Contrast QR Code Display */}
        <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center shadow-2xl relative group">
          <QRCodeSVG 
            value={qrValue}
            size={168}
            level="H"
            includeMargin={true}
            bgColor="#ffffff"
            fgColor="#000000"
          />
          <span className="text-[10px] font-black text-gray-900 tracking-wider uppercase mt-2">
            Scan via Student App
          </span>
        </div>

        {/* Live Passenger Counters for this Stop */}
        <div className="flex flex-col gap-2">
          <div className="bg-[#121212] border border-[#282828] px-4 py-2.5 rounded-xl flex justify-between items-center">
            <span className="text-[#B3B3B3] text-xs font-semibold">Boarding Students</span>
            <span className={`font-black text-lg ${boardingCount > 0 ? 'text-[#1ED760]' : 'text-gray-500'}`}>
              {boardingCount}
            </span>
          </div>
          
          <div className="bg-[#121212] border border-[#282828] px-4 py-2.5 rounded-xl flex justify-between items-center">
            <span className="text-[#B3B3B3] text-xs font-semibold">Dropping Off</span>
            <span className={`font-black text-lg ${droppingCount > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
              {droppingCount}
            </span>
          </div>
        </div>

      </div>

      {/* Dynamic Status Indicator (Wait vs Good To Go) */}
      <div 
        className={`mt-4 px-4 py-3 rounded-xl border font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
          isGoodToGo 
            ? 'bg-[#1ED760]/15 border-[#1ED760] text-[#1ED760] shadow-lg shadow-[#1ED760]/20' 
            : 'bg-red-500/15 border-red-500 text-red-400 animate-pulse'
        }`}
      >
        {isGoodToGo ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#1ED760]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Good to Go</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <span>Wait (Scanning in Progress)</span>
          </>
        )}
      </div>

    </div>
  );
};

export default QRCode;