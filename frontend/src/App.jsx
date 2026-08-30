import React, { useState } from 'react';
import LandingPage from './pages/LandingPage';
import StudentPage from './pages/StudentPage';
import DriverPage from './pages/DriverPage';

function App() {
  const [currentView, setCurrentView] = useState('home');

  if (currentView === 'landing') return <LandingPage onNavigate={setCurrentView} />;
  if (currentView === 'student') return <StudentPage />;
  if (currentView === 'driver') return <DriverPage />;

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white font-sans p-6 animate-fade-in">
      <h1 className="text-5xl font-bold tracking-tight text-[#1ED760] mb-4">
        Pulse Ride
      </h1>
      <p className="text-[#B3B3B3] mb-12 text-lg text-center max-w-md">
        Select a component page to preview your UI.
      </p>
      
      <div className="flex flex-col gap-4 w-full max-w-md">
        <button 
          onClick={() => setCurrentView('landing')}
          className="w-full bg-[#181818] border border-[#282828] hover:border-[#1ED760] hover:text-[#1ED760] text-white px-8 py-6 rounded-lg text-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        >
          Landing Page
        </button>

        <button 
          onClick={() => setCurrentView('student')}
          className="w-full bg-[#181818] border border-[#282828] hover:border-[#1ED760] hover:text-[#1ED760] text-white px-8 py-6 rounded-lg text-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        >
          Student Dashboard
        </button>
        
        <button 
          onClick={() => setCurrentView('driver')}
          className="w-full bg-[#181818] border border-[#282828] hover:border-[#1ED760] hover:text-[#1ED760] text-white px-8 py-6 rounded-lg text-xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer"
        >
          Driver Dashboard
        </button>
      </div>
    </div>
  );
}

export default App;