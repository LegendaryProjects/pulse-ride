import React, { useState, useRef, useEffect } from 'react';

const Navbar = ({ userRole = 'student', onLogout }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [profileView, setProfileView] = useState('menu'); // 'menu' | 'changePassword'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState({ type: '', message: '' });

  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
        setProfileView('menu');
        setPasswordStatus({ type: '', message: '' });
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const studentData = {
    name: 'Rahul Sharma',
    email: 'rahul.211cs123@nitk.edu.in',
    rollNo: '211CS123',
    initials: 'RS'
  };

  const driverData = {
    name: 'Ramesh Kumar',
    email: 'ramesh.driver@nitk.edu.in',
    driverId: 'DRV-NITK-042',
    initials: 'RK'
  };

  const user = userRole === 'driver' ? driverData : studentData;

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword) {
      setPasswordStatus({ type: 'error', message: 'Please enter your current password.' });
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      setProfileView('menu');
      setPasswordStatus({ type: '', message: '' });
    }, 1500);
  };

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-[#121212] border-b border-[#282828] text-white relative z-[9999]">
      {/* Left: Brand Name */}
      <div className="text-2xl font-bold tracking-tight text-[#1ED760]">
        PULSE RIDE
      </div>

      {/* Middle: Navigation Links */}
      <div className="hidden md:flex space-x-8 mt-1">
        <button
          className="pb-1 transition-all duration-200 text-white font-bold border-b-2 border-[#1ED760]"
        >
          Dashboard
        </button>
      </div>

      {/* Right: Icons */}
      <div className="flex items-center space-x-6 text-[#B3B3B3]">
        {/* Notification Icon / Trigger */}
        <div className="relative flex items-center" ref={notificationRef}>
          <button 
            onClick={() => {
              setIsNotificationsOpen(!isNotificationsOpen);
              setIsProfileOpen(false);
            }}
            className={`transition-colors focus:outline-none cursor-pointer flex items-center justify-center relative p-1 ${
              isNotificationsOpen ? 'text-[#1ED760]' : 'hover:text-white'
            }`}
            title="Notifications"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* Unread indicator dot */}
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1ED760] animate-pulse" />
          </button>

          {/* Notification Dropdown Menu */}
          {isNotificationsOpen && (
            <div className="absolute right-0 top-full mt-3 w-80 bg-[#181818] border border-[#282828] rounded-xl shadow-2xl p-4 z-[9999] animate-fade-in text-white">
              <div className="flex items-center justify-between pb-3 border-b border-[#282828]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">Notifications</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1ED760]/20 text-[#1ED760] border border-[#1ED760]/30">
                    1 New
                  </span>
                </div>
                <button 
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-xs text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              {/* Notifications List */}
              <div className="flex flex-col gap-2 pt-3">
                <div className="bg-[#121212] border border-[#282828] hover:border-[#383838] p-3 rounded-lg flex items-start gap-3 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center shrink-0 mt-0.5 text-[#1ED760]">
                    {userRole === 'driver' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">
                        {userRole === 'driver' ? 'New Pickup Request' : 'Bus Arrived'}
                      </span>
                      <span className="text-[10px] text-[#B3B3B3]">
                        {userRole === 'driver' ? 'Just now' : '2 mins ago'}
                      </span>
                    </div>
                    <p className="text-xs text-[#B3B3B3] mt-1 leading-snug">
                      {userRole === 'driver' 
                        ? 'New student pickup at "Guest House" location.' 
                        : 'Your Bus Arrived at "LHC-C" Location.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Profile Icon / Trigger */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotificationsOpen(false);
              setProfileView('menu');
              setPasswordStatus({ type: '', message: '' });
            }}
            className={`transition-colors focus:outline-none cursor-pointer flex items-center justify-center ${
              isProfileOpen ? 'text-[#1ED760]' : 'hover:text-white'
            }`}
            title="Profile & Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 top-full mt-3 w-80 bg-[#181818] border border-[#282828] rounded-xl shadow-2xl p-4 z-[9999] animate-fade-in text-white">
              
              {/* User Info Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-[#282828]">
                <div className="w-10 h-10 rounded-full bg-[#121212] border border-[#1ED760] text-[#1ED760] flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-white text-sm truncate">{user.name}</span>
                  <span className="text-[#B3B3B3] text-xs truncate">{user.email}</span>
                  <span className="inline-block mt-1 self-start px-2 py-0.5 rounded text-[11px] font-semibold bg-[#121212] border border-[#282828] text-[#1ED760]">
                    {userRole === 'driver' ? `Driver ID: ${user.driverId}` : `Roll No: ${user.rollNo}`}
                  </span>
                </div>
              </div>

              {/* View 1: Main Menu */}
              {profileView === 'menu' && (
                <div className="flex flex-col gap-1 pt-3">
                  {/* Change Password Option */}
                  <button
                    onClick={() => {
                      setProfileView('changePassword');
                      setPasswordStatus({ type: '', message: '' });
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-[#282828] text-[#B3B3B3] hover:text-white transition-colors cursor-pointer text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#1ED760]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Change Password</span>
                  </button>

                  {/* Logout Option */}
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      if (onLogout) onLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-red-500/10 text-[#E50914] transition-colors cursor-pointer text-left"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#E50914]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Logout</span>
                  </button>
                </div>
              )}

              {/* View 2: Change Password Form */}
              {profileView === 'changePassword' && (
                <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3 pt-3">
                  <div className="flex items-center justify-between pb-1 border-b border-[#282828]/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#B3B3B3]">
                      Change Password
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileView('menu');
                        setPasswordStatus({ type: '', message: '' });
                      }}
                      className="text-xs text-[#1ED760] hover:underline cursor-pointer"
                    >
                      ← Back
                    </button>
                  </div>

                  {passwordStatus.message && (
                    <div className={`p-2 rounded text-xs font-semibold ${
                      passwordStatus.type === 'error' 
                        ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                        : 'bg-green-500/15 text-green-400 border border-green-500/30'
                    }`}>
                      {passwordStatus.message}
                    </div>
                  )}

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#B3B3B3] font-medium">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                      className="bg-[#121212] border border-[#282828] text-white px-3 py-1.5 rounded text-xs focus:outline-none focus:border-[#1ED760] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#B3B3B3] font-medium">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="bg-[#121212] border border-[#282828] text-white px-3 py-1.5 rounded text-xs focus:outline-none focus:border-[#1ED760] transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-[#B3B3B3] font-medium">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="bg-[#121212] border border-[#282828] text-white px-3 py-1.5 rounded text-xs focus:outline-none focus:border-[#1ED760] transition-colors"
                    />
                  </div>

                  <div className="flex gap-2 mt-1">
                    <button
                      type="submit"
                      className="flex-1 bg-[#1ED760] hover:bg-[#1db954] text-black font-bold py-2 rounded text-xs transition-colors cursor-pointer"
                    >
                      Update Password
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileView('menu');
                        setPasswordStatus({ type: '', message: '' });
                      }}
                      className="px-3 bg-[#121212] hover:bg-[#282828] border border-[#282828] text-[#B3B3B3] font-medium py-2 rounded text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
