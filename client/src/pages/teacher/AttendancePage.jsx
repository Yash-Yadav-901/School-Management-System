import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { FormField } from '../../components/FormField.jsx';

const SESSIONS = ['MORNING', 'AFTERNOON'];
const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
  { value: 'LATE', label: 'Late', color: 'text-amber-700 bg-amber-50 border-amber-300' },
  { value: 'ABSENT', label: 'Absent', color: 'text-rose-700 bg-rose-50 border-rose-300' },
];

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const initialSectionId = searchParams.get('sectionId') || '';
  const [sectionId, setSectionId] = useState(initialSectionId);
  const [date, setDate] = useState(getTodayString());
  const [session, setSession] = useState('MORNING');

  // Map of studentId -> status ('PRESENT' | 'ABSENT' | 'LATE')
  const [attendanceMap, setAttendanceMap] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Fetch teacher's assigned sections
  const {
    data: sections,
    isLoading: sectionsLoading,
    isError: sectionsError,
    error: sectionsErrObj,
  } = useQuery({
    queryKey: ['teacher', 'sections'],
    queryFn: () => apiClient.get('/teacher/sections'),
  });

  // Automatically select first section if none selected
  useEffect(() => {
    if (!sectionId && sections && sections.length > 0) {
      setSectionId(String(sections[0].id));
    }
  }, [sectionId, sections]);

  // Sync state to URL search params
  function handleSectionChange(newId) {
    setSectionId(newId);
    setSearchParams(newId ? { sectionId: newId } : {});
    setFeedback(null);
    setSubmitError(null);
  }

  // Fetch students of the selected section
  const {
    data: sectionData,
    isLoading: studentsLoading,
    isError: studentsError,
    error: studentsErrObj,
  } = useQuery({
    queryKey: ['teacher', 'section-students', sectionId],
    queryFn: () => apiClient.get(`/teacher/sections/${sectionId}/students`),
    enabled: Boolean(sectionId),
  });

  // Fetch any existing attendance records for this section + date + session
  const {
    data: existingAttendance,
    isLoading: existingLoading,
  } = useQuery({
    queryKey: ['attendance', 'check-existing', sectionId, date, session],
    queryFn: () =>
      apiClient.get(
        `/attendance?sectionId=${sectionId}&date=${date}&session=${session}&pageSize=100`
      ),
    enabled: Boolean(sectionId && date && session),
  });

  const students = sectionData?.students || [];
  const existingRecords = existingAttendance?.data || [];
  const hasExistingRecords = existingRecords.length > 0;

  // Initialize attendance map when students or existing records change
  useEffect(() => {
    if (!students || students.length === 0) return;

    const existingMap = {};
    for (const r of existingRecords) {
      existingMap[r.student.id] = r.status;
    }

    const nextMap = {};
    for (const s of students) {
      // Default to existing record if present, otherwise default to PRESENT
      nextMap[s.id] = existingMap[s.id] || 'PRESENT';
    }
    setAttendanceMap(nextMap);
  }, [students, existingRecords]);

  function handleStatusChange(studentId, newStatus) {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: newStatus,
    }));
  }

  function handleMarkAllPresent() {
    const updated = {};
    for (const s of students) {
      updated[s.id] = 'PRESENT';
    }
    setAttendanceMap(updated);
  }

  // Submit bulk attendance mutation
  const recordMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/attendance', payload),
    onSuccess: (data) => {
      const created = data.createdCount !== undefined ? data.createdCount : (hasExistingRecords ? 0 : data.savedCount);
      const updated = data.updatedCount !== undefined ? data.updatedCount : (hasExistingRecords ? data.savedCount : 0);
      setFeedback({
        type: 'success',
        message: `Attendance saved successfully: ${created} created, ${updated} updated.`,
      });
      setSubmitError(null);
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
    onError: (err) => {
      setSubmitError(err.message || 'Failed to record attendance.');
      setFeedback(null);
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    setSubmitError(null);

    if (!sectionId) {
      setSubmitError('Please select a section.');
      return;
    }

    if (!date) {
      setSubmitError('Please select a valid date.');
      return;
    }

    if (date > getTodayString()) {
      setSubmitError('Attendance date cannot be in the future.');
      return;
    }

    const entries = students.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] || 'PRESENT',
    }));

    recordMutation.mutate({
      sectionId: Number(sectionId),
      date,
      session,
      entries,
    });
  }

  if (sectionsLoading) {
    return <Spinner message="Loading attendance interface..." />;
  }

  if (sectionsError) {
    return (
      <ErrorState
        title="Failed to Load Sections"
        message={sectionsErrObj?.message || 'Could not fetch your assigned sections.'}
      />
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <EmptyState
        title="No Assigned Classes"
        description="You have no assigned sections to record attendance for."
      />
    );
  }

  const presentCount = Object.values(attendanceMap).filter((s) => s === 'PRESENT').length;
  const lateCount = Object.values(attendanceMap).filter((s) => s === 'LATE').length;
  const absentCount = Object.values(attendanceMap).filter((s) => s === 'ABSENT').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Attendance"
        description="Mark and update attendance for your assigned sections."
      />

      {feedback && (
        <div
          role="status"
          className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {submitError && (
        <div className="mb-4">
          <ErrorState title="Submission Failed" message={submitError} />
        </div>
      )}

      {/* Filter / Selector Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField id="attendance-section" label="Class & Section" required>
              <select
                id="attendance-section"
                value={sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
              >
                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.class.name} - Section {sec.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="attendance-date" label="Date (No Future Dates)" required>
              <input
                id="attendance-date"
                type="date"
                max={getTodayString()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setFeedback(null);
                }}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
              />
            </FormField>

            <FormField id="attendance-session" label="Session" required>
              <select
                id="attendance-session"
                value={session}
                onChange={(e) => {
                  setSession(e.target.value);
                  setFeedback(null);
                }}
                className="block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 text-sm"
              >
                {SESSIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {/* Existing records notice banner */}
          {hasExistingRecords && !existingLoading && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Existing attendance records were loaded for this date and session ({existingRecords.length} student records found). Submitting will update their statuses.
              </span>
            </div>
          )}

          {/* Roster & Marking Table */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
                <span>Total: <strong className="text-slate-900">{students.length}</strong></span>
                <span className="text-emerald-700">Present: <strong>{presentCount}</strong></span>
                <span className="text-amber-700">Late: <strong>{lateCount}</strong></span>
                <span className="text-rose-700">Absent: <strong>{absentCount}</strong></span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllPresent}
                disabled={students.length === 0 || recordMutation.isPending}
              >
                Mark All Present
              </Button>
            </div>

            {studentsLoading || existingLoading ? (
              <Spinner message="Loading student roster..." />
            ) : studentsError ? (
              <ErrorState
                title="Error Loading Students"
                message={studentsErrObj?.message || 'Failed to load students for this section.'}
              />
            ) : students.length === 0 ? (
              <EmptyState
                title="No Students Enrolled"
                description="This section has no enrolled students to record attendance for."
              />
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700 w-16">
                        Roll
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700">
                        Student Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700">
                        Admission No
                      </th>
                      <th scope="col" className="px-4 py-3 text-right font-semibold text-slate-700">
                        Status Controls
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {students.map((student) => {
                      const currentStatus = attendanceMap[student.id] || 'PRESENT';
                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {student.rollNumber || '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {student.name}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {student.admissionNumber}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <fieldset className="inline-flex rounded-md shadow-sm" role="radiogroup" aria-label={`Attendance status for ${student.name}`}>
                              {STATUS_OPTIONS.map((opt) => {
                                const isSelected = currentStatus === opt.value;
                                return (
                                  <label
                                    key={opt.value}
                                    className={`cursor-pointer px-3 py-1.5 text-xs font-semibold border first:rounded-l-md last:rounded-r-md -ml-px first:ml-0 transition-colors ${
                                      isSelected
                                        ? `${opt.color} ring-1 ring-inset ring-brand-500 z-10 font-bold`
                                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`status-${student.id}`}
                                      value={opt.value}
                                      checked={isSelected}
                                      onChange={() => handleStatusChange(student.id, opt.value)}
                                      className="sr-only"
                                    />
                                    {opt.label}
                                  </label>
                                );
                              })}
                            </fieldset>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {students.length > 0 && (
              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={recordMutation.isPending}
                  disabled={students.length === 0}
                >
                  {hasExistingRecords ? 'Update Attendance' : 'Save Attendance'}
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

