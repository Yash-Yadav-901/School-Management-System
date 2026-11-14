import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { Spinner } from '../components/Spinner.jsx';

export function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated, isLoading, getRoleHome } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner size="lg" label="Validating session..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // When an authenticated user navigates to an unauthorized role path (e.g. browser back button across sessions),
    // redirect them cleanly to their assigned role dashboard instead of trapping them on a 403 error page.
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <Outlet />;
}

