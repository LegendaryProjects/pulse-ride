import React from 'react';
import Navbar from '../components/common/Navbar';
import VehicleInfo from '../components/driver/VehicleInfo';
import LiveMap from '../components/driver/LiveMap';
import QRCode from '../components/driver/QRCode';

const DriverPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-white font-sans flex flex-col">
      <Navbar />
      
      <main className="max-w-7xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col gap-6 flex-1">
        
        {/* Top Bar: Vehicle Info & Controls */}
        <VehicleInfo />

        {/* Middle Section: Map & QR Scanner Side-by-Side */}
        <div className="flex flex-col md:flex-row gap-6 w-full items-stretch">
          <LiveMap />
          <QRCode />
        </div>

      </main>
    </div>
  );
};

export default DriverPage;