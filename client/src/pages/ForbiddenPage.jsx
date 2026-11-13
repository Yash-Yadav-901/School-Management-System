import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../components/Button.jsx';

export function ForbiddenPage() {
  const { user, getRoleHome } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 15v2m0 0v2m0-2h2m-2 0H10m11-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">403</h1>
      <h2 className="mt-2 text-xl font-bold text-slate-800">Access Restricted</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        You do not have permission to view this page with your current role ({user?.role || 'Guest'}).
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" onClick={() => navigate(user ? getRoleHome(user.role) : '/login')}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}

