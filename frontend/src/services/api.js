import { io } from 'socket.io-client';

// Automatically detect host IP (works on localhost, mobile devices on Wi-Fi like 192.168.x.x, and cloud domains)
const getDynamicBackendBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const BASE_URL = getDynamicBackendBaseUrl();
export const API_BASE_URL = `${BASE_URL}/api`;
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BASE_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000
});

export const getAuthToken = () => {
  return localStorage.getItem('pulse_token');
};

export const getStoredUser = () => {
  const user = localStorage.getItem('pulse_user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch (e) {
    return null;
  }
};

export const setAuthSession = (token, user) => {
  localStorage.setItem('pulse_token', token);
  localStorage.setItem('pulse_user', JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem('pulse_token');
  localStorage.removeItem('pulse_user');
};

export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Network request failed');
  }
  return data;
};
