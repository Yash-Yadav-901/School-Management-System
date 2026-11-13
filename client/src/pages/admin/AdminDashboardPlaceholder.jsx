import React from 'react';
import { PageHeader } from '../../components/PageHeader.jsx';

export function AdminDashboardPlaceholder() {
  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of school statistics, attendance, and revenue metrics."
      />
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-slate-600 text-sm">
        Admin dashboard interface ready for Stage C integration.
      </div>
    </div>
  );
}

