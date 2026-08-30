import React, { useState } from 'react';

const Navbar = () => {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#121212] border-b border-[#282828] text-white">
      {/* Left: Brand Name */}
      <div className="text-2xl font-bold tracking-tight text-[#1ED760]">
        PULSE RIDE
      </div>

      {/* Middle: Navigation Links */}
      <div className="hidden md:flex space-x-8 mt-1">
        <button
          onClick={() => setActiveTab('Dashboard')}
          className={`pb-1 transition-all duration-200 ${
            activeTab === 'Dashboard'
              ? 'text-white font-bold border-b-2 border-[#1ED760]'
              : 'text-[#B3B3B3] font-medium border-b-2 border-transparent hover:text-white'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('History')}
          className={`pb-1 transition-all duration-200 ${
            activeTab === 'History'
              ? 'text-white font-bold border-b-2 border-[#1ED760]'
              : 'text-[#B3B3B3] font-medium border-b-2 border-transparent hover:text-white'
          }`}
        >
          History
        </button>
      </div>

      {/* Right: Icons */}
      <div className="flex items-center space-x-6 text-[#B3B3B3]">
        {/* Notification Icon */}
        <button className="hover:text-white transition-colors focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        
        {/* Profile Icon */}
        <button className="hover:text-white transition-colors focus:outline-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;