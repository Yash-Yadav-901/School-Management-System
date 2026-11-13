import React from 'react';

export function FormField({
  id,
  label,
  error,
  hint,
  required = false,
  className = '',
  children,
}) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700 flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-red-500 font-bold" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Render children passed, injecting accessibility attributes if it is a single valid element */}
      {React.isValidElement(children)
        ? React.cloneElement(children, {
            id,
            required,
            'aria-invalid': Boolean(error),
            'aria-describedby': describedBy,
          })
        : children}

      {hint && !error && (
        <p id={hintId} className="text-xs text-slate-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
