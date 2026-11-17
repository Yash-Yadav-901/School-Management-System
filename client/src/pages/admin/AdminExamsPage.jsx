import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { FormField } from '../../components/FormField.jsx';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap.js';

export function AdminExamsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('exams'); // 'exams' | 'graderules'

  // Modal states
  const [examModalOpen, setExamModalOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    name: '',
    sectionId: '',
    subjectId: '',
    maxMarks: '100',
    examDate: new Date().toISOString().slice(0, 10),
  });
  const [examFormError, setExamFormError] = useState(null);
  const [examConflictError, setExamConflictError] = useState(null);

  // Grade Rule modal states
  const [gradeModalMode, setGradeModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingGradeRule, setEditingGradeRule] = useState(null);
  const [gradeRuleForm, setGradeRuleForm] = useState({
    label: '',
    minPercent: '',
    gradePoint: '',
    description: '',
  });
  const [gradeRuleError, setGradeRuleError] = useState(null);

  const closeExamModal = useCallback(() => {
    setExamModalOpen(false);
    setExamFormError(null);
  }, []);

  const closeGradeModal = useCallback(() => {
    setGradeModalMode(null);
    setEditingGradeRule(null);
    setGradeRuleError(null);
  }, []);

  const examModalRef = useDialogFocusTrap(examModalOpen, closeExamModal);
  const gradeModalRef = useDialogFocusTrap(Boolean(gradeModalMode), closeGradeModal);

  // Fetch sections and subjects for Exam creation
  const { data: sectionsData } = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => apiClient.get('/admin/sections?pageSize=100'),
  });
  const sections = sectionsData?.data || [];

  const { data: subjectsData } = useQuery({
    queryKey: ['admin', 'subjects'],
    queryFn: () => apiClient.get('/admin/subjects?pageSize=100'),
  });
  const subjects = subjectsData?.data || [];

  // Fetch exams
  const {
    data: examsResponse,
    isLoading: examsLoading,
    isError: examsIsError,
    error: examsErrObj,
    refetch: refetchExams,
  } = useQuery({
    queryKey: ['admin', 'exams'],
    queryFn: () => apiClient.get('/exams?pageSize=50'),
  });
  const exams = examsResponse?.data || [];

  // Fetch Grade Rules
  const {
    data: gradeRules,
    isLoading: rulesLoading,
    isError: rulesIsError,
    error: rulesErrObj,
    refetch: refetchRules,
  } = useQuery({
    queryKey: ['admin', 'grade-rules'],
    queryFn: () => apiClient.get('/admin/grade-rules'),
  });

  // Exam Mutations
  const createExamMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/exams', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] });
      setExamModalOpen(false);
      setExamFormError(null);
    },
    onError: (err) => {
      setExamFormError(err.message || 'Failed to schedule exam.');
    },
  });

  const deleteExamMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/exams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'exams'] });
      setExamConflictError(null);
    },
    onError: (err) => {
      setExamConflictError(err.message || 'Cannot delete exam.');
    },
  });

  // Grade Rule Mutations
  const createGradeRuleMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/admin/grade-rules', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'grade-rules'] });
      closeGradeModal();
    },
    onError: (err) => {
      setGradeRuleError(err.message || 'Failed to create grade rule.');
    },
  });

  const updateGradeRuleMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/grade-rules/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'grade-rules'] });
      closeGradeModal();
    },
    onError: (err) => {
      setGradeRuleError(err.message || 'Failed to update grade rule.');
    },
  });

  const deleteGradeRuleMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/grade-rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'grade-rules'] });
      setGradeRuleError(null);
    },
    onError: (err) => {
      setGradeRuleError(err.message || 'Failed to delete grade rule.');
    },
  });

  function handleCreateExamSubmit(e) {
    e.preventDefault();
    setExamFormError(null);

    if (!examForm.name.trim()) return setExamFormError('Exam name is required.');
    if (!examForm.sectionId) return setExamFormError('Section is required.');
    if (!examForm.subjectId) return setExamFormError('Subject is required.');
    if (!examForm.maxMarks || Number(examForm.maxMarks) <= 0)
      return setExamFormError('Max marks must be a positive integer.');

    createExamMutation.mutate({
      name: examForm.name.trim(),
      sectionId: Number(examForm.sectionId),
      subjectId: Number(examForm.subjectId),
      maxMarks: Number(examForm.maxMarks),
      examDate: examForm.examDate,
    });
  }

  function openGradeCreate() {
    setGradeModalMode('create');
    setEditingGradeRule(null);
    setGradeRuleForm({ label: '', minPercent: '', gradePoint: '', description: '' });
    setGradeRuleError(null);
  }

  function openGradeEdit(rule) {
    setGradeModalMode('edit');
    setEditingGradeRule(rule);
    setGradeRuleForm({
      label: rule.label || '',
      minPercent: String(rule.minPercent),
      gradePoint: String(rule.gradePoint),
      description: rule.description || '',
    });
    setGradeRuleError(null);
  }

  function handleGradeRuleSubmit(e) {
    e.preventDefault();
    setGradeRuleError(null);

    const minP = Number(gradeRuleForm.minPercent);
    if (!gradeRuleForm.label.trim()) return setGradeRuleError('Grade label is required.');
    if (isNaN(minP) || minP < 0 || minP > 100)
      return setGradeRuleError('Minimum percentage must be between 0 and 100.');

    const payload = {
      label: gradeRuleForm.label.trim(),
      minPercent: minP,
      gradePoint: gradeRuleForm.gradePoint !== '' ? Number(gradeRuleForm.gradePoint) : 0,
      description: gradeRuleForm.description.trim() || undefined,
    };

    if (gradeModalMode === 'create') {
      createGradeRuleMutation.mutate(payload);
    } else {
      updateGradeRuleMutation.mutate({ id: editingGradeRule.id, payload });
    }
  }

  const examColumns = [
    {
      key: 'name',
      header: 'Exam Name',
      render: (e) => (
        <div>
          <span className="font-semibold text-slate-900">{e.name}</span>
          <div className="text-xs text-slate-400 font-mono">Date: {e.examDate}</div>
        </div>
      ),
    },
    {
      key: 'section',
      header: 'Class & Section',
      render: (e) => <span>{e.section?.class?.name} - {e.section?.name}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (e) => (
        <span className="text-xs font-medium text-slate-800">
          <span className="font-mono text-slate-400 mr-1">{e.subject?.code}</span>
          {e.subject?.name}
        </span>
      ),
    },
    {
      key: 'maxMarks',
      header: 'Max Marks',
      render: (e) => <span className="font-mono font-medium">{e.maxMarks}</span>,
    },
    {
      key: 'results',
      header: 'Results Entered',
      render: (e) => {
        const count = e._count?.results || 0;
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {count} students
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (window.confirm(`Delete exam "${e.name}"? This will fail if results already exist.`)) {
              deleteExamMutation.mutate(e.id);
            }
          }}
        >
          Delete
        </Button>
      ),
    },
  ];

  const gradeRuleColumns = [
    {
      key: 'label',
      header: 'Grade Label',
      render: (r) => (
        <span className="inline-block px-2.5 py-0.5 rounded text-xs font-extrabold bg-brand-50 text-brand-700 border border-brand-200">
          {r.label}
        </span>
      ),
    },
    {
      key: 'minPercent',
      header: 'Min Percentage',
      render: (r) => (
        <span className="font-mono font-semibold text-slate-900">
          &ge; {r.minPercent}%
          {r.minPercent === 0 && (
            <span className="ml-2 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
              Base Guard (Protected)
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'gradePoint',
      header: 'Grade Point',
      render: (r) => <span className="font-mono text-slate-600">{r.gradePoint}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => <span className="text-xs text-slate-500">{r.description || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openGradeEdit(r)}>
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (r.minPercent === 0) {
                setGradeRuleError('The base rule with minimum percentage 0 is required by the system and cannot be deleted.');
                return;
              }
              if (window.confirm(`Delete grade rule "${r.label}"?`)) {
                deleteGradeRuleMutation.mutate(r.id);
              }
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams & Academic Grading"
        description="Schedule standardized assessments and configure the grading scale with automatic dynamic recalculation."
        actions={
          activeTab === 'exams' ? (
            <Button variant="primary" onClick={() => setExamModalOpen(true)}>
              Schedule New Exam
            </Button>
          ) : (
            <Button variant="primary" onClick={openGradeCreate}>
              Add Grade Rule
            </Button>
          )
        }
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('exams')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'exams'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Scheduled Examinations ({exams.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('graderules')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'graderules'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Grade Rules Scale ({gradeRules?.length || 0})
          </button>
        </nav>
      </div>

      {/* EXAMS TAB */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {examConflictError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between">
              <span>{examConflictError}</span>
              <button
                type="button"
                onClick={() => setExamConflictError(null)}
                className="font-bold underline text-xs ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            {examsLoading ? (
              <Spinner message="Loading examinations..." />
            ) : examsIsError ? (
              <ErrorState
                title="Failed to Load Exams"
                message={examsErrObj?.message || 'Could not fetch exams list.'}
                onRetry={refetchExams}
              />
            ) : exams.length === 0 ? (
              <EmptyState
                title="No Exams Scheduled"
                description="No examinations have been scheduled yet. Click 'Schedule New Exam' to add one."
              />
            ) : (
              <DataTable
                columns={examColumns}
                data={exams}
                emptyMessage="No exams found."
              />
            )}
          </div>
        </div>
      )}

      {/* GRADE RULES TAB */}
      {activeTab === 'graderules' && (
        <div className="space-y-4">
          {/* Dynamic Recalculation Notice Banner */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <strong className="font-semibold block">Dynamic Grade Computation Notice:</strong>
              Letter grades and grade points are derived dynamically at read time. Any additions, updates, or deletions to these rules immediately reflect across all past and present student report cards. The rule with minimum percentage 0 is guarded and cannot be removed.
            </div>
          </div>

          {gradeRuleError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-center justify-between">
              <span>{gradeRuleError}</span>
              <button
                type="button"
                onClick={() => setGradeRuleError(null)}
                className="font-bold underline text-xs ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            {rulesLoading ? (
              <Spinner message="Loading grade rules..." />
            ) : rulesIsError ? (
              <ErrorState
                title="Failed to Load Grade Rules"
                message={rulesErrObj?.message || 'Could not fetch grading rules.'}
                onRetry={refetchRules}
              />
            ) : !gradeRules || gradeRules.length === 0 ? (
              <EmptyState
                title="No Grade Rules"
                description="No grade rules found."
              />
            ) : (
              <DataTable
                columns={gradeRuleColumns}
                data={gradeRules}
                emptyMessage="No grade rules found."
              />
            )}
          </div>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      {examModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div ref={examModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Schedule Examination</h2>
              <button
                type="button"
                onClick={() => setExamModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {examFormError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                {examFormError}
              </div>
            )}

            <form onSubmit={handleCreateExamSubmit} className="space-y-4">
              <FormField id="exam-name" label="Exam Name" required>
                <input
                  id="exam-name"
                  type="text"
                  placeholder="e.g. Midterm Examination 2026"
                  value={examForm.name}
                  onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>

              <FormField id="exam-section" label="Class & Section" required>
                <select
                  id="exam-section"
                  value={examForm.sectionId}
                  onChange={(e) => setExamForm({ ...examForm, sectionId: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select Section</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.class?.name} - {s.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="exam-subject" label="Subject" required>
                <select
                  id="exam-subject"
                  value={examForm.subjectId}
                  onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.code} - {sub.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="exam-max" label="Maximum Marks" required>
                  <input
                    id="exam-max"
                    type="number"
                    min={1}
                    value={examForm.maxMarks}
                    onChange={(e) => setExamForm({ ...examForm, maxMarks: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>

                <FormField id="exam-date" label="Exam Date" required>
                  <input
                    id="exam-date"
                    type="date"
                    value={examForm.examDate}
                    onChange={(e) => setExamForm({ ...examForm, examDate: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setExamModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={createExamMutation.isPending}>
                  Schedule Exam
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GRADE RULE MODAL */}
      {gradeModalMode && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div ref={gradeModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {gradeModalMode === 'create' ? 'Add Grade Rule' : `Edit Grade Rule: ${editingGradeRule?.label}`}
              </h2>
              <button type="button" onClick={closeGradeModal} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>

            {gradeRuleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                {gradeRuleError}
              </div>
            )}

            <form onSubmit={handleGradeRuleSubmit} className="space-y-4">
              <FormField id="grade-label" label="Grade Label (e.g. A+, B, C)" required>
                <input
                  id="grade-label"
                  type="text"
                  placeholder="e.g. A+"
                  value={gradeRuleForm.label}
                  onChange={(e) => setGradeRuleForm({ ...gradeRuleForm, label: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="grade-min" label="Min Percentage (0-100)" required>
                  <input
                    id="grade-min"
                    type="number"
                    min={0}
                    max={100}
                    value={gradeRuleForm.minPercent}
                    onChange={(e) => setGradeRuleForm({ ...gradeRuleForm, minPercent: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>

                <FormField id="grade-point" label="Grade Point (0-10)">
                  <input
                    id="grade-point"
                    type="number"
                    step="0.1"
                    min={0}
                    max={10}
                    placeholder="10.0"
                    value={gradeRuleForm.gradePoint}
                    onChange={(e) => setGradeRuleForm({ ...gradeRuleForm, gradePoint: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>
              </div>

              <FormField id="grade-desc" label="Description">
                <input
                  id="grade-desc"
                  type="text"
                  placeholder="e.g. Outstanding"
                  value={gradeRuleForm.description}
                  onChange={(e) => setGradeRuleForm({ ...gradeRuleForm, description: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={closeGradeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createGradeRuleMutation.isPending || updateGradeRuleMutation.isPending}
                >
                  {gradeModalMode === 'create' ? 'Save Rule' : 'Update Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
