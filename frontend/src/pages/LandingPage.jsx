import React, { useState } from 'react';
import { apiRequest, setAuthSession } from '../services/api';

const LandingPage = ({ onNavigate }) => {
  const [role, setRole] = useState('STUDENT'); // 'STUDENT' | 'DRIVER'
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [driverId, setDriverId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password, role })
        });
        setAuthSession(data.token, data.user);
        if (onNavigate) {
          onNavigate(data.user.role === 'DRIVER' ? 'driver' : 'student');
        }
      } else {
        const data = await apiRequest('/auth/signup', {
          method: 'POST',
          body: JSON.stringify({
            name,
            email,
            password,
            role,
            roll_number: role === 'STUDENT' ? rollNumber : undefined,
            driver_id: role === 'DRIVER' ? driverId : undefined
          })
        });
        setAuthSession(data.token, data.user);
        if (onNavigate) {
          onNavigate(data.user.role === 'DRIVER' ? 'driver' : 'student');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#121212] text-white font-sans">
      
      {/* Left Branding & Features Showcase Banner */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 md:px-16 lg:px-20 border-b md:border-b-0 md:border-r border-[#282828] bg-gradient-to-br from-[#121212] via-[#151515] to-[#181818]">
        <div className="max-w-xl w-full flex flex-col justify-center">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#1ED760]/10 border border-[#1ED760]/30 rounded-full text-[#1ED760] text-xs font-black tracking-wider uppercase mb-6 self-start">
            <span className="w-2 h-2 rounded-full bg-[#1ED760] animate-pulse" />
            NITK Surathkal Shared Mobility
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#1ED760] mb-4">
            PULSE RIDE
          </h1>
          
          <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
            Intelligent Campus Mobility & Dynamic Ride Sharing System
          </h2>
          
          <p className="text-[#B3B3B3] text-base md:text-lg max-w-lg leading-relaxed mb-10">
            Automated zero-fare campus shared mobility platform powered by algorithmic batch dispatching, ML crowd forecasting, and QR-verified vehicle check-ins.
          </p>

          {/* Core Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div className="bg-[#181818] border border-[#282828] p-4 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center text-[#1ED760] font-black text-sm shrink-0">
                ⚡
              </div>
              <div>
                <h4 className="text-white font-bold text-xs">Smart Dispatch</h4>
                <p className="text-[#B3B3B3] text-[11px] mt-0.5 leading-snug">
                  Dynamic vehicle allocation dispatching Bikes, Buggies, or Buses by demand.
                </p>
              </div>
            </div>

            <div className="bg-[#181818] border border-[#282828] p-4 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center text-[#1ED760] font-black text-sm shrink-0">
                📱
              </div>
              <div>
                <h4 className="text-white font-bold text-xs">QR Verification</h4>
                <p className="text-[#B3B3B3] text-[11px] mt-0.5 leading-snug">
                  Per-stop dynamic QR codes with live boarding and dropping counters.
                </p>
              </div>
            </div>

            <div className="bg-[#181818] border border-[#282828] p-4 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center text-[#1ED760] font-black text-sm shrink-0">
                🤖
              </div>
              <div>
                <h4 className="text-white font-bold text-xs">ML Demand AI</h4>
                <p className="text-[#B3B3B3] text-[11px] mt-0.5 leading-snug">
                  XGBoost models forecasting crowd density and hotspot surges.
                </p>
              </div>
            </div>

            <div className="bg-[#181818] border border-[#282828] p-4 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1ED760]/10 border border-[#1ED760]/30 flex items-center justify-center text-[#1ED760] font-black text-sm shrink-0">
                🗺️
              </div>
              <div>
                <h4 className="text-white font-bold text-xs">Campus Routing</h4>
                <p className="text-[#B3B3B3] text-[11px] mt-0.5 leading-snug">
                  Optimized multi-stop routing across all 10 NITK campus nodes.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Right Login / Sign Up Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="bg-[#181818] border border-[#282828] p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md">
          
          {/* Role Selector Tabs (Student vs Driver) */}
          <div className="flex bg-[#121212] p-1 rounded-xl border border-[#282828] mb-6">
            <button
              type="button"
              onClick={() => { setRole('STUDENT'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                role === 'STUDENT' ? 'bg-[#1ED760] text-black shadow-md' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Student Portal
            </button>
            <button
              type="button"
              onClick={() => { setRole('DRIVER'); setErrorMsg(''); }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                role === 'DRIVER' ? 'bg-[#1ED760] text-black shadow-md' : 'text-[#B3B3B3] hover:text-white'
              }`}
            >
              Driver Portal
            </button>
          </div>

          <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {role === 'DRIVER' ? 'Driver ' : 'Student '}
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h3>
          <p className="text-[#B3B3B3] text-xs mb-6">
            {role === 'DRIVER' 
              ? 'Access vehicle controls, route timeline & QR verification scanner' 
              : 'Book rides, track vehicle arrivals & campus routes'}
          </p>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {!isLogin && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  required
                  className="bg-[#121212] border border-[#282828] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1ED760] text-sm"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider">
                NITK Edu Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={role === 'DRIVER' ? 'driver.name@nitk.edu.in' : 'student.roll@nitk.edu.in'}
                required
                className="bg-[#121212] border border-[#282828] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1ED760] text-sm"
              />
            </div>

            {!isLogin && role === 'STUDENT' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 211CS123"
                  required
                  className="bg-[#121212] border border-[#282828] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1ED760] text-sm"
                />
              </div>
            )}

            {!isLogin && role === 'DRIVER' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider">
                  Driver Badge / ID
                </label>
                <input
                  type="text"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  placeholder="e.g. DRV-NITK-042"
                  required
                  className="bg-[#121212] border border-[#282828] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1ED760] text-sm"
                />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[#B3B3B3] text-xs font-medium uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="bg-[#121212] border border-[#282828] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1ED760] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 bg-[#1ED760] hover:bg-[#1db954] text-black font-black px-8 py-3 rounded-lg cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 focus:outline-none w-full shadow-lg flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />}
              <span>{isLogin ? `Sign In as ${role === 'DRIVER' ? 'Driver' : 'Student'}` : `Sign Up as ${role === 'DRIVER' ? 'Driver' : 'Student'}`}</span>
            </button>
          </form>

          <div className="mt-6 text-center border-t border-[#282828] pt-5">
            <span className="text-[#B3B3B3] text-sm">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMsg('');
              }}
              className="text-[#1ED760] font-bold text-sm hover:underline transition-colors focus:outline-none cursor-pointer"
            >
              {isLogin ? 'Sign up for Pulse Ride' : 'Log in instead'}
            </button>
          </div>

        </div>
      </div>
      
    </div>
  );
};

export default LandingPage;