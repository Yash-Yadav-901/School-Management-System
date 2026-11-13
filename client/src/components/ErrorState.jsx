import React from 'react';
import { Button } from './Button.jsx';

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading data.',
  details = [],
  onRetry,
  className = '',
}) {
  return (
    <div
      role="alert"
      className={`rounded-lg bg-red-50 p-6 border border-red-200 text-slate-800 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-red-600 mt-0.5">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>

          {details && details.length > 0 && (
            <ul className="mt-2 text-xs text-red-700 list-disc list-inside space-y-1">
              {details.map((d, index) => (
                <li key={index}>
                  {d.field ? <strong className="capitalize">{d.field}: </strong> : null}
                  {d.message || String(d)}
                </li>
              ))}
            </ul>
          )}

          {onRetry && (
            <div className="mt-4">
              <Button size="sm" variant="secondary" onClick={onRetry}>
                Try again
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

