import React, { useState, useRef, useEffect } from 'react';
import { getStoredUser, clearAuthSession, socket } from '../../services/api';

const Navbar = ({ onLogout }) => {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileView, setProfileView] = useState('menu');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Welcome to Pulse Ride',
      message: 'Zero-fare dynamic campus shared mobility is active.',
      time: 'Just now',
      type: 'info'
    }
  ]);
  const [unreadCount, setUnreadCount] = useState(1);

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (stored) setUser(stored);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
        setProfileView('menu');
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Socket Notifications Listener
    const handleMLAlert = (alertData) => {
      setNotifications(prev => [
        {
          id: Date.now(),
          title: alertData.title || 'ML Crowd Alert',
          message: alertData.message,
          time: 'Just now',
          type: 'ml'
        },
        ...prev
      ]);
      setUnreadCount(c => c + 1);
    };

    const handleFleetUpdate = (data) => {
      if (data.message) {
        setNotifications(prev => [
          {
            id: Date.now(),
            title: 'Fleet Update',
            message: data.message,
            time: 'Just now',
            type: 'fleet'
          },
          ...prev
        ]);
        setUnreadCount(c => c + 1);
      }
    };

    socket.on('ml_demand_alert', handleMLAlert);
    socket.on('fleet_updated', handleFleetUpdate);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      socket.off('ml_demand_alert', handleMLAlert);
      socket.off('fleet_updated', handleFleetUpdate);
    };
  }, []);

  const handleNotificationClick = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    setIsProfileOpen(false);
    setUnreadCount(0);
  };

  const handleLogoutAction = () => {
    clearAuthSession();
    setIsProfileOpen(false);
    if (onLogout) onLogout();
  };

  const currentUser = user || {
    name: 'NITK Student',
    email: 'student@nitk.edu.in',
    role: 'STUDENT',
    roll_number: '221CS999'
  };

  const isDriver = currentUser.role === 'DRIVER';

  return (
    <nav className="w-full bg-[#121212] border-b border-[#282828] text-white relative z-50">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#1ED760] flex items-center justify-center text-black font-black text-lg shadow-md shadow-[#1ED760]/20">
            P
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tight text-white">
            PULSE<span className="text-[#1ED760]">RIDE</span>
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#181818] border border-[#282828] text-[#1ED760]">
            NITK SURATHKAL
          </span>
        </div>

      {/* Middle: Active Role Badge */}
      <div className="flex items-center">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wider uppercase flex items-center gap-1.5 ${
          isDriver 
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' 
            : 'bg-[#1ED760]/10 border-[#1ED760]/40 text-[#1ED760]'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isDriver ? 'bg-amber-400' : 'bg-[#1ED760]'} animate-pulse`} />
          {isDriver ? 'Driver Dashboard' : 'Student Portal'}
        </span>
      </div>

      {/* Right: Notifications & Profile */}
      <div className="flex items-center space-x-4 md:space-x-6 text-[#B3B3B3]">
        
        {/* Notification Icon */}
        <div className="relative flex items-center" ref={notificationRef}>
          <button 
            onClick={handleNotificationClick}
            className={`transition-colors focus:outline-none cursor-pointer flex items-center justify-center relative p-1.5 rounded-lg hover:bg-[#181818] ${
              isNotificationsOpen ? 'text-[#1ED760]' : 'hover:text-white'
            }`}
            title="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#1ED760] ring-2 ring-[#121212]" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-3 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-[#181818] border border-[#282828] rounded-xl shadow-2xl p-4 z-50 animate-fade-in text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Real-Time Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1ED760]/20 text-[#1ED760]">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-3 max-h-72 overflow-y-auto">
                {notifications.map(n => (
                  <div key={n.id} className="bg-[#121212] border border-[#282828] hover:border-[#383838] p-3 rounded-lg flex items-start gap-3 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#1ED760]">
                      {n.type === 'ml' ? '🤖' : (n.type === 'fleet' ? '🚐' : 'ℹ️')}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white truncate">{n.title}</span>
                        <span className="text-[10px] text-[#B3B3B3] shrink-0">{n.time}</span>
                      </div>
                      <p className="text-xs text-[#B3B3B3] mt-0.5 leading-snug break-words">
                        {n.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Trigger */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#181818] transition-colors focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#181818] border border-[#1ED760] text-[#1ED760] font-bold text-xs flex items-center justify-center">
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden md:inline-block text-xs font-bold text-white max-w-[120px] truncate">
              {currentUser.name}
            </span>
          </button>

          {/* Profile Dropdown */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-3 w-72 max-w-[calc(100vw-2rem)] bg-[#181818] border border-[#282828] rounded-xl shadow-2xl p-4 z-50 animate-fade-in text-white">
              
              <div className="flex items-center gap-3 pb-3 border-b border-[#282828]">
                <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#1ED760] text-[#1ED760] font-bold text-base flex items-center justify-center shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white text-sm truncate">{currentUser.name}</span>
                  <span className="text-[#B3B3B3] text-xs truncate">{currentUser.email}</span>
                  <span className="inline-block mt-1 self-start px-2 py-0.5 rounded text-[10px] font-semibold bg-[#121212] border border-[#282828] text-[#1ED760]">
                    {isDriver ? `Driver ID: ${currentUser.driver_id || 'DRV-001'}` : `Roll: ${currentUser.roll_number || 'NITK-EDU'}`}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1 pt-3">
                <button
                  onClick={handleLogoutAction}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
    </nav>
  );
};

export default Navbar;
