import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { FormField } from '../../components/FormField.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';

function getDefaultFromDate() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export function SectionAttendanceSummary() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [sectionId, setSectionId] = useState(searchParams.get('sectionId') || '');
  const [fromDate, setFromDate] = useState(searchParams.get('from') || getDefaultFromDate());
  const [toDate, setToDate] = useState(searchParams.get('to') || getToday());
  const [session, setSession] = useState(searchParams.get('session') || '');

  // Fetch teacher's sections
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ['teacher', 'sections'],
    queryFn: () => apiClient.get('/teacher/sections'),
  });

  useEffect(() => {
    if (!sectionId && sections && sections.length > 0) {
      setSectionId(String(sections[0].id));
    }
  }, [sectionId, sections]);

  // Fetch summary metrics
  const summaryQueryKey = ['attendance', 'summary', sectionId, fromDate, toDate, session];
  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    error: summaryErrObj,
    refetch,
  } = useQuery({
    queryKey: summaryQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (session) params.set('session', session);
      return apiClient.get(`/attendance/summary/section/${sectionId}?${params.toString()}`);
    },
    enabled: Boolean(sectionId),
  });

  // Fetch detailed records list for the table
  const recordsQueryKey = ['attendance', 'records', sectionId, fromDate, toDate, session];
  const {
    data: recordsData,
    isLoading: recordsLoading,
  } = useQuery({
    queryKey: recordsQueryKey,
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('sectionId', sectionId);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);
      if (session) params.set('session', session);
      params.set('pageSize', '50');
      return apiClient.get(`/attendance?${params.toString()}`);
    },
    enabled: Boolean(sectionId),
  });

  function handleFilterSubmit(e) {
    e.preventDefault();
    setSearchParams({
      sectionId,
      from: fromDate,
      to: toDate,
      ...(session ? { session } : {}),
    });
  }

  const columns = [
    { key: 'date', header: 'Date', render: (r) => <span className="font-mono text-xs">{r.date}</span> },
    { key: 'session', header: 'Session', render: (r) => <span className="text-xs uppercase font-medium">{r.session}</span> },
    { key: 'student', header: 'Student', render: (r) => <span className="font-medium text-slate-900">{r.student?.name}</span> },
    { key: 'roll', header: 'Roll No', render: (r) => <span className="text-slate-500 font-mono text-xs">{r.student?.rollNumber || '—'}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const colors = {
          PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          LATE: 'bg-amber-50 text-amber-700 border-amber-200',
          ABSENT: 'bg-rose-50 text-rose-700 border-rose-200',
        };
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${colors[r.status] || 'bg-slate-100'}`}>
            {r.status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance Reports"
        description="Aggregate attendance statistics and audit records for your assigned sections."
      />

      {/* Filter Controls */}
      <form onSubmit={handleFilterSubmit} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormField id="summary-section" label="Section">
            <select
              id="summary-section"
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
            >
              {sections?.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.class.name} - Section {sec.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="summary-from" label="Start Date">
            <input
              id="summary-from"
              type="date"
              max={getToday()}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
            />
          </FormField>

          <FormField id="summary-to" label="End Date">
            <input
              id="summary-to"
              type="date"
              max={getToday()}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
            />
          </FormField>

          <FormField id="summary-session" label="Session Filter">
            <select
              id="summary-session"
              value={session}
              onChange={(e) => setSession(e.target.value)}
              className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
            >
              <option value="">All Sessions</option>
              <option value="MORNING">Morning Only</option>
              <option value="AFTERNOON">Afternoon Only</option>
            </select>
          </FormField>
        </div>

        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="primary" size="sm">
            Apply Filter
          </Button>
        </div>
      </form>

      {/* Metrics Summary Cards */}
      {summaryLoading ? (
        <Spinner message="Computing attendance rate..." />
      ) : summaryError ? (
        <ErrorState
          title="Could Not Load Summary"
          message={summaryErrObj?.message || 'Error calculating section statistics.'}
          onRetry={refetch}
        />
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Overall Rate</div>
            <div className="mt-1 text-2xl font-bold text-brand-600">{summary.attendanceRate}</div>
            <div className="text-xs text-slate-400 mt-0.5">(Present + Late) / Total</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Entries</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-emerald-600">Present</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{summary.PRESENT}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-amber-600">Late</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{summary.LATE}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wider text-rose-600">Absent</div>
            <div className="mt-1 text-2xl font-bold text-rose-700">{summary.ABSENT}</div>
          </div>
        </div>
      ) : null}

      {/* Detailed Records Log */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          Recent Logged Entries
        </h2>
        {recordsLoading ? (
          <Spinner message="Loading attendance records..." />
        ) : !recordsData?.data || recordsData.data.length === 0 ? (
          <EmptyState
            title="No Records Found"
            description="No attendance entries were found for the selected section and date range."
          />
        ) : (
          <DataTable
            columns={columns}
            data={recordsData.data}
            emptyMessage="No records matching filter."
          />
        )}
      </div>
    </div>
  );
}
