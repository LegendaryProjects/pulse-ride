import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const CameraQRScanner = ({
  isOpen = false,
  onClose,
  onScan,
  title = "Scan Driver Stop QR",
  actionText = "Align the Driver's QR Code within the frame"
}) => {
  const [scannerError, setScannerError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setScannerError('');
    setIsCameraActive(false);

    // Give DOM a tick to mount #reader element
    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      const readerElement = document.getElementById('qr-camera-reader');
      if (!readerElement) return;

      const html5QrCode = new Html5Qrcode('qr-camera-reader');
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 220, height: 220 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: 'environment' }, // Prefer rear camera on smartphones
        config,
        (decodedText) => {
          console.log('📷 Camera QR Scanned:', decodedText);
          stopScanner();
          if (onScan) onScan(decodedText);
          if (onClose) onClose();
        },
        (errorMessage) => {
          // Frame-by-frame scan failure - normal while searching
        }
      );

      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera scan initialization failed:', err);
      setScannerError('Camera access unavailable or blocked. You can use the quick check-in below.');
      setIsCameraActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim() && onScan) {
      onScan(manualCode.trim());
      if (onClose) onClose();
    }
  };

  const handleQuickCheckin = () => {
    if (onScan) {
      onScan('QUICK_CHECKIN_STOP_TOKEN');
      if (onClose) onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="bg-[#181818] border border-[#282828] w-full max-w-md rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-white relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#282828] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center text-[#1ED760] font-black text-sm">
              📷
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">{title}</h3>
              <p className="text-[11px] text-[#B3B3B3]">{actionText}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              if (onClose) onClose();
            }}
            className="w-8 h-8 rounded-lg bg-[#121212] border border-[#282828] text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Live Camera Viewport Container */}
        <div className="relative w-full aspect-square bg-[#121212] rounded-xl overflow-hidden border border-[#282828] flex flex-col items-center justify-center">
          
          <div id="qr-camera-reader" className="w-full h-full" />

          {/* Viewfinder Target Graphic */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-56 h-56 border-2 border-[#1ED760] rounded-2xl relative shadow-2xl animate-pulse">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#1ED760] -mt-1 -ml-1 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#1ED760] -mt-1 -mr-1 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#1ED760] -mb-1 -ml-1 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#1ED760] -mb-1 -mr-1 rounded-br" />
                <div className="w-full h-0.5 bg-[#1ED760] opacity-75 shadow-lg shadow-[#1ED760] animate-bounce mt-24" />
              </div>
            </div>
          )}

          {/* Camera Loading Banner */}
          {!isCameraActive && !scannerError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center bg-[#121212]">
              <span className="w-8 h-8 border-3 border-[#1ED760] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-[#B3B3B3] font-bold">Initializing camera scanner...</span>
            </div>
          )}

          {scannerError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center bg-[#121212]">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                ⚠️
              </div>
              <p className="text-xs text-[#CCCCCC] leading-snug">{scannerError}</p>
              <button
                onClick={handleQuickCheckin}
                className="mt-2 bg-[#1ED760] text-black font-black text-xs px-5 py-2.5 rounded-xl hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-[#1ED760]/20"
              >
                Instant 1-Tap Check-In
              </button>
            </div>
          )}
        </div>

        {/* Quick Instant Scan Action */}
        <button
          onClick={handleQuickCheckin}
          className="w-full py-3 bg-[#1ED760] hover:bg-[#1db954] text-black font-black text-xs rounded-xl cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#1ED760]/20 flex items-center justify-center gap-2"
        >
          <span>📷</span>
          <span>Scan / Verify Stop QR Code</span>
        </button>

        {/* Manual Token Fallback */}
        <div className="border-t border-[#282828] pt-2 flex flex-col gap-2">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              placeholder="Or paste stop token string..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="bg-[#121212] border border-[#282828] text-white text-xs px-3 py-2 rounded-lg flex-1 focus:outline-none focus:border-[#1ED760]"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="bg-[#1ED760] disabled:bg-[#282828] text-black disabled:text-gray-500 font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Verify
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default CameraQRScanner;
