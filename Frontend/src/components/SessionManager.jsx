import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

// Timeout values
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 60 * 1000; // Show warning 1 minute before logout

const SessionManager = () => {
  const { currentUser, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const navigate = useNavigate();
  
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  const handleSessionExpired = useCallback(() => {
    setShowWarning(false);
    logout();
    navigate('/auth?sessionExpired=true');
  }, [logout, navigate]);

  const resetTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    setShowWarning(false);

    if (currentUser) {
      warningRef.current = setTimeout(() => {
        setShowWarning(true);
      }, INACTIVITY_LIMIT - WARNING_TIME);

      timeoutRef.current = setTimeout(() => {
        handleSessionExpired();
      }, INACTIVITY_LIMIT);
    }
  }, [currentUser, handleSessionExpired]);

  const continueSession = () => {
    resetTimers();
  };

  useEffect(() => {
    // Events that reset the inactivity timer
    const events = ['mousemove', 'keydown', 'scroll', 'click'];
    
    const handleActivity = () => {
      // Only reset if we aren't currently showing the warning
      if (!showWarning) {
        resetTimers();
      }
    };

    if (currentUser) {
      resetTimers();
      events.forEach(event => window.addEventListener(event, handleActivity));
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [currentUser, showWarning, resetTimers]);

  // Here we would ideally render the warning modal, but let's assume it was rendered somewhere else
  // or we can render it right here!
  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-100">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-amber-600 text-2xl">
              schedule
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Session Expiring Soon</h3>
          <p className="text-slate-600 mb-6">
            You've been inactive for a while. Your session will expire in 1 minute to protect your account.
          </p>
          <div className="flex gap-3 w-full">
            <button
              onClick={handleSessionExpired}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Log Out Now
            </button>
            <button
              onClick={continueSession}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
