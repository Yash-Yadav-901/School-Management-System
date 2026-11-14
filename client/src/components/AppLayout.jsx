import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from './Button.jsx';

const NAV_CONFIG = {
  ADMIN: [
    { label: 'Dashboard', to: '/admin/dashboard' },
    { label: 'Students', to: '/admin/students' },
    { label: 'Academic Setup', to: '/admin/academic' },
    { label: 'Exams & Grades', to: '/admin/exams' },
    { label: 'Fees & Invoices', to: '/admin/fees' },
    { label: 'Reports', to: '/admin/reports' },
    { label: 'Audit Logs', to: '/admin/audit-logs' },
  ],
  TEACHER: [
    { label: 'My Sections', to: '/teacher/sections' },
    { label: 'Daily Attendance', to: '/teacher/attendance' },
    { label: 'Exams & Marks', to: '/teacher/exams' },
    { label: 'Attendance Reports', to: '/teacher/reports' },
  ],
  GUARDIAN: [
    { label: 'My Children', to: '/guardian/children' },
    { label: 'Fees & Invoices', to: '/guardian/fees' },
  ],
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navLinks = user ? NAV_CONFIG[user.role] || [] : [];

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger button */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                aria-label="Toggle navigation menu"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <div className="flex items-center">
                <span className="font-bold text-slate-900 tracking-tight text-lg">
                  SchoolSys
                </span>
              </div>
            </div>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* User Session Info & Logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {user?.role}
                </span>
                <span className="text-sm font-medium text-slate-800 truncate max-w-[160px]">
                  {user?.email}
                </span>
              </div>

              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Collapse Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-200 px-4 pt-2 pb-3 space-y-1 bg-white">
            <div className="pb-2 border-b border-slate-100 mb-2 sm:hidden">
              <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-brand-50 text-brand-700 mb-1">
                {user?.role}
              </span>
              <p className="text-sm font-medium text-slate-800">{user?.email}</p>
            </div>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}

