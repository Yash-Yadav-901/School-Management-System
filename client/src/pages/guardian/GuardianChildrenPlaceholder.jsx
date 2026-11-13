import React from 'react';
import { PageHeader } from '../../components/PageHeader.jsx';

export function GuardianChildrenPlaceholder() {
  return (
    <div>
      <PageHeader
        title="My Children"
        description="Students currently linked to your guardian account."
      />
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm text-slate-600 text-sm">
        Guardian overview interface ready for Stage B integration.
      </div>
    </div>
  );
}

