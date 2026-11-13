import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { formatPaiseToRupees } from '../../utils/formatCurrency.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';

export function ChildOverviewPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('report-card'); // 'report-card' | 'attendance' | 'fees'

  // Fetch report card (also gives student profile)
  const {
    data: reportCardData,
    isLoading: reportLoading,
    isError: reportError,
    error: reportErrObj,
  } = useQuery({
    queryKey: ['guardian', 'report-card', studentId],
    queryFn: () => apiClient.get(`/exams/report-card/${studentId}`),
  });

  // Fetch attendance summary
  const {
    data: attendanceSummary,
    isLoading: attendanceLoading,
    isError: attendanceError,
  } = useQuery({
    queryKey: ['guardian', 'attendance-summary', studentId],
    queryFn: () => apiClient.get(`/attendance/summary/student/${studentId}`),
  });

  // Fetch fee summary
  const {
    data: feeSummary,
    isLoading: feeLoading,
    isError: feeError,
  } = useQuery({
    queryKey: ['guardian', 'fee-summary', studentId],
    queryFn: () => apiClient.get(`/fees/student-summary/${studentId}`),
  });

  const student = reportCardData?.student;

  if (reportLoading && !student) {
    return <Spinner message="Loading child academic overview..." />;
  }

  if (reportError) {
    return (
      <ErrorState
        title="Could Not Load Child Overview"
        message={reportErrObj?.message || 'Access denied or student record not found.'}
      />
    );
  }

  const exams = reportCardData?.exams || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={student ? student.name : 'Child Overview'}
        description={
          student?.section
            ? `${student.section.class || ''} - Section ${student.section.name} | Roll No: ${student.rollNumber || '—'}`
            : 'Academic Performance & Financial Overview'
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/guardian/children')}>
              All Children
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate(`/guardian/fees?studentId=${studentId}`)}>
              View Invoices
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('report-card')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'report-card'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Academic Report Card ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'attendance'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Attendance Summary
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'fees'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Fees Overview
          </button>
        </nav>
      </div>

      {/* TAB 1: ACADEMIC REPORT CARD */}
      {activeTab === 'report-card' && (
        <div className="space-y-6">
          {exams.length === 0 ? (
            <EmptyState
              title="No Exam Results Available"
              description="No exam evaluation results have been published for this student yet."
            />
          ) : (
            exams.map((exam, idx) => (
              <div
                key={`${exam.examName}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{exam.examName}</h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">Date: {exam.examDate}</div>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-xs text-slate-500 block uppercase">Overall Grade</span>
                      <span className="text-xl font-bold text-brand-600">{exam.overallGrade}</span>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <span className="text-xs text-slate-500 block uppercase">Total Percentage</span>
                      <span className="text-lg font-bold text-slate-900">{exam.percentage}%</span>
                    </div>
                    <div className="border-l border-slate-200 pl-4">
                      <span className="text-xs text-slate-500 block uppercase">Marks</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {exam.totalMarksObtained} / {exam.totalMaxMarks}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 text-xs font-semibold uppercase tracking-wider">
                        <th className="px-4 py-2.5 text-left">Subject</th>
                        <th className="px-4 py-2.5 text-center">Marks Obtained</th>
                        <th className="px-4 py-2.5 text-center">Max Marks</th>
                        <th className="px-4 py-2.5 text-center">Percentage</th>
                        <th className="px-4 py-2.5 text-right">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exam.subjects.map((sub) => (
                        <tr key={sub.subjectId} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-medium text-slate-900">
                            {sub.subjectName}{' '}
                            <span className="text-xs text-slate-400 font-mono">({sub.subjectCode})</span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono font-medium">{sub.marksObtained}</td>
                          <td className="px-4 py-2.5 text-center font-mono text-slate-500">{sub.maxMarks}</td>
                          <td className="px-4 py-2.5 text-center font-mono">{sub.percentage}%</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                              {sub.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: ATTENDANCE SUMMARY */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {attendanceLoading ? (
            <Spinner message="Loading attendance metrics..." />
          ) : attendanceError ? (
            <ErrorState title="Attendance Unavailable" message="Could not load attendance summary." />
          ) : attendanceSummary ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                  <div className="text-xs font-medium uppercase tracking-wider text-brand-700">Attendance Rate</div>
                  <div className="mt-1 text-3xl font-extrabold text-brand-800">
                    {attendanceSummary.attendanceRate}
                  </div>
                  <div className="text-xs text-brand-600 mt-1">Present + Late ratio</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Recorded</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{attendanceSummary.total}</div>
                  <div className="text-xs text-slate-400 mt-1">Sessions evaluated</div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="text-xs font-medium uppercase tracking-wider text-emerald-700">Present</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-800">{attendanceSummary.PRESENT}</div>
                  <div className="text-xs text-emerald-600 mt-1">On time sessions</div>
                </div>
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <div className="text-xs font-medium uppercase tracking-wider text-amber-700">Late</div>
                  <div className="mt-1 text-2xl font-bold text-amber-800">{attendanceSummary.LATE}</div>
                  <div className="text-xs text-amber-600 mt-1">Delayed arrivals</div>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                  <div className="text-xs font-medium uppercase tracking-wider text-rose-700">Absent</div>
                  <div className="mt-1 text-2xl font-bold text-rose-800">{attendanceSummary.ABSENT}</div>
                  <div className="text-xs text-rose-600 mt-1">Missed sessions</div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No Attendance Recorded" description="No attendance records logged for this student." />
          )}
        </div>
      )}

      {/* TAB 3: FEES OVERVIEW */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          {feeLoading ? (
            <Spinner message="Loading financial ledger..." />
          ) : feeError ? (
            <ErrorState title="Fees Unavailable" message="Could not fetch student fee summary." />
          ) : feeSummary ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                  <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Invoiced</span>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {formatPaiseToRupees(feeSummary.totalInvoiced)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total school fee assessments</p>
                </div>

                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                  <span className="text-xs font-medium uppercase tracking-wider text-emerald-700">Total Paid</span>
                  <div className="mt-2 text-2xl font-bold text-emerald-800">
                    {formatPaiseToRupees(feeSummary.totalPaid)}
                  </div>
                  <p className="text-xs text-emerald-600 mt-1">Verified payments credited</p>
                </div>

                <div className={`p-5 rounded-xl border ${
                  feeSummary.outstandingBalance > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}>
                  <span className="text-xs font-medium uppercase tracking-wider">Outstanding Balance</span>
                  <div className="mt-2 text-2xl font-bold">
                    {formatPaiseToRupees(feeSummary.outstandingBalance)}
                  </div>
                  <p className="text-xs mt-1">
                    {feeSummary.outstandingBalance > 0
                      ? 'Payment due on open invoices'
                      : 'All fee invoices settled'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button
                  variant="primary"
                  onClick={() => navigate(`/guardian/fees?studentId=${studentId}`)}
                >
                  Go to Invoices & Payment
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState title="No Invoices Found" description="No fee records found for this student." />
          )}
        </div>
      )}
    </div>
  );
}
