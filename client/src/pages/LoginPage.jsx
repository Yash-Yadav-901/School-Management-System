import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { FormField } from '../components/FormField.jsx';
import { Button } from '../components/Button.jsx';
import { ErrorState } from '../components/ErrorState.jsx';

const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@school.demo', pass: 'Admin@123', label: 'Full administrative access' },
  { role: 'Teacher 1', email: 'teacher1@school.demo', pass: 'Teacher@123', label: 'Grade 9-A (Math, Science)' },
  { role: 'Teacher 2', email: 'teacher2@school.demo', pass: 'Teacher@123', label: 'Grade 10-A/B (Math, Eng, Hist)' },
  { role: 'Guardian 1', email: 'guardian1@school.demo', pass: 'Guardian@123', label: 'Parent of Rahul & Anjali' },
  { role: 'Guardian 2', email: 'guardian2@school.demo', pass: 'Guardian@123', label: 'Parent of Priya & Karan' },
];

export function LoginPage() {
  const { login, getRoleHome } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  function fillDemo(demoEmail, demoPass) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setFieldErrors({});
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const newFieldErrors = {};
    if (!email.trim()) {
      newFieldErrors.email = 'Email is required.';
    }
    if (!password) {
      newFieldErrors.password = 'Password is required.';
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      if (newFieldErrors.email && emailRef.current) emailRef.current.focus();
      else if (newFieldErrors.password && passwordRef.current) passwordRef.current.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      const destination = location.state?.from?.pathname || getRoleHome(user.role);
      navigate(destination, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
      if (err.details && Array.isArray(err.details)) {
        const mapped = {};
        for (const d of err.details) {
          if (d.field) mapped[d.field] = d.message;
        }
        setFieldErrors(mapped);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
          S
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          Sign in to School Management
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your credentials to access your academic dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-md rounded-xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-6">
              <ErrorState title="Authentication Failed" message={error} />
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <FormField
              id="login-email"
              label="Email address"
              required
              error={fieldErrors.email}
            >
              <input
                ref={emailRef}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.demo"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
              />
            </FormField>

            <FormField
              id="login-password"
              label="Password"
              required
              error={fieldErrors.password}
            >
              <input
                ref={passwordRef}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          {/* Demo Accounts Panel */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              One-click Demo Accounts
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {DEMO_ACCOUNTS.map((demo) => (
                <button
                  key={demo.email}
                  type="button"
                  onClick={() => fillDemo(demo.email, demo.pass)}
                  className="flex items-center justify-between p-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-800">{demo.role}</span>
                    <span className="text-slate-500 ml-2">({demo.label})</span>
                  </div>
                  <span className="text-brand-600 font-medium">Select</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

