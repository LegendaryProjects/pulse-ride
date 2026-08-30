import React, { useState, useEffect } from 'react';
import Navbar from '../components/common/Navbar';
import TripSelector from '../components/student/TripSelector';
import RideInfo from '../components/student/RideInfo';
import CampusMap from '../components/student/CampusMap';
import CustomModal from '../components/common/CustomModal';
import CameraQRScanner from '../components/common/CameraQRScanner';
import { apiRequest, socket, getStoredUser } from '../services/api';
import { NITK_LOCATIONS, getRoadRoute } from '../services/routing';

const StudentPage = ({ onLogout }) => {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [routePath, setRoutePath] = useState([]);
  const [distance, setDistance] = useState("0.0 km");
  const [eta, setEta] = useState("3 mins");
  const [activeRide, setActiveRide] = useState(null);
  const [arrivalAlert, setArrivalAlert] = useState(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
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
    const user = getStoredUser();
    if (user) {
      socket.emit('join_student_room', user.id);
      fetchActiveRide();
    }

    const handleBatchUpdate = (data) => {
      if (data) setBatchInfo(data);
    };

    socket.on('batch_window_update', handleBatchUpdate);
    return () => {
      socket.off('batch_window_update', handleBatchUpdate);
    };
  }, []);

  // Update real-world road-following path whenever pickup or dropoff changes
  useEffect(() => {
    const updateRoadPath = async () => {
      if (!pickup || !dropoff || pickup === dropoff) {
        if (!isConfirmed) setRoutePath([]);
        return;
      }

      const start = NITK_LOCATIONS[pickup];
      const end = NITK_LOCATIONS[dropoff];

      if (start && end) {
        const roadResult = await getRoadRoute(start, end);
        setRoutePath(roadResult.coordinates);
        setDistance(roadResult.distanceKm);
        setEta(`${roadResult.durationMins} min${roadResult.durationMins > 1 ? 's' : ''}`);
      }
    };

    updateRoadPath();
  }, [pickup, dropoff, isConfirmed]);

  // Listen to ride status updates once a ride is created
  useEffect(() => {
    if (!activeRide?.id && !activeRide?.rideId) return;
    const rideId = activeRide.id || activeRide.rideId;

    const handleRideStatus = (data) => {
      console.log('🚗 Student received ride status update:', data);
      setActiveRide(prev => ({ ...prev, ...data, status: data.status || prev.status }));

      if (data.status === 'ASSIGNED') {
        setActiveRide(prev => ({
          ...prev,
          status: 'ASSIGNED',
          vehicleId: data.vehicleId,
          vehicleType: data.vehicleType,
          vehicleNumber: data.vehicleNumber,
          etaMins: data.etaMins || 3
        }));
        setEta(`${data.etaMins || 3} mins`);
      } else if (data.status === 'NO_VEHICLES_AVAILABLE') {
        setActiveRide(prev => ({ ...prev, status: 'NO_VEHICLES_AVAILABLE', vehicleType: null, vehicleNumber: null }));
        setModalState({
          isOpen: true,
          title: 'No Drivers Available',
          message: 'All campus drivers are currently off-duty. A vehicle can only be assigned once an active driver clicks "Start Job" on their dashboard.',
          type: 'warning',
          confirmText: 'Try Again',
          onConfirm: () => {
            resetStudentState();
          }
        });
      } else if (data.status === 'ARRIVED_AT_STOP') {
        setArrivalAlert(data.message || `Your vehicle has arrived at ${data.stop}!`);
      } else if (data.status === 'COMPLETED') {
        setModalState({
          isOpen: true,
          title: 'Trip Completed! 🎉',
          message: `You have successfully arrived at ${dropoff || 'your destination'}. Thank you for riding with Pulse Ride!`,
          type: 'success',
          confirmText: 'Done',
          onConfirm: () => {
            resetStudentState();
          }
        });
      }
    };

    socket.on(`ride_status_${rideId}`, handleRideStatus);
    return () => {
      socket.off(`ride_status_${rideId}`, handleRideStatus);
    };
  }, [activeRide?.id, activeRide?.rideId, dropoff]);

  const fetchActiveRide = async () => {
    try {
      const data = await apiRequest('/ride/student/active');
      if (data.activeRide) {
        setActiveRide(data.activeRide);
        setPickup(data.activeRide.pickup_location);
        setDropoff(data.activeRide.dropoff_location);
        setIsConfirmed(true);
      }
    } catch (e) {}
  };

  const handleConfirm = async () => {
    if (!pickup || !dropoff) return;

    const start = NITK_LOCATIONS[pickup];
    const end = NITK_LOCATIONS[dropoff];

    const arrivalMinutes = Math.floor(Math.random() * 4) + 2; // Random 2, 3, 4, or 5 mins
    const formattedEta = `${arrivalMinutes} mins`;
    setEta(formattedEta);

    if (start && end) {
      const roadResult = await getRoadRoute(start, end);
      setRoutePath(roadResult.coordinates);
      setDistance(roadResult.distanceKm);
    }

    try {
      // 1. Submit ride to backend
      const res = await apiRequest('/ride/request', {
        method: 'POST',
        body: JSON.stringify({
          pickup_location: pickup,
          dropoff_location: dropoff,
          passenger_count: 1
        })
      });

      if (res.noDrivers || res.status === 'NO_VEHICLES_AVAILABLE') {
        setActiveRide({
          id: Date.now(),
          pickup_location: pickup,
          dropoff_location: dropoff,
          status: 'NO_VEHICLES_AVAILABLE',
          vehicleType: null,
          vehicleNumber: null
        });
        setIsConfirmed(true);
        setModalState({
          isOpen: true,
          title: 'No Drivers Available',
          message: 'All campus drivers are currently off-duty. A vehicle can only be assigned once an active driver clicks "Start Job" on their dashboard.',
          type: 'warning',
          confirmText: 'Try Again',
          onConfirm: () => {
            resetStudentState();
          }
        });
        return;
      }

      setActiveRide(res.ride || { 
        id: res.rideId, 
        pickup_location: pickup, 
        dropoff_location: dropoff, 
        status: 'REQUESTED',
        vehicleType: null,
        vehicleNumber: null
      });
      setIsConfirmed(true);
    } catch (err) {
      console.warn('Ride request fallback:', err.message);
      setIsConfirmed(true);
      setActiveRide({
        id: Date.now(),
        pickup_location: pickup,
        dropoff_location: dropoff,
        vehicleType: null,
        vehicleNumber: null,
        status: 'REQUESTED'
      });
    }
  };

  // Two-Step Camera QR Scanner Handler: 1st Scan = Onboard; 2nd Scan = Trip Complete & Reset
  const handleScannedQRCode = async (scannedPayload) => {
    const rideId = activeRide?.id || activeRide?.rideId;
    const currentStatus = activeRide?.status || 'REQUESTED';
    const isCurrentlyOnboard = currentStatus === 'PICKED_UP';

    try {
      const res = await apiRequest('/ride/scan-qr', {
        method: 'POST',
        body: JSON.stringify({
          rideId,
          qrData: scannedPayload,
          stopLocation: isCurrentlyOnboard ? dropoff : pickup
        })
      });

      const updatedStatus = res.newStatus || (isCurrentlyOnboard ? 'COMPLETED' : 'PICKED_UP');
      setArrivalAlert(null);

      if (updatedStatus === 'PICKED_UP') {
        // 1st Scan: Onboarding
        setActiveRide(prev => ({ ...prev, status: 'PICKED_UP' }));
        setModalState({
          isOpen: true,
          title: 'Onboarding Confirmed ✓',
          message: `QR Verified! You are now onboard the vehicle. Enjoy your trip to ${dropoff}. Scan the driver's QR code again upon reaching ${dropoff} to finish your trip.`,
          type: 'success',
          confirmText: 'Got It',
          onConfirm: () => {}
        });
      } else if (updatedStatus === 'COMPLETED') {
        // 2nd Scan: Trip Finished -> Reset
        setActiveRide(prev => ({ ...prev, status: 'COMPLETED' }));
        setModalState({
          isOpen: true,
          title: 'Trip Completed! 🎉',
          message: `You have successfully arrived at ${dropoff || 'your destination'}. Thank you for riding with Pulse Ride!`,
          type: 'success',
          confirmText: 'Book Another Ride',
          onConfirm: () => {
            resetStudentState();
          }
        });
      }
    } catch (err) {
      console.warn('QR scan fallback:', err.message);
      setArrivalAlert(null);

      if (isCurrentlyOnboard) {
        // 2nd Scan: Fallback Trip Completed
        setModalState({
          isOpen: true,
          title: 'Trip Completed! 🎉',
          message: `You have successfully arrived at ${dropoff || 'your destination'}. Thank you for riding with Pulse Ride!`,
          type: 'success',
          confirmText: 'Book Another Ride',
          onConfirm: () => {
            resetStudentState();
          }
        });
      } else {
        // 1st Scan: Fallback Onboard
        setActiveRide(prev => ({ ...prev, status: 'PICKED_UP' }));
        setModalState({
          isOpen: true,
          title: 'Onboarding Confirmed ✓',
          message: `You are now onboard! Enjoy your ride to ${dropoff}.`,
          type: 'success',
          confirmText: 'Got It',
          onConfirm: () => {}
        });
      }
    }
  };

  const promptCancelBooking = () => {
    setModalState({
      isOpen: true,
      title: 'Cancel Ride Request?',
      message: 'Are you sure you want to cancel your campus ride? The dispatched vehicle will update its route accordingly.',
      type: 'confirm',
      confirmText: 'Yes, Cancel Ride',
      cancelText: 'Keep Ride',
      onConfirm: () => handleCancelBooking(true)
    });
  };

  const resetStudentState = () => {
    setIsConfirmed(false);
    setActiveRide(null);
    setPickup("");
    setDropoff("");
    setRoutePath([]);
    setArrivalAlert(null);
  };

  const handleCancelBooking = async (notifyBackend = true) => {
    const rideId = activeRide?.id || activeRide?.rideId;
    if (rideId && notifyBackend) {
      try {
        await apiRequest('/ride/cancel', {
          method: 'POST',
          body: JSON.stringify({ rideId })
        });
      } catch (e) {}
    }
    resetStudentState();
  };

  return (
    <div className="flex-1 w-full min-h-screen bg-[#121212] text-white font-sans flex flex-col items-center">
      <Navbar onLogout={onLogout} />
      
      {/* Custom Designed Modal Popup */}
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

      {/* HTML5 Camera QR Code Scanner */}
      <CameraQRScanner 
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScannedQRCode}
        title={activeRide?.status === 'PICKED_UP' ? "Scan Dropoff QR Code" : "Scan Boarding QR Code"}
        actionText={activeRide?.status === 'PICKED_UP' ? "Align Driver's QR code to deboard & complete trip" : "Align Driver's QR code to board vehicle"}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 w-full flex-1 flex flex-col gap-6">
        
        {/* Arrival Notification Toast */}
        {arrivalAlert && (
          <div className="bg-[#1ED760]/20 border-2 border-[#1ED760] p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-bounce">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1ED760] text-black flex items-center justify-center font-black text-xl">
                🚐
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Vehicle Has Arrived!</h4>
                <p className="text-xs text-[#B3B3B3]">{arrivalAlert}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="bg-[#1ED760] text-black font-black px-5 py-2.5 rounded-xl text-xs hover:scale-105 transition-transform cursor-pointer shadow-lg shadow-[#1ED760]/30 flex items-center gap-2"
            >
              <span>📷</span>
              <span>{activeRide?.status === 'PICKED_UP' ? 'Open Scanner: Deboard' : 'Open Scanner: Board'}</span>
            </button>
          </div>
        )}

        {/* Trip Selector Bar */}
        <div className="relative z-40">
          <TripSelector 
            pickup={pickup} 
            setPickup={setPickup} 
            dropoff={dropoff} 
            setDropoff={setDropoff} 
            isConfirmed={isConfirmed} 
            onConfirm={handleConfirm} 
          />
        </div>
        
        {/* Full Campus Map View with Road Following Polyline */}
        <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-[#282828] relative z-0">
          <CampusMap 
            locations={NITK_LOCATIONS}
            pickup={pickup} 
            setPickup={setPickup}
            dropoff={dropoff} 
            setDropoff={setDropoff}
            routePath={routePath} 
            isConfirmed={isConfirmed}
          />
        </div>

        {/* Ride Info Details Card */}
        {isConfirmed && (
          <RideInfo 
            ride={activeRide}
            onCancel={promptCancelBooking} 
            onOpenScanner={() => setIsScannerOpen(true)}
            distance={distance}
            eta={eta}
            batchInfo={batchInfo}
          />
        )}

      </main>
    </div>
  );
};

export default StudentPage;