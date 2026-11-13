import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from '../components/Button.jsx';

export function NotFoundPage() {
  const { user, getRoleHome } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">404</h1>
      <h2 className="mt-2 text-xl font-bold text-slate-800">Page Not Found</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The page you are looking for does not exist or may have been relocated.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <Button variant="primary" onClick={() => navigate(user ? getRoleHome(user.role) : '/login')}>
          Return Home
        </Button>
      </div>
    </div>
  );
}

