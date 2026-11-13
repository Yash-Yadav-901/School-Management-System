import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';

export function GuardianChildrenPage() {
  const navigate = useNavigate();

  const {
    data: children,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['guardian', 'children'],
    queryFn: () => apiClient.get('/guardian/children'),
  });

  if (isLoading) {
    return <Spinner message="Loading your linked children..." />;
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="My Children" description="Academic profile and fee status" />
        <ErrorState
          title="Could Not Load Children"
          message={error?.message || 'Failed to retrieve your linked student records.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div>
        <PageHeader title="My Children" description="Academic profile and fee status" />
        <EmptyState
          title="No Linked Children Found"
          description="You do not have any students linked to your guardian account yet. Please contact school administration."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Children"
        description="Monitor attendance, review academic report cards, and manage fee payments."
        actions={
          <Button
            variant="outline"
            onClick={() => navigate('/guardian/fees')}
          >
            All Fee Invoices
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {children.map((child) => (
          <div
            key={child.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
                    {child.relationship || 'Ward'}
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {child.name}
                  </h2>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm">
                  {child.name.charAt(0)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Class & Section</span>
                  <span className="font-semibold text-slate-800">
                    {child.section?.class?.name} - {child.section?.name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Roll Number</span>
                  <span className="font-mono font-medium text-slate-800">
                    {child.rollNumber || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Gender</span>
                  <span className="text-slate-800">{child.gender || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Date of Birth</span>
                  <span className="text-slate-800 font-mono text-xs">{child.dob || '—'}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/guardian/children/${child.id}`)}
              >
                View Overview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/guardian/fees?studentId=${child.id}`)}
              >
                View Invoices
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

