import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { formatPaiseToRupees } from '../../utils/formatCurrency.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const {
    data: dashboard,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient.get('/admin/dashboard'),
  });

  if (isLoading) {
    return <Spinner message="Loading school administrative metrics..." />;
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Administrator Dashboard" description="Overview of school metrics" />
        <ErrorState
          title="Could Not Load Dashboard"
          message={error?.message || 'Failed to fetch administrative summary.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  const { totals, todayAttendance, fees, recentAuditEntries } = dashboard;

  const auditColumns = [
    {
      key: 'action',
      header: 'Action',
      render: (log) => (
        <span className="font-semibold text-xs text-slate-800 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (log) => (
        <span className="text-xs text-slate-600">
          {log.entityType} <span className="font-mono text-slate-400">#{log.entityId}</span>
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Actor',
      render: (log) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800">{log.user?.email || 'System'}</span>
          {log.user?.role && (
            <span className="text-slate-400 ml-1 font-mono text-[10px]">({log.user.role})</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Timestamp',
      align: 'right',
      render: (log) => (
        <span className="font-mono text-xs text-slate-500">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="School Overview Dashboard"
        description="Real-time institutional metrics, daily attendance rate, fee balances, and audit activity."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/students')}>
              Manage Students
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/admin/fees')}>
              Fee Invoices
            </Button>
          </div>
        }
      />

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Enrolled Students
            </span>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {totals.students}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-brand-600 font-medium">
            <button type="button" onClick={() => navigate('/admin/students')} className="hover:underline">
              View student directory &rarr;
            </button>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Faculty & Teachers
            </span>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">
              {totals.teachers}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Active instructional staff
          </div>
        </div>

        {/* Today's Attendance Rate */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Today's Attendance Rate
              </span>
              <span className="text-[10px] font-mono text-slate-400">{todayAttendance.date}</span>
            </div>
            {todayAttendance.totalSessions > 0 && todayAttendance.attendanceRate !== null ? (
              <div className="mt-2 text-3xl font-extrabold text-brand-600">
                {todayAttendance.attendanceRate}%
              </div>
            ) : (
              <div className="mt-2 text-xs font-semibold text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                No attendance recorded today
              </div>
            )}
          </div>
          {todayAttendance.totalSessions > 0 ? (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3 text-xs">
              <span className="text-emerald-700 font-semibold">{todayAttendance.present} Present</span>
              <span className="text-amber-700 font-semibold">{todayAttendance.late} Late</span>
              <span className="text-rose-700 font-semibold">{todayAttendance.absent} Absent</span>
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              Pending daily session marking
            </div>
          )}
        </div>

        {/* Outstanding Fees */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Outstanding Fees
            </span>
            <div className="mt-2 text-3xl font-extrabold text-rose-600 font-mono">
              {formatPaiseToRupees(fees.outstandingFees)}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Invoiced: {formatPaiseToRupees(fees.totalInvoiced)}</span>
            <span className="text-emerald-700 font-medium">Paid: {formatPaiseToRupees(fees.totalPaid)}</span>
          </div>
        </div>
      </div>

      {/* Recent System Activity / Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Audit Log Entries</h2>
            <p className="text-xs text-slate-500">Latest immutable administrative actions and transaction events</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/audit-logs')}>
            View Full Audit Log
          </Button>
        </div>

        {recentAuditEntries.length === 0 ? (
          <EmptyState
            title="No Activity Logged"
            description="System activity will appear here as administrative actions occur."
          />
        ) : (
          <DataTable
            columns={auditColumns}
            data={recentAuditEntries}
            emptyMessage="No audit logs available."
          />
        )}
      </div>
    </div>
  );
}

