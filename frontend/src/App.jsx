import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import StudentPage from './pages/StudentPage';
import DriverPage from './pages/DriverPage';
import { getStoredUser, clearAuthSession } from './services/api';

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      setCurrentView(user.role === 'DRIVER' ? 'driver' : 'student');
    } else {
      setCurrentView('landing');
    }
  }, []);

  const handleNavigate = (view) => {
    const user = getStoredUser();
    setCurrentUser(user);
    setCurrentView(view);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setCurrentView('landing');
  };

  if (currentView === 'student') {
    return <StudentPage onLogout={handleLogout} />;
  }

  if (currentView === 'driver') {
    return <DriverPage onLogout={handleLogout} />;
  }

  return <LandingPage onNavigate={handleNavigate} />;
}

export default App;