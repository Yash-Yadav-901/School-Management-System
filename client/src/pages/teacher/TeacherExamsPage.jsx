import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Button } from '../../components/Button.jsx';

export function TeacherExamsPage() {
  const navigate = useNavigate();

  const {
    data: examsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['teacher', 'exams'],
    queryFn: () => apiClient.get('/exams?pageSize=50'),
  });

  const exams = examsResponse?.data || [];

  const columns = [
    {
      key: 'name',
      header: 'Exam Name',
      render: (exam) => (
        <div>
          <span className="font-semibold text-slate-900">{exam.name}</span>
          <div className="text-xs text-slate-500">{exam.examDate}</div>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Class & Section',
      render: (exam) => (
        <span>
          {exam.section?.class?.name} - {exam.section?.name}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (exam) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
          <span className="font-mono text-slate-500 mr-1">{exam.subject?.code}</span>
          {exam.subject?.name}
        </span>
      ),
    },
    {
      key: 'maxMarks',
      header: 'Max Marks',
      render: (exam) => <span className="font-mono font-medium">{exam.maxMarks}</span>,
    },
    {
      key: 'resultsCount',
      header: 'Marks Entered',
      render: (exam) => {
        const count = exam._count?.results || 0;
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
              count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {count > 0 ? `${count} entered` : 'Pending'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (exam) => (
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(`/teacher/exams/${exam.id}/marks`)}
        >
          {exam._count?.results > 0 ? 'Edit Marks' : 'Enter Marks'}
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return <Spinner message="Loading assigned exams..." />;
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="Exams & Grading" description="Manage evaluations for your classes" />
        <ErrorState
          title="Could Not Load Exams"
          message={error?.message || 'Failed to fetch exams for your assigned sections.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams & Marks Entry"
        description="View scheduled examinations and input student scores for your assigned subjects."
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        {exams.length === 0 ? (
          <EmptyState
            title="No Exams Scheduled"
            description="There are currently no examinations scheduled for your assigned sections."
          />
        ) : (
          <DataTable
            columns={columns}
            data={exams}
            emptyMessage="No exams found."
          />
        )}
      </div>
    </div>
  );
}

