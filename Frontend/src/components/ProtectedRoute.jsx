import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export default function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useAuthStore();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 font-semibold">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          Restoring session…
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Redirect to auth page, remembering where the user wanted to go
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}
