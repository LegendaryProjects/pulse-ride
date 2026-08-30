import React, { useState } from 'react';

const LandingPage = ({ onNavigate }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.endsWith('@nitk.edu.in')) {
      alert('Please use a valid NITK Edu Email.');
      return;
    }
    console.log(`${isLogin ? 'Logging in' : 'Signing up'} with:`, { email, password });
    
    if (onNavigate) onNavigate('home');
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#121212] text-white font-sans">
      
      <div className="flex-1 flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 border-b md:border-b-0 md:border-r border-[#282828]">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[#1ED760] mb-6">
          PULSE RIDE
        </h1>
        <h2 className="text-2xl md:text-3xl font-medium text-white mb-4">
          Intelligent Campus Mobility & Ride Sharing System
        </h2>
        <p className="text-[#B3B3B3] text-lg max-w-lg leading-relaxed">
          Automated, zero-fare ride-sharing and dynamic routing platform for college-managed vehicle fleets.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 md:p-12">
        <div className="bg-[#181818] border border-[#282828] p-8 md:p-10 rounded-lg shadow-2xl w-full max-w-md">
          
          <h3 className="text-3xl font-bold text-white mb-8">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h3>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[#B3B3B3] text-sm font-medium uppercase tracking-wider">
                NITK Edu Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name.rollnumber@nitk.edu.in"
                required
                className="bg-[#121212] border border-[#282828] text-white px-4 py-3 rounded focus:outline-none focus:border-[#1ED760] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[#B3B3B3] text-sm font-medium uppercase tracking-wider">
                {isLogin ? 'Password' : 'IRIS Password'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="bg-[#121212] border border-[#282828] text-white px-4 py-3 rounded focus:outline-none focus:border-[#1ED760] transition-colors"
              />
            </div>

            <button
              type="submit"
              className="mt-4 bg-[#1ED760] text-black font-bold px-8 py-3 rounded cursor-pointer hover:scale-[1.02] transition-transform duration-200 focus:outline-none w-full"
            >
              {isLogin ? 'Login' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[#282828] pt-6">
            <span className="text-[#B3B3B3]">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
              }}
              className="text-white font-bold hover:text-[#1ED760] transition-colors focus:outline-none cursor-pointer"
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