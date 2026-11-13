import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';

export function MarksEntryPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Map of studentId -> marks string
  const [marksMap, setMarksMap] = useState({});
  // Map of studentId -> error message
  const [fieldErrors, setFieldErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [generalError, setGeneralError] = useState(null);

  const firstErrorRef = useRef(null);

  // Fetch exam info
  const {
    data: exam,
    isLoading: examLoading,
    isError: examError,
    error: examErrObj,
  } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => apiClient.get(`/exams/${examId}`),
  });

  // Fetch students of the exam's section
  const sectionId = exam?.sectionId;
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

  const students = sectionData?.students || [];

  // Pre-fill existing marks if available in exam.results
  useEffect(() => {
    if (!students || students.length === 0 || !exam) return;

    const existingMap = {};
    if (exam.results && Array.isArray(exam.results)) {
      for (const r of exam.results) {
        existingMap[r.studentId] = String(r.marksObtained);
      }
    }

    const initialMap = {};
    for (const s of students) {
      initialMap[s.id] = existingMap[s.id] !== undefined ? existingMap[s.id] : '';
    }
    setMarksMap(initialMap);
  }, [students, exam]);

  function handleMarksChange(studentId, val) {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: val,
    }));
    // Clear field error on change
    if (fieldErrors[studentId]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
    setGeneralError(null);
  }

  const marksMutation = useMutation({
    mutationFn: (payload) => apiClient.post(`/exams/${examId}/marks`, payload),
    onSuccess: (data) => {
      setFeedback(`Marks for ${data.length || students.length} students recorded successfully.`);
      setGeneralError(null);
      setFieldErrors({});
      queryClient.invalidateQueries({ queryKey: ['exam', examId] });
      queryClient.invalidateQueries({ queryKey: ['teacher', 'exams'] });
    },
    onError: (err) => {
      setGeneralError(err.message || 'Failed to submit marks.');
      setFeedback(null);

      // Map server detail errors e.g. "entries[i].marksObtained"
      if (err.details && Array.isArray(err.details)) {
        const mapped = {};
        for (const msg of err.details) {
          const match = msg.match(/entries\[(\d+)\]/);
          if (match && match[1]) {
            const index = Number(match[1]);
            const targetStudent = students[index];
            if (targetStudent) {
              mapped[targetStudent.id] = msg;
            }
          }
        }
        setFieldErrors(mapped);
      }
    },
  });

  function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    setGeneralError(null);
    setFieldErrors({});

    const newFieldErrors = {};
    const max = exam?.maxMarks || 100;

    for (const student of students) {
      const rawVal = marksMap[student.id];
      if (rawVal === undefined || rawVal === '') {
        newFieldErrors[student.id] = 'Marks required.';
        continue;
      }

      const num = Number(rawVal);
      if (!Number.isInteger(num)) {
        newFieldErrors[student.id] = 'Must be an integer.';
      } else if (num < 0) {
        newFieldErrors[student.id] = 'Cannot be negative.';
      } else if (num > max) {
        newFieldErrors[student.id] = `Cannot exceed ${max}.`;
      }
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setGeneralError('Please correct the validation errors in the marks table.');
      return;
    }

    const entries = students.map((s) => ({
      studentId: s.id,
      marksObtained: Number(marksMap[s.id]),
    }));

    marksMutation.mutate({ entries });
  }

  if (examLoading || (sectionId && studentsLoading)) {
    return <Spinner message="Loading marks entry form..." />;
  }

  if (examError) {
    return (
      <ErrorState
        title="Could Not Load Exam"
        message={examErrObj?.message || 'Failed to retrieve exam details.'}
      />
    );
  }

  if (studentsError) {
    return (
      <ErrorState
        title="Could Not Load Students"
        message={studentsErrObj?.message || 'Failed to load students for this exam.'}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Marks Entry: ${exam.name}`}
        description="Enter evaluation marks for all students in this section."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/teacher/exams')}>
            Back to Exams
          </Button>
        }
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
            <span className="font-medium">{feedback}</span>
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

      {generalError && (
        <ErrorState title="Validation Error" message={generalError} />
      )}

      {/* Exam metadata banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Subject</span>
          <div className="font-semibold text-slate-900 mt-1">
            {exam.subject?.name} <span className="font-mono text-xs text-slate-500">({exam.subject?.code})</span>
          </div>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Class & Section</span>
          <div className="font-semibold text-slate-900 mt-1">
            {exam.section?.class?.name} - {exam.section?.name}
          </div>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Exam Date</span>
          <div className="font-semibold text-slate-900 mt-1 font-mono text-sm">{exam.examDate}</div>
        </div>
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Maximum Marks</span>
          <div className="font-bold text-brand-600 text-lg mt-0.5">{exam.maxMarks}</div>
        </div>
      </div>

      {/* Marks Entry Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSubmit} noValidate>
          {students.length === 0 ? (
            <EmptyState
              title="No Students"
              description="No students enrolled in this section to enter marks for."
            />
          ) : (
            <div className="space-y-6">
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
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700 w-44">
                        Marks (0 - {exam.maxMarks})
                      </th>
                      <th scope="col" className="px-4 py-3 text-left font-semibold text-slate-700">
                        Computed Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {students.map((student) => {
                      const studentVal = marksMap[student.id] || '';
                      const err = fieldErrors[student.id];
                      const numVal = Number(studentVal);
                      const isValidNum = studentVal !== '' && !isNaN(numVal) && numVal >= 0 && numVal <= exam.maxMarks;
                      const percentage = isValidNum ? ((numVal / exam.maxMarks) * 100).toFixed(1) : null;

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
                          <td className="px-4 py-3">
                            <div>
                              <input
                                id={`marks-${student.id}`}
                                type="number"
                                min={0}
                                max={exam.maxMarks}
                                step={1}
                                value={studentVal}
                                onChange={(e) => handleMarksChange(student.id, e.target.value)}
                                aria-invalid={Boolean(err)}
                                aria-describedby={err ? `marks-err-${student.id}` : undefined}
                                className={`w-28 rounded-md border px-3 py-1.5 text-sm font-mono shadow-sm focus:outline-none focus:ring-1 ${
                                  err
                                    ? 'border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-500 bg-rose-50'
                                    : 'border-slate-300 text-slate-900 focus:border-brand-500 focus:ring-brand-500'
                                }`}
                              />
                              {err && (
                                <p id={`marks-err-${student.id}`} className="mt-1 text-xs text-rose-600 font-medium">
                                  {err}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {percentage !== null ? (
                              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                {percentage}%
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/teacher/exams')}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={marksMutation.isPending}
                >
                  Save Exam Marks
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
