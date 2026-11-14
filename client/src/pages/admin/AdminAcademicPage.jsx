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

const TABS = [
  { id: 'classes', label: 'Classes' },
  { id: 'sections', label: 'Sections' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'teachers', label: 'Teachers' },
  { id: 'guardians', label: 'Guardians' },
  { id: 'classSubjects', label: 'Class-Subject Assignments' },
  { id: 'guardianStudents', label: 'Guardian-Student Links' },
];

export function AdminAcademicPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('classes');

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState('');

  // Modals
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [activeItem, setActiveItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formError, setFormError] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  const formModalRef = useDialogFocusTrap(Boolean(modalMode), () => setModalMode(null));
  const deleteModalRef = useDialogFocusTrap(Boolean(deleteConfirmItem), () => setDeleteConfirmItem(null));

  function resetState() {
    setPage(1);
    setSearch('');
    setConflictError(null);
    setModalMode(null);
    setActiveItem(null);
    setFormData({});
  }

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    resetState();
  }

  // Supporting queries for dropdown selectors
  const { data: classesData } = useQuery({
    queryKey: ['admin', 'classes', 'all'],
    queryFn: () => apiClient.get('/admin/classes?pageSize=100'),
  });
  const classes = classesData?.data || [];

  const { data: sectionsData } = useQuery({
    queryKey: ['admin', 'sections', 'all'],
    queryFn: () => apiClient.get('/admin/sections?pageSize=100'),
  });
  const sections = sectionsData?.data || [];

  const { data: subjectsData } = useQuery({
    queryKey: ['admin', 'subjects', 'all'],
    queryFn: () => apiClient.get('/admin/subjects?pageSize=100'),
  });
  const subjects = subjectsData?.data || [];

  const { data: teachersData } = useQuery({
    queryKey: ['admin', 'teachers', 'all'],
    queryFn: () => apiClient.get('/admin/teachers?pageSize=100'),
  });
  const teachers = teachersData?.data || [];

  const { data: guardiansData } = useQuery({
    queryKey: ['admin', 'guardians', 'all'],
    queryFn: () => apiClient.get('/admin/guardians?pageSize=100'),
  });
  const guardians = guardiansData?.data || [];

  const { data: studentsData } = useQuery({
    queryKey: ['admin', 'students', 'all-for-links'],
    queryFn: () => apiClient.get('/admin/students?pageSize=200'),
  });
  const students = studentsData?.data || [];

  // Tab endpoint mapping
  const TAB_CONFIG = {
    classes: {
      endpoint: '/admin/classes',
      queryKey: ['admin', 'classes', page, search],
      singular: 'Class',
      columns: [
        { key: 'name', header: 'Class Name', render: (c) => <span className="font-semibold text-slate-900">{c.name}</span> },
        { key: 'sectionsCount', header: 'Sections', render: (c) => <span>{c._count?.sections || c.sections?.length || 0}</span> },
      ],
      initForm: () => ({ name: '' }),
      validate: (d) => (!d.name?.trim() ? 'Class name is required.' : null),
      payload: (d) => ({ name: d.name.trim() }),
    },
    sections: {
      endpoint: '/admin/sections',
      queryKey: ['admin', 'sections', page, search],
      singular: 'Section',
      columns: [
        { key: 'name', header: 'Section Name', render: (s) => <span className="font-semibold text-slate-900">{s.name}</span> },
        { key: 'class', header: 'Class', render: (s) => <span>{s.class?.name || '—'}</span> },
        { key: 'studentsCount', header: 'Students', render: (s) => <span>{s._count?.students || 0}</span> },
      ],
      initForm: () => ({ name: '', classId: classes[0]?.id ? String(classes[0].id) : '' }),
      validate: (d) => (!d.name?.trim() ? 'Section name is required.' : !d.classId ? 'Class is required.' : null),
      payload: (d) => ({ name: d.name.trim(), classId: Number(d.classId) }),
    },
    subjects: {
      endpoint: '/admin/subjects',
      queryKey: ['admin', 'subjects', page, search],
      singular: 'Subject',
      columns: [
        { key: 'code', header: 'Code', render: (s) => <span className="font-mono font-semibold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">{s.code}</span> },
        { key: 'name', header: 'Subject Name', render: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
      ],
      initForm: () => ({ name: '', code: '' }),
      validate: (d) => (!d.name?.trim() ? 'Subject name is required.' : !d.code?.trim() ? 'Code is required.' : null),
      payload: (d) => ({ name: d.name.trim(), code: d.code.trim().toUpperCase() }),
    },
    teachers: {
      endpoint: '/admin/teachers',
      queryKey: ['admin', 'teachers', page, search],
      singular: 'Teacher',
      columns: [
        { key: 'name', header: 'Teacher Name', render: (t) => <span className="font-semibold text-slate-900">{t.name}</span> },
        { key: 'email', header: 'Login Email', render: (t) => <span className="font-mono text-xs text-slate-600">{t.user?.email || '—'}</span> },
        { key: 'phone', header: 'Phone', render: (t) => <span className="text-xs text-slate-500">{t.phone || '—'}</span> },
      ],
      initForm: () => ({ name: '', email: '', password: 'Teacher@123', phone: '' }),
      validate: (d, isEdit) => (!d.name?.trim() ? 'Teacher name is required.' : !isEdit && !d.email?.trim() ? 'Email is required.' : !isEdit && !d.password ? 'Password is required.' : null),
      payload: (d, isEdit) => (isEdit ? { name: d.name.trim(), phone: d.phone ? d.phone.trim() : null } : { name: d.name.trim(), email: d.email.trim(), password: d.password, phone: d.phone ? d.phone.trim() : null }),
    },
    guardians: {
      endpoint: '/admin/guardians',
      queryKey: ['admin', 'guardians', page, search],
      singular: 'Guardian',
      columns: [
        { key: 'name', header: 'Guardian Name', render: (g) => <span className="font-semibold text-slate-900">{g.name}</span> },
        { key: 'email', header: 'Login Email', render: (g) => <span className="font-mono text-xs text-slate-600">{g.user?.email || '—'}</span> },
        { key: 'phone', header: 'Phone', render: (g) => <span className="text-xs text-slate-500">{g.phone || '—'}</span> },
      ],
      initForm: () => ({ name: '', email: '', password: 'Guardian@123', phone: '' }),
      validate: (d, isEdit) => (!d.name?.trim() ? 'Guardian name is required.' : !isEdit && !d.email?.trim() ? 'Email is required.' : !isEdit && !d.password ? 'Password is required.' : null),
      payload: (d, isEdit) => (isEdit ? { name: d.name.trim(), phone: d.phone ? d.phone.trim() : null } : { name: d.name.trim(), email: d.email.trim(), password: d.password, phone: d.phone ? d.phone.trim() : null }),
    },
    classSubjects: {
      endpoint: '/admin/class-subjects',
      queryKey: ['admin', 'class-subjects', page],
      singular: 'Assignment',
      columns: [
        { key: 'section', header: 'Section', render: (cs) => <span>{cs.section?.class?.name} - {cs.section?.name}</span> },
        { key: 'subject', header: 'Subject', render: (cs) => <span className="font-medium text-slate-800">{cs.subject?.name} ({cs.subject?.code})</span> },
        { key: 'teacher', header: 'Assigned Teacher', render: (cs) => <span className="font-semibold text-brand-700">{cs.teacher?.name}</span> },
      ],
      initForm: () => ({ sectionId: sections[0]?.id ? String(sections[0].id) : '', subjectId: subjects[0]?.id ? String(subjects[0].id) : '', teacherId: teachers[0]?.id ? String(teachers[0].id) : '' }),
      validate: (d) => (!d.sectionId || !d.subjectId || !d.teacherId ? 'Section, subject, and teacher are all required.' : null),
      payload: (d) => ({ sectionId: Number(d.sectionId), subjectId: Number(d.subjectId), teacherId: Number(d.teacherId) }),
    },
    guardianStudents: {
      endpoint: '/admin/guardian-students',
      queryKey: ['admin', 'guardian-students', page],
      singular: 'Guardian Link',
      columns: [
        { key: 'guardian', header: 'Guardian', render: (gs) => <span className="font-semibold text-slate-900">{gs.guardian?.name}</span> },
        { key: 'student', header: 'Student', render: (gs) => <span className="font-medium text-slate-800">{gs.student?.name} ({gs.student?.section?.class?.name}-{gs.student?.section?.name})</span> },
        { key: 'relationship', header: 'Relationship', render: (gs) => <span className="text-xs text-slate-500">{gs.relationship || 'Ward'}</span> },
      ],
      initForm: () => ({ guardianId: guardians[0]?.id ? String(guardians[0].id) : '', studentId: students[0]?.id ? String(students[0].id) : '', relationship: 'Parent' }),
      validate: (d) => (!d.guardianId || !d.studentId ? 'Guardian and student are required.' : null),
      payload: (d) => ({ guardianId: Number(d.guardianId), studentId: Number(d.studentId), relationship: d.relationship ? d.relationship.trim() : 'Ward' }),
    },
  };

  const currentConfig = TAB_CONFIG[activeTab];

  // Fetch current tab data
  const {
    data: listResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [currentConfig.endpoint, page, search],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (search.trim()) params.set('search', search.trim());
      return apiClient.get(`${currentConfig.endpoint}?${params.toString()}`);
    },
  });

  const items = listResponse?.data || [];
  const pagination = listResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  // CRUD Mutations
  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post(currentConfig.endpoint, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentConfig.endpoint] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setModalMode(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.message || 'Creation failed.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => apiClient.put(`${currentConfig.endpoint}/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentConfig.endpoint] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setModalMode(null);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.message || 'Update failed.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`${currentConfig.endpoint}/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [currentConfig.endpoint] });
      queryClient.invalidateQueries({ queryKey: ['admin'] });
      setDeleteConfirmItem(null);
      setConflictError(null);
    },
    onError: (err) => {
      if (err.status === 409) {
        setConflictError(
          err.message || 'Cannot delete item because active dependent records rely on it.'
        );
      } else {
        setConflictError(err.message || 'Deletion failed.');
      }
    },
  });

  function handleOpenCreate() {
    setModalMode('create');
    setActiveItem(null);
    setFormData(currentConfig.initForm());
    setFormError(null);
    setConflictError(null);
  }

  function handleOpenEdit(item) {
    setModalMode('edit');
    setActiveItem(item);
    setFormError(null);
    setConflictError(null);

    if (activeTab === 'classes') setFormData({ name: item.name });
    else if (activeTab === 'sections') setFormData({ name: item.name, classId: String(item.classId) });
    else if (activeTab === 'subjects') setFormData({ name: item.name, code: item.code });
    else if (activeTab === 'teachers') setFormData({ name: item.name, phone: item.phone || '' });
    else if (activeTab === 'guardians') setFormData({ name: item.name, phone: item.phone || '' });
    else setFormData({});
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    const validationMsg = currentConfig.validate(formData, modalMode === 'edit');
    if (validationMsg) {
      setFormError(validationMsg);
      return;
    }

    const payload = currentConfig.payload(formData, modalMode === 'edit');
    if (modalMode === 'create') {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate({ id: activeItem.id, payload });
    }
  }

  // Add action column to table
  const columnsWithActions = [
    ...currentConfig.columns,
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (item) => (
        <div className="flex justify-end gap-2">
          {activeTab !== 'classSubjects' && activeTab !== 'guardianStudents' && (
            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(item)}>
              Edit
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setDeleteConfirmItem(item);
              setConflictError(null);
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
        title="Academic Configuration"
        description="Configure academic infrastructure, curriculum subjects, class-subject assignments, and guardian links."
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            Add {currentConfig.singular}
          </Button>
        }
      />

      {/* Tabs Bar */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-6 min-w-max" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conflict Error Notice (409) */}
      {conflictError && (
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
              <div className="text-xs text-rose-800 mt-1">{conflictError}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConflictError(null)}
            className="text-rose-700 hover:text-rose-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar for searchable tabs */}
      {['classes', 'sections', 'subjects', 'teachers', 'guardians'].includes(activeTab) && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
          <input
            type="search"
            placeholder={`Search ${currentConfig.label || currentConfig.singular}...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none w-full sm:w-72"
          />
          <div className="text-xs text-slate-500">
            Total items: <strong>{pagination.total}</strong>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        {isLoading ? (
          <Spinner message={`Loading ${currentConfig.label || currentConfig.singular}...`} />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Data"
            message={error?.message || 'Could not fetch records.'}
            onRetry={refetch}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title={`No ${currentConfig.singular} Found`}
            description={`No ${currentConfig.singular.toLowerCase()} records exist yet. Click 'Add' to create one.`}
          />
        ) : (
          <>
            <DataTable
              columns={columnsWithActions}
              data={items}
              emptyMessage="No items found."
            />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* DYNAMIC CREATE / EDIT MODAL */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div ref={formModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {modalMode === 'create' ? `Add ${currentConfig.singular}` : `Edit ${currentConfig.singular}`}
              </h2>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Classes Form */}
              {activeTab === 'classes' && (
                <FormField id="class-name" label="Class Name" required>
                  <input
                    id="class-name"
                    type="text"
                    placeholder="e.g. Grade 11"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </FormField>
              )}

              {/* Sections Form */}
              {activeTab === 'sections' && (
                <>
                  <FormField id="sec-class" label="Class" required>
                    <select
                      id="sec-class"
                      value={formData.classId || ''}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="sec-name" label="Section Name" required>
                    <input
                      id="sec-name"
                      type="text"
                      placeholder="e.g. Section C"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                </>
              )}

              {/* Subjects Form */}
              {activeTab === 'subjects' && (
                <>
                  <FormField id="sub-code" label="Subject Code" required>
                    <input
                      id="sub-code"
                      type="text"
                      placeholder="e.g. BIO101"
                      value={formData.code || ''}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                  <FormField id="sub-name" label="Subject Name" required>
                    <input
                      id="sub-name"
                      type="text"
                      placeholder="e.g. Biology"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                </>
              )}

              {/* Teachers Form */}
              {activeTab === 'teachers' && (
                <>
                  <FormField id="teacher-name" label="Full Name" required>
                    <input
                      id="teacher-name"
                      type="text"
                      placeholder="e.g. Priya Sharma"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                  {modalMode === 'create' && (
                    <>
                      <FormField id="teacher-email" label="Login Email" required>
                        <input
                          id="teacher-email"
                          type="email"
                          placeholder="teacher@school.demo"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                      </FormField>
                      <FormField id="teacher-pass" label="Temporary Password" required>
                        <input
                          id="teacher-pass"
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                      </FormField>
                    </>
                  )}
                  <FormField id="teacher-phone" label="Phone Number">
                    <input
                      id="teacher-phone"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                </>
              )}

              {/* Guardians Form */}
              {activeTab === 'guardians' && (
                <>
                  <FormField id="guardian-name" label="Full Name" required>
                    <input
                      id="guardian-name"
                      type="text"
                      placeholder="e.g. Rajesh Verma"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                  {modalMode === 'create' && (
                    <>
                      <FormField id="guardian-email" label="Login Email" required>
                        <input
                          id="guardian-email"
                          type="email"
                          placeholder="guardian@school.demo"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                      </FormField>
                      <FormField id="guardian-pass" label="Temporary Password" required>
                        <input
                          id="guardian-pass"
                          type="password"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                        />
                      </FormField>
                    </>
                  )}
                  <FormField id="guardian-phone" label="Phone Number">
                    <input
                      id="guardian-phone"
                      type="tel"
                      placeholder="e.g. 9876543210"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                </>
              )}

              {/* Class-Subject Assignment Form */}
              {activeTab === 'classSubjects' && (
                <>
                  <FormField id="cs-section" label="Section" required>
                    <select
                      id="cs-section"
                      value={formData.sectionId || ''}
                      onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Section</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.class?.name} - {sec.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="cs-subject" label="Subject" required>
                    <select
                      id="cs-subject"
                      value={formData.subjectId || ''}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                  <FormField id="cs-teacher" label="Teacher" required>
                    <select
                      id="cs-teacher"
                      value={formData.teacherId || ''}
                      onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </>
              )}

              {/* Guardian-Student Link Form */}
              {activeTab === 'guardianStudents' && (
                <>
                  <FormField id="gs-guardian" label="Guardian" required>
                    <select
                      id="gs-guardian"
                      value={formData.guardianId || ''}
                      onChange={(e) => setFormData({ ...formData, guardianId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Guardian</option>
                      {guardians.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.user?.email})
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="gs-student" label="Student" required>
                    <select
                      id="gs-student"
                      value={formData.studentId || ''}
                      onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">Select Student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.section?.class?.name}-{s.section?.name})
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField id="gs-rel" label="Relationship">
                    <input
                      id="gs-rel"
                      type="text"
                      placeholder="e.g. Mother, Father, Guardian"
                      value={formData.relationship || ''}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                    />
                  </FormField>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setModalMode(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createMutation.isPending || updateMutation.isPending}
                >
                  {modalMode === 'create' ? `Create ${currentConfig.singular}` : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmItem && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div ref={deleteModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Confirm Deletion
            </h2>
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this {currentConfig.singular.toLowerCase()}?
            </p>
            <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
              If other records (e.g. students, exam marks, or fee accounts) depend on this item, the deletion will be rejected by database constraints.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteConfirmItem(null);
                  setConflictError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteConfirmItem.id)}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

