import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * Frontend-only role gate.
 * Usage: <RoleProtectedRoute allowedRoles={["admin"]}>...</RoleProtectedRoute>
 */
export default function RoleProtectedRoute({ allowedRoles, children }) {
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
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentUser.role)) {
      const dashboardPath = currentUser.role === 'provider' ? '/provider/dashboard'
        : currentUser.role === 'admin' ? '/admin/dashboard'
        : '/user/dashboard';
      return <Navigate to={dashboardPath} replace />;
    }
  }

  return children;
}
