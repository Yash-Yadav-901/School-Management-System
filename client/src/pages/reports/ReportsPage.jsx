import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import { apiClient } from '../../api/client.js';
import { formatPaiseToRupees } from '../../utils/formatCurrency.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { FormField } from '../../components/FormField.jsx';
import { DataTable } from '../../components/DataTable.jsx';

export function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'academic' | 'fees'

  // Filter states
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Section options query (Teacher sees own sections, Admin sees all sections)
  const { data: sectionsData } = useQuery({
    queryKey: [isTeacher ? 'teacher' : 'admin', 'sections'],
    queryFn: () => (isTeacher ? apiClient.get('/teacher/sections') : apiClient.get('/admin/sections?pageSize=100').then((r) => r.data)),
  });
  const sections = sectionsData || [];

  // 1. Attendance Report Query
  const {
    data: attendanceReport,
    isLoading: attLoading,
    isError: attError,
    error: attErrObj,
    refetch: refetchAttendance,
  } = useQuery({
    queryKey: ['reports', 'attendance', selectedSectionId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSectionId) params.set('sectionId', selectedSectionId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient.get(`/reports/attendance?${params.toString()}`);
    },
    enabled: activeTab === 'attendance',
  });

  // 2. Academic Report Query
  const {
    data: academicReport,
    isLoading: acadLoading,
    isError: acadError,
    error: acadErrObj,
    refetch: refetchAcademic,
  } = useQuery({
    queryKey: ['reports', 'academic', selectedSectionId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSectionId) params.set('sectionId', selectedSectionId);
      return apiClient.get(`/reports/academic?${params.toString()}`);
    },
    enabled: activeTab === 'academic',
  });

  // 3. Fee Report Query (Admin only)
  const {
    data: feeReport,
    isLoading: feeLoading,
    isError: feeError,
    error: feeErrObj,
    refetch: refetchFee,
  } = useQuery({
    queryKey: ['reports', 'fees', selectedSectionId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSectionId) params.set('sectionId', selectedSectionId);
      return apiClient.get(`/reports/fees?${params.toString()}`);
    },
    enabled: activeTab === 'fees' && isAdmin,
  });

  const studentAttColumns = [
    { key: 'name', header: 'Student Name', render: (s) => <span className="font-semibold text-slate-900">{s.name}</span> },
    { key: 'roll', header: 'Roll No', render: (s) => <span className="font-mono text-xs">{s.rollNumber || '—'}</span> },
    { key: 'present', header: 'Present', render: (s) => <span className="text-emerald-700 font-semibold">{s.present}</span> },
    { key: 'late', header: 'Late', render: (s) => <span className="text-amber-700 font-semibold">{s.late}</span> },
    { key: 'absent', header: 'Absent', render: (s) => <span className="text-rose-700 font-semibold">{s.absent}</span> },
    { key: 'total', header: 'Total Sessions', render: (s) => <span className="font-mono">{s.total}</span> },
    {
      key: 'rate',
      header: 'Attendance Rate',
      render: (s) => (
        <span className={`font-mono font-bold text-xs ${s.attendanceRate >= 75 ? 'text-emerald-700' : 'text-rose-600'}`}>
          {s.attendanceRate}%
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Institutional Analytics & Reports"
        description="Comprehensive audit reporting across attendance, exam performance distributions, and fee revenue."
      />

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'attendance'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Attendance Reports
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'academic'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Academic Performance
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('fees')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'fees'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Fee Revenue Ledger
            </button>
          )}
        </nav>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-end justify-between">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <FormField id="rep-sec" label="Section Filter">
            <select
              id="rep-sec"
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">{isTeacher ? 'All Assigned Sections' : 'All Sections'}</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  {sec.class?.name} - {sec.name}
                </option>
              ))}
            </select>
          </FormField>

          {activeTab === 'attendance' && (
            <>
              <FormField id="rep-start" label="From Date">
                <input
                  id="rep-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>

              <FormField id="rep-end" label="To Date">
                <input
                  id="rep-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>
            </>
          )}
        </div>
      </div>

      {/* TAB 1: ATTENDANCE REPORT */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {attLoading ? (
            <Spinner message="Computing attendance analytics..." />
          ) : attError ? (
            <ErrorState title="Failed to Load Report" message={attErrObj?.message} onRetry={refetchAttendance} />
          ) : attendanceReport ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Attendance Rate</span>
                  <div className="mt-1 text-2xl font-bold text-brand-600">{attendanceReport.attendanceRate}%</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-slate-500 uppercase">Total Sessions</span>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{attendanceReport.totalSessions}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-emerald-700 uppercase">Present</span>
                  <div className="mt-1 text-2xl font-bold text-emerald-700">{attendanceReport.counts?.present || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-amber-700 uppercase">Late</span>
                  <div className="mt-1 text-2xl font-bold text-amber-700">{attendanceReport.counts?.late || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold text-rose-700 uppercase">Absent</span>
                  <div className="mt-1 text-2xl font-bold text-rose-700">{attendanceReport.counts?.absent || 0}</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Student Attendance Breakdown</h3>
                {attendanceReport.students?.length === 0 ? (
                  <EmptyState title="No Student Data" description="No attendance sessions recorded for this range." />
                ) : (
                  <DataTable
                    columns={studentAttColumns}
                    data={attendanceReport.students}
                    emptyMessage="No student attendance data found."
                  />
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* TAB 2: ACADEMIC REPORT */}
      {activeTab === 'academic' && (
        <div className="space-y-6">
          {acadLoading ? (
            <Spinner message="Computing examination performance distributions..." />
          ) : acadError ? (
            <ErrorState title="Failed to Load Academic Report" message={acadErrObj?.message} onRetry={refetchAcademic} />
          ) : academicReport?.exams?.length === 0 ? (
            <EmptyState title="No Exam Records" description="No examinations matched the section filter." />
          ) : (
            <div className="space-y-6">
              {academicReport.exams.map((exam) => (
                <div key={exam.examId} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{exam.examName}</h3>
                      <div className="text-xs text-slate-500 font-mono">
                        Subject: <strong>{exam.subject}</strong> | Section: <strong>{exam.section}</strong> | Max: {exam.maxMarks}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono">
                      <div>Avg: <strong className="text-brand-600 font-bold">{exam.averageMarks}</strong> ({exam.averagePercentage}%)</div>
                      <div className="border-l border-slate-300 pl-3">Highest: <strong className="text-emerald-700">{exam.highestMarks}</strong></div>
                      <div className="border-l border-slate-300 pl-3">Lowest: <strong className="text-rose-700">{exam.lowestMarks}</strong></div>
                      <div className="border-l border-slate-300 pl-3">Total Evaluated: <strong>{exam.totalEvaluated}</strong></div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                      Letter Grade Distribution:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(exam.gradeDistribution || {}).map(([grade, count]) => (
                        <div key={grade} className="flex items-center border border-slate-200 rounded-md bg-slate-50 px-3 py-1.5 text-xs">
                          <span className="font-extrabold text-brand-700 mr-2">{grade}</span>
                          <span className="font-mono text-slate-800 font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FEES REPORT (Admin Only) */}
      {activeTab === 'fees' && isAdmin && (
        <div className="space-y-6">
          {feeLoading ? (
            <Spinner message="Computing ledger financial reconciliation..." />
          ) : feeError ? (
            <ErrorState title="Failed to Load Fee Report" message={feeErrObj?.message} onRetry={refetchFee} />
          ) : feeReport ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold uppercase text-slate-500">Total Billed Invoiced</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
                    {formatPaiseToRupees(feeReport.overall?.totalInvoiced || 0)}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold uppercase text-emerald-700">Total Verified Collections</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-emerald-700">
                    {formatPaiseToRupees(feeReport.overall?.totalPaid || 0)}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs font-semibold uppercase text-rose-600">Net Outstanding Debt</span>
                  <div className="mt-2 text-2xl font-bold font-mono text-rose-600">
                    {formatPaiseToRupees(feeReport.overall?.outstanding || 0)}
                  </div>
                </div>
              </div>

              {feeReport.sections && feeReport.sections.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">Section Revenue Breakdown</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-2.5 text-left font-semibold">Section</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Invoiced</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Collected</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Outstanding</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {feeReport.sections.map((sec) => (
                          <tr key={sec.sectionId}>
                            <td className="px-4 py-2.5 font-medium text-slate-900">{sec.sectionName}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{formatPaiseToRupees(sec.invoiced)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-emerald-700">{formatPaiseToRupees(sec.paid)}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-600">{formatPaiseToRupees(sec.outstanding)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
