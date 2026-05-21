import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Important for cookies (if backend sets them)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    // Zustand persists auth state in localStorage under 'auth-storage'
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const { state } = JSON.parse(authStorage);
        if (state && state.token) {
          config.headers.Authorization = `Bearer ${state.token}`;
        }
      }
    } catch (error) {
      console.error('Error reading auth token from storage:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle global errors (like 401 Unauthorized)
api.interceptors.response.use(
  (response) => response.data, // Simplify response to just data
  (error) => {
    // If we get a 401, it means token expired or invalid
    if (error.response && error.response.status === 401) {
      // We can trigger a logout here if needed
      // useAuthStore.getState().logout() can be called from components, but calling it here causes circular dependency if not careful.
      // We'll let components handle 401s for now or dispatch an event.
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
