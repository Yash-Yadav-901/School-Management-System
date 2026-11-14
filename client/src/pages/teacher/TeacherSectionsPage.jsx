import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap.js';

export function TeacherSectionsPage() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState(null);

  const rosterModalRef = useDialogFocusTrap(Boolean(selectedSection), () => setSelectedSection(null));

  const {
    data: sections,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['teacher', 'sections'],
    queryFn: () => apiClient.get('/teacher/sections'),
  });

  const studentsQuery = useQuery({
    queryKey: ['teacher', 'section-students', selectedSection?.id],
    queryFn: () => apiClient.get(`/teacher/sections/${selectedSection.id}/students`),
    enabled: Boolean(selectedSection?.id),
  });

  if (isLoading) {
    return <Spinner message="Loading your assigned sections..." />;
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="My Assigned Sections" description="Manage attendance and marks for your classes" />
        <ErrorState
          title="Failed to Load Sections"
          message={error?.message || 'Could not fetch your section assignments.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <div>
        <PageHeader title="My Assigned Sections" description="Manage attendance and marks for your classes" />
        <EmptyState
          title="No Assigned Sections"
          description="You currently do not have any classes or sections assigned. Contact the administrator."
        />
      </div>
    );
  }

  const studentColumns = [
    { key: 'rollNumber', header: 'Roll No', render: (s) => s.rollNumber || '—' },
    { key: 'name', header: 'Student Name', render: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
    { key: 'admissionNumber', header: 'Admission No', render: (s) => <span className="font-mono text-xs">{s.admissionNumber}</span> },
    { key: 'gender', header: 'Gender', render: (s) => s.gender || '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assigned Sections"
        description="View your teaching assignments, record daily attendance, and enter exam scores."
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/teacher/attendance')}
          >
            Mark Daily Attendance
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-semibold tracking-wider uppercase text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full">
                    {section.class.name}
                  </span>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    Section {section.name}
                  </h2>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-2">
                  Assigned Subjects ({section.subjects.length})
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {section.subjects.map((sub) => (
                    <span
                      key={sub.id}
                      className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                    >
                      <span className="font-mono text-slate-500 mr-1.5">{sub.code}</span>
                      {sub.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/teacher/attendance?sectionId=${section.id}`)}
                >
                  Take Attendance
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/teacher/reports?sectionId=${section.id}`)}
                >
                  Summary
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-slate-600 hover:text-slate-900"
                onClick={() => setSelectedSection(section)}
              >
                View Student Roster
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Student Roster Modal */}
      {selectedSection && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roster-modal-title"
        >
          <div ref={rosterModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200">
              <div>
                <h2 id="roster-modal-title" className="text-lg font-bold text-slate-900">
                  {selectedSection.class.name} - Section {selectedSection.name} Roster
                </h2>
                <p className="text-xs text-slate-500">Official student enrollment for this section</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSection(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto py-4 flex-1">
              {studentsQuery.isLoading ? (
                <Spinner message="Loading student roster..." />
              ) : studentsQuery.isError ? (
                <ErrorState
                  title="Failed to Load Roster"
                  message={studentsQuery.error?.message || 'Could not fetch students.'}
                  onRetry={studentsQuery.refetch}
                />
              ) : !studentsQuery.data?.students || studentsQuery.data.students.length === 0 ? (
                <EmptyState
                  title="No Students"
                  description="No students are enrolled in this section yet."
                />
              ) : (
                <DataTable
                  columns={studentColumns}
                  data={studentsQuery.data.students}
                  emptyMessage="No students found."
                />
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedSection(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

