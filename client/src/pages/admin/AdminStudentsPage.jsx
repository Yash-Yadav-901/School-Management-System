import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { FormField } from '../../components/FormField.jsx';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap.js';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER'];

export function AdminStudentsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  // Form modal state
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rollNumber: '',
    admissionNumber: '',
    dob: '',
    gender: 'MALE',
    sectionId: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionError, setActionError] = useState(null);
  const [deleteConflictError, setDeleteConflictError] = useState(null);
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState(null);

  const formModalRef = useDialogFocusTrap(Boolean(modalMode), closeModal);
  const deleteModalRef = useDialogFocusTrap(Boolean(deleteConfirmStudent), () => setDeleteConfirmStudent(null));

  // Fetch sections for filter and form dropdowns
  const { data: sectionsResponse } = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => apiClient.get('/admin/sections?pageSize=100'),
  });
  const sections = sectionsResponse?.data || [];

  // Fetch students with search and section filter
  const {
    data: studentsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'students', page, search, sectionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search.trim()) params.set('search', search.trim());
      if (sectionFilter) params.set('sectionId', sectionFilter);
      return apiClient.get(`/admin/students?${params.toString()}`);
    },
  });

  const students = studentsResponse?.data || [];
  const pagination = studentsResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/admin/students', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      closeModal();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to create student.');
      if (err.details && Array.isArray(err.details)) {
        const mapped = {};
        for (const d of err.details) {
          if (d.field) mapped[d.field] = d.message;
        }
        setFormErrors(mapped);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`/admin/students/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      closeModal();
    },
    onError: (err) => {
      setActionError(err.message || 'Failed to update student.');
      if (err.details && Array.isArray(err.details)) {
        const mapped = {};
        for (const d of err.details) {
          if (d.field) mapped[d.field] = d.message;
        }
        setFormErrors(mapped);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/admin/students/${id}`),
    onSuccess: () => {
      setDeleteConfirmStudent(null);
      setDeleteConflictError(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    },
    onError: (err) => {
      // Catch 409 CONFLICT specifically
      if (err.status === 409) {
        setDeleteConflictError(
          err.message || 'Cannot delete student because dependent attendance, exam results, or fee invoices exist.'
        );
      } else {
        setDeleteConflictError(err.message || 'Failed to delete student.');
      }
    },
  });

  function openCreateModal() {
    setModalMode('create');
    setEditingStudent(null);
    setFormData({
      name: '',
      rollNumber: '',
      admissionNumber: `ADM-${Date.now().toString().slice(-5)}`,
      dob: '2010-01-01',
      gender: 'MALE',
      sectionId: sections[0]?.id ? String(sections[0].id) : '',
    });
    setFormErrors({});
    setActionError(null);
  }

  function openEditModal(student) {
    setModalMode('edit');
    setEditingStudent(student);
    setFormData({
      name: student.name || '',
      rollNumber: student.rollNumber !== null ? String(student.rollNumber) : '',
      admissionNumber: student.admissionNumber || '',
      dob: student.dob || '',
      gender: student.gender || 'MALE',
      sectionId: student.sectionId ? String(student.sectionId) : '',
    });
    setFormErrors({});
    setActionError(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditingStudent(null);
    setFormErrors({});
    setActionError(null);
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    setActionError(null);
    setFormErrors({});

    const errs = {};
    if (!formData.name.trim()) errs.name = 'Student name is required.';
    if (!formData.admissionNumber.trim()) errs.admissionNumber = 'Admission number is required.';
    if (!formData.sectionId) errs.sectionId = 'Assigned section is required.';

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      rollNumber: formData.rollNumber ? Number(formData.rollNumber) : null,
      admissionNumber: formData.admissionNumber.trim(),
      dob: formData.dob || null,
      gender: formData.gender,
      sectionId: Number(formData.sectionId),
    };

    if (modalMode === 'create') {
      createMutation.mutate(payload);
    } else if (modalMode === 'edit') {
      updateMutation.mutate({ id: editingStudent.id, payload });
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Student Name',
      render: (s) => (
        <div>
          <span className="font-semibold text-slate-900">{s.name}</span>
          <div className="text-xs text-slate-400 font-mono">ID #{s.id}</div>
        </div>
      ),
    },
    {
      key: 'admissionNumber',
      header: 'Admission No',
      render: (s) => <span className="font-mono text-xs text-slate-700">{s.admissionNumber}</span>,
    },
    {
      key: 'rollNumber',
      header: 'Roll No',
      render: (s) => <span className="font-mono text-xs">{s.rollNumber || '—'}</span>,
    },
    {
      key: 'section',
      header: 'Class & Section',
      render: (s) => (
        <span className="text-xs font-medium text-slate-800">
          {s.section?.class?.name} - {s.section?.name}
        </span>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      render: (s) => <span className="text-xs text-slate-600">{s.gender || '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEditModal(s)}>
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteConfirmStudent(s);
              setDeleteConflictError(null);
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
        title="Student Management"
        description="Search, enroll, update student profiles, and manage class assignments."
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            Enroll New Student
          </Button>
        }
      />

      {/* Conflict Error Notice (409) */}
      {deleteConflictError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start justify-between"
        >
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="font-bold text-rose-900">Deletion Blocked (Integrity Conflict)</div>
              <div className="text-xs text-rose-800 mt-1">{deleteConflictError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeleteConflictError(null)}
            className="text-rose-700 hover:text-rose-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="search"
            placeholder="Search by student name or roll..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none w-full sm:w-64"
          />

          <select
            value={sectionFilter}
            onChange={(e) => {
              setSectionFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.class?.name} - {sec.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total enrolled: <strong>{pagination.total}</strong>
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        {isLoading ? (
          <Spinner message="Loading students..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Students"
            message={error?.message || 'Could not fetch student directory.'}
            onRetry={refetch}
          />
        ) : students.length === 0 ? (
          <EmptyState
            title="No Students Found"
            description="No student profiles matched your query or filter criteria."
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={students}
              emptyMessage="No students found."
            />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-modal-title"
        >
          <div ref={formModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 id="student-modal-title" className="text-lg font-bold text-slate-900">
                {modalMode === 'create' ? 'Enroll New Student' : `Edit Student: ${editingStudent?.name}`}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 p-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {actionError && (
              <div className="mt-4">
                <ErrorState title="Submission Error" message={actionError} />
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4" noValidate>
              <FormField id="student-name" label="Full Name" required error={formErrors.name}>
                <input
                  id="student-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="student-admission" label="Admission Number" required error={formErrors.admissionNumber}>
                  <input
                    id="student-admission"
                    type="text"
                    value={formData.admissionNumber}
                    onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>

                <FormField id="student-roll" label="Roll Number">
                  <input
                    id="student-roll"
                    type="number"
                    min={1}
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. 15"
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField id="student-gender" label="Gender">
                  <select
                    id="student-gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField id="student-dob" label="Date of Birth">
                  <input
                    id="student-dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>
              </div>

              <FormField id="student-section" label="Class & Section Assignment" required error={formErrors.sectionId}>
                <select
                  id="student-section"
                  value={formData.sectionId}
                  onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                  className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select a Section</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.class?.name} - Section {sec.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {modalMode === 'create' ? 'Create Student' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmStudent && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div ref={deleteModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h2 id="delete-dialog-title" className="text-lg font-bold text-slate-900">
              Confirm Student Deletion
            </h2>
            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900">{deleteConfirmStudent.name}</strong>?
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              Note: If this student has active attendance records, examination results, or fee invoices, deletion will be blocked by system integrity constraints.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmStudent(null);
                  setDeleteConflictError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmStudent.id)}
              >
                Delete Student
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
