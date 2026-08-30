import React, { useState } from 'react';
import StudentPage from './pages/StudentPage';
import DriverPage from './pages/DriverPage';

function App() {
  // State to manage which dashboard is currently visible
  const [currentView, setCurrentView] = useState('home');

  if (currentView === 'student') return <StudentPage />;
  if (currentView === 'driver') return <DriverPage />;

  // Home Selection View
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white font-sans p-6">
      
      <h1 className="text-5xl font-bold tracking-tight text-[#1ED760] mb-4">
        Pulse Ride
      </h1>
      <p className="text-[#B3B3B3] mb-12 text-lg text-center max-w-md">
        Select a dashboard environment to test the UI components.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-6 w-full max-w-2xl justify-center">
        <button 
          onClick={() => setCurrentView('student')}
          className="flex-1 bg-[#181818] border border-[#282828] hover:border-[#1ED760] hover:text-[#1ED760] text-white px-8 py-10 rounded-lg text-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          Student Dashboard
        </button>
        
        <button 
          onClick={() => setCurrentView('driver')}
          className="flex-1 bg-[#181818] border border-[#282828] hover:border-[#1ED760] hover:text-[#1ED760] text-white px-8 py-10 rounded-lg text-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          Driver Dashboard
        </button>
      </div>

    </div>
  );
}

export default App;