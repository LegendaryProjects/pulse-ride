import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import VehicleInfo from '../components/driver/VehicleInfo';
import LiveMap from '../components/driver/LiveMap';
import QRCode from '../components/driver/QRCode';
import RouteControls from '../components/driver/RouteControls';
import StopList from '../components/driver/StopList';
import CustomModal from '../components/common/CustomModal';
import { apiRequest, socket, getStoredUser } from '../services/api';

const NITK_LOCATIONS = {
  "LHC-C": [13.010337, 74.792607],
  "LHC-D": [13.009123, 74.793401],
  "Girls Coop": [13.0126698, 74.7964869],
  "Girls Hostel": [13.0129498, 74.7942945],
  "Mega Towers": [13.0067591, 74.7945026],
  "Karavali Hostel": [13.007962, 74.796963],
  "NITK Beach Gate": [13.014104, 74.788171],
  "Main Library": [13.010084, 74.794165],
  "Adke Circle": [13.009133, 74.796558],
  "Guest House": [13.012395, 74.791805] 
};

const DriverPage = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [isJobStarted, setIsJobStarted] = useState(false);
  const [routeStops, setRouteStops] = useState([]); // Dynamically populated from backend
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isReachedCurrentStop, setIsReachedCurrentStop] = useState(false);
  const [boardingCount, setBoardingCount] = useState(0);
  const [droppingCount, setDroppingCount] = useState(0);
  const [qrPayload, setQrPayload] = useState(null);
  const [tripSummary, setTripSummary] = useState(null);
  const [hotspots, setHotspots] = useState([]);
  const [batchInfo, setBatchInfo] = useState({ active: false, remainingSeconds: 30, pendingStudents: 0 });
  
  // Custom Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null
  });

  useEffect(() => {
    const stored = getStoredUser();
    const vId = stored?.vehicle_id || 1;
    if (stored) {
      setUser(stored);
      fetchDriverVehicle(vId);
    } else {
      fetchDriverVehicle(1);
    }

    socket.emit('join_vehicle_room', vId);

    const handleConnect = () => {
      console.log('⚡ Socket connected, joining vehicle room:', vId);
      socket.emit('join_vehicle_room', vId);
    };

    socket.on('connect', handleConnect);
    fetchCampusHotspots();

    // Socket Event Listeners
    const handleBatchUpdate = (data) => {
      console.log('⏱️ Driver received batch window ticker:', data);
      if (data) {
        setBatchInfo(data);
      }
    };

    const handleRouteUpdated = (data) => {
      console.log('⚡ Driver received dynamic route update:', data);
      if (data.orderedStops && data.orderedStops.length > 0) {
        setRouteStops(data.orderedStops);
        setCurrentStopIndex(0);
        setIsReachedCurrentStop(false);
        setIsJobStarted(true);
        if (vehicle) setVehicle(v => ({ ...v, state: 'ON_TRIP' }));
      }
    };

    const handleQRScanned = (data) => {
      console.log('⚡ Driver received QR scan update:', data);
      if (data.remainingBoarding !== undefined && data.remainingDropping !== undefined) {
        setBoardingCount(data.remainingBoarding);
        setDroppingCount(data.remainingDropping);
      } else {
        if (data.actionType === 'BOARDING') {
          setBoardingCount(c => Math.max(0, c - 1));
        } else if (data.actionType === 'DROPPING') {
          setDroppingCount(c => Math.max(0, c - 1));
        }
      }
    };

    const handleTripCompleted = (data) => {
      setTripSummary(data.message || 'All stops completed! Journey finished.');
      setRouteStops([]);
      setCurrentStopIndex(0);
      setIsReachedCurrentStop(false);
      if (vehicle) setVehicle(v => ({ ...v, state: 'IDLE' }));
      setModalState({
        isOpen: true,
        title: 'All Stops Completed! 🎉',
        message: 'All passengers have boarded and deboarded. Your vehicle is now idle and standing by for the next 30s batch window.',
        type: 'success',
        confirmText: 'Great',
        onConfirm: () => {}
      });
    };

    socket.on('batch_window_update', handleBatchUpdate);
    socket.on('route_updated', handleRouteUpdated);
    socket.on('qr_scanned', handleQRScanned);
    socket.on('trip_completed', handleTripCompleted);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('batch_window_update', handleBatchUpdate);
      socket.off('route_updated', handleRouteUpdated);
      socket.off('qr_scanned', handleQRScanned);
      socket.off('trip_completed', handleTripCompleted);
    };
  }, [currentStopIndex, routeStops.length]);

  // Watch for when both Boarding and Dropping counters reach 0 0
  useEffect(() => {
    if (isReachedCurrentStop && boardingCount === 0 && droppingCount === 0 && routeStops.length > 0) {
      const timer = setTimeout(async () => {
        await advanceToNextStop();
      }, 2000); // 2s visual confirmation of "Good to Go"

      return () => clearTimeout(timer);
    }
  }, [isReachedCurrentStop, boardingCount, droppingCount, currentStopIndex, routeStops]);

  const fetchCampusHotspots = async () => {
    try {
      const data = await apiRequest('/ml/hotspots');
      if (data.data?.hotspots) {
        setHotspots(data.data.hotspots);
      }
    } catch (e) {
      setHotspots([
        { place: "Mega Towers", peak_time: "Morning 8:00 AM", predicted_students: 48, recommended_vehicle: "Bus", urgency: "HIGH" },
        { place: "LHC-C", peak_time: "Evening 5:00 PM", predicted_students: 42, recommended_vehicle: "Bus", urgency: "HIGH" },
        { place: "Main Library", peak_time: "Evening 6:30 PM", predicted_students: 24, recommended_vehicle: "Buggy", urgency: "MEDIUM" }
      ]);
    }
  };

  const fetchDriverVehicle = async (vehicleId = 1) => {
    try {
      const data = await apiRequest(`/driver/vehicle?vehicleId=${vehicleId}`);
      if (data.vehicle) {
        setVehicle(data.vehicle);
        setIsJobStarted(data.vehicle.state === 'IDLE' || data.vehicle.state === 'ON_TRIP');
        if (data.vehicle.current_route && data.vehicle.current_route.length > 0) {
          const stops = [...new Set(data.vehicle.current_route.map(s => s.location))];
          setRouteStops(prev => (prev && prev.length > 0 ? prev : stops));
        }
      }
    } catch (err) {
      console.warn('Could not fetch driver vehicle:', err.message);
    }
  };

  // 1. Start Job (Makes vehicle IDLE and ready for dispatch)
  const handleStartJob = async () => {
    try {
      const vId = vehicle?.id || user?.vehicle_id || 1;
      await apiRequest('/vehicle/toggle-status', {
        method: 'POST',
        body: JSON.stringify({ vehicleId: vId, status: 'IDLE' })
      });
      setIsJobStarted(true);
      setCurrentStopIndex(0);
      setIsReachedCurrentStop(false);
      setTripSummary(null);
      if (vehicle) setVehicle({ ...vehicle, state: 'IDLE' });
    } catch (err) {
      setIsJobStarted(true);
    }
  };

  // 2. Driver clicks "Reached <Stop Name> Stop"
  const handleReachStop = async () => {
    const currentStopName = routeStops[currentStopIndex];
    if (!currentStopName) return;

    try {
      const vId = vehicle?.id || user?.vehicle_id || 1;
      const res = await apiRequest('/vehicle/reach-stop', {
        method: 'POST',
        body: JSON.stringify({ vehicleId: vId, stopName: currentStopName, stopIndex: currentStopIndex })
      });

      setIsReachedCurrentStop(true);
      setBoardingCount(res.boardingCount !== undefined ? res.boardingCount : 1);
      setDroppingCount(res.droppingCount !== undefined ? res.droppingCount : 0);
      setQrPayload(res.qrPayload || { stop: currentStopName, vehicleId: vId, timestamp: Date.now() });
    } catch (err) {
      setIsReachedCurrentStop(true);
      setBoardingCount(1);
      setDroppingCount(0);
      setQrPayload({ stop: currentStopName, vehicleId: 1, timestamp: Date.now() });
    }
  };

  // 3. Automatically advance to next stop once counters reach 0
  const advanceToNextStop = async () => {
    const currentStopName = routeStops[currentStopIndex];
    const vId = vehicle?.id || user?.vehicle_id || 1;
    const isAtLastStop = currentStopIndex >= routeStops.length - 1;

    try {
      await apiRequest('/vehicle/complete-stop', {
        method: 'POST',
        body: JSON.stringify({ 
          vehicleId: vId, 
          stopName: currentStopName, 
          stopIndex: currentStopIndex,
          totalStops: routeStops.length
        })
      });
    } catch (err) {}

    // Disable QR code for the completed stop
    setIsReachedCurrentStop(false);
    setQrPayload(null);

    if (isAtLastStop) {
      // ONLY finish when all stops in journey are completed!
      setTripSummary('All route stops have been completed! Vehicle is now standing by for next dispatch.');
      setRouteStops([]);
      setCurrentStopIndex(0);
      setModalState({
        isOpen: true,
        title: 'All Stops Completed! 🎉',
        message: 'All passengers have boarded and deboarded. Your vehicle is now idle and ready for new requests.',
        type: 'success',
        confirmText: 'Done',
        onConfirm: () => {}
      });
    } else {
      // Move forward to the next stop index
      setCurrentStopIndex(idx => idx + 1);
    }
  };

  // 4. End Job with Custom Confirmation Modal
  const handleEndJob = () => {
    setModalState({
      isOpen: true,
      title: 'End Current Shift?',
      message: 'Are you sure you want to end your driving shift? Your vehicle will be marked as off-duty and will not receive passenger dispatch routes.',
      type: 'confirm',
      confirmText: 'End Shift',
      cancelText: 'Continue Driving',
      onConfirm: async () => {
        try {
          const vId = vehicle?.id || user?.vehicle_id || 1;
          await apiRequest('/vehicle/toggle-status', {
            method: 'POST',
            body: JSON.stringify({ vehicleId: vId, status: 'OFF_DUTY' })
          });
        } catch (e) {}
        setIsJobStarted(false);
        setIsReachedCurrentStop(false);
        setRouteStops([]);
        setCurrentStopIndex(0);
      }
    });
  };

  const isFinished = routeStops.length > 0 && currentStopIndex >= routeStops.length;
  const currentStopName = routeStops.length > 0 ? routeStops[currentStopIndex] : "";
  const nextStopName = (currentStopIndex + 1 < routeStops.length) ? routeStops[currentStopIndex + 1] : "Final Destination";
  const isGoodToGo = isReachedCurrentStop && boardingCount === 0 && droppingCount === 0;

  return (
    <div className="flex-1 w-full min-h-screen bg-[#121212] text-white font-sans flex flex-col items-center">
      <Navbar onLogout={onLogout} />
      
      {/* Custom Designed Modal */}
      <CustomModal 
        isOpen={modalState.isOpen}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={modalState.onConfirm}
      />

      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 flex-1">
        
        {/* Trip Completion Banner */}
        {tripSummary && (
          <div className="bg-[#1ED760]/15 border border-[#1ED760] p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-[#1ED760]/10 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#1ED760] text-black flex items-center justify-center font-black">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Journey Completed</h4>
                <p className="text-xs text-[#B3B3B3]">{tripSummary}</p>
              </div>
            </div>
            <button 
              onClick={() => setTripSummary(null)}
              className="bg-[#1ED760] text-black font-bold px-4 py-2 rounded-xl text-xs hover:scale-105 transition-transform cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Vehicle Information & Job Status */}
        <VehicleInfo 
          vehicle={vehicle} 
          isJobStarted={isJobStarted} 
          onStartJob={handleStartJob} 
          onEndJob={handleEndJob} 
        />

        {/* 30-Second Batch Window Cooldown Ticker on Driver Dashboard */}
        {isJobStarted && batchInfo.active && routeStops.length === 0 && (
          <div className="bg-[#181818] border-2 border-[#1ED760] p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-[#1ED760]/10 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1ED760] text-black flex items-center justify-center font-black text-xl">
                ⏱️
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">
                  30s Batch Aggregation Active — {batchInfo.pendingStudents} Student Request(s) Incoming
                </h4>
                <p className="text-xs text-[#B3B3B3]">
                  Collecting multi-rider requests. Route will be assigned automatically when timer reaches zero.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#121212] border border-[#282828] px-4 py-2 rounded-xl">
              <span className="text-xs font-bold text-[#B3B3B3]">Dispatch Cooldown:</span>
              <span className="text-base font-black text-[#1ED760]">
                {batchInfo.remainingSeconds}s
              </span>
            </div>
          </div>
        )}

        {/* Standby Banner when Job is Active and no requests yet */}
        {isJobStarted && !batchInfo.active && routeStops.length === 0 && (
          <div className="bg-[#181818] border border-[#1ED760]/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1ED760]/15 border border-[#1ED760]/30 text-[#1ED760] flex items-center justify-center font-black text-xl">
                ⏳
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-white">Job Active • Standing By for Student Dispatches</h4>
                <p className="text-xs text-[#B3B3B3]">
                  Vehicle is available. As soon as students book trips within the 30s batch window, their combined route will appear here automatically.
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-[#1ED760]/10 border border-[#1ED760]/40 text-[#1ED760] shrink-0">
              Ready for Dispatch
            </span>
          </div>
        )}
        
        {/* Live Map & Active Stop QR Code */}
        <div className="flex flex-col md:flex-row gap-6 w-full items-stretch relative z-0">
          <LiveMap 
            stops={routeStops} 
            currentIndex={currentStopIndex} 
            locations={NITK_LOCATIONS} 
            isReachedStop={isReachedCurrentStop}
          />
          <QRCode 
            stopName={currentStopName || "Standby"}
            boardingCount={boardingCount}
            droppingCount={droppingCount}
            isGoodToGo={isGoodToGo}
            qrPayload={qrPayload}
            isVisible={isReachedCurrentStop && routeStops.length > 0}
          />
        </div>

        {/* Route Controls & Stop Timeline (Visible once route is assigned) */}
        {isJobStarted && routeStops.length > 0 && (
          <div className="flex flex-col md:flex-row gap-6 w-full items-start animate-fade-in relative z-10">
            <div className="flex-1 w-full">
              <RouteControls 
                currentStop={currentStopName} 
                nextStop={nextStopName}
                onReachStop={handleReachStop} 
                onEndJob={handleEndJob} 
                isReachedStop={isReachedCurrentStop}
                boardingCount={boardingCount}
                droppingCount={droppingCount}
                isGoodToGo={isGoodToGo}
                isFinished={isFinished} 
                legDistance="0.7 km"
                currentOccupancy={boardingCount}
                maxCapacity={vehicle?.capacity || 15}
              />
            </div>
            <div className="w-full md:w-80 shrink-0">
              <StopList stops={routeStops} currentIndex={currentStopIndex} />
            </div>
          </div>
        )}

        {/* ML Demand & Hotspots Section with Time Windows */}
        <div className="bg-[#181818] border border-[#282828] rounded-2xl p-6 shadow-xl w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#282828] pb-4 mb-5 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center text-lg shrink-0">
                🤖
              </div>
              <div>
                <h3 className="text-white font-extrabold text-base">ML Campus Crowd Forecast & Peak Demand Windows</h3>
                <p className="text-xs text-[#B3B3B3]">
                  AI-predicted peak time windows and passenger surge forecasts across NITK stops.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#1ED760]/10 border border-[#1ED760]/30 text-[#1ED760] self-start sm:self-auto">
              Active AI Dispatch
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
            {hotspots.slice(0, 3).map((spot, idx) => (
              <div key={idx} className="bg-[#121212] border border-[#282828] p-5 rounded-2xl flex flex-col justify-between hover:border-[#1ED760]/50 transition-all duration-200 shadow-md">
                
                {/* Location & Urgency */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-extrabold text-base text-white">{spot.place}</span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                      spot.urgency === 'HIGH' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {spot.urgency || 'MEDIUM'}
                    </span>
                  </div>

                  {/* Contextual Time Window Badge */}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] border border-[#282828] rounded-xl text-xs font-black text-[#1ED760] mb-4">
                    <span>⏰</span>
                    <span>{spot.peak_time || 'Morning 8:00 AM'}</span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-end justify-between border-t border-[#282828] pt-3 mt-1">
                  <div>
                    <span className="text-[10px] text-[#B3B3B3] block uppercase font-bold tracking-wider">Suggested Fleet</span>
                    <span className="text-sm font-black text-white">{spot.recommended_vehicle || 'Bus'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#1ED760] block leading-none">{spot.predicted_students}</span>
                    <span className="text-[9px] text-[#B3B3B3] uppercase font-bold tracking-wider">Students Expected</span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};

export default DriverPage;