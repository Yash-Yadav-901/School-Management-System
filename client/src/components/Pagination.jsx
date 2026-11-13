import React from 'react';
import { Button } from './Button.jsx';

export function Pagination({
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  className = '',
}) {
  if (total === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-sm text-slate-600 ${className}`}
    >
      <div>
        Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-800">{total}</span> results
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>

        <span className="text-xs text-slate-500 px-1">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
