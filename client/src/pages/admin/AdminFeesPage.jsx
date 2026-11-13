import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/formatCurrency.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { FormField } from '../../components/FormField.jsx';

const STATUS_OPTIONS = ['ALL', 'UNPAID', 'PARTIAL', 'PAID', 'VOID'];

export function AdminFeesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sectionFilter, setSectionFilter] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [voidConfirmInvoice, setVoidConfirmInvoice] = useState(null);
  const [voidError, setVoidError] = useState(null);

  // Single Invoice Form
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '',
    feeTypeId: '',
    amountDueRupees: '',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  });
  const [formError, setFormError] = useState(null);

  // Fetch sections
  const { data: sectionsData } = useQuery({
    queryKey: ['admin', 'sections'],
    queryFn: () => apiClient.get('/admin/sections?pageSize=100'),
  });
  const sections = sectionsData?.data || [];

  // Fetch fee types
  const { data: feeTypes } = useQuery({
    queryKey: ['fees', 'types'],
    queryFn: () => apiClient.get('/fees/types'),
  });

  // Fetch students for invoice creation selector
  const { data: studentsData } = useQuery({
    queryKey: ['admin', 'students', 'all-for-fees'],
    queryFn: () => apiClient.get('/admin/students?pageSize=200'),
  });
  const students = studentsData?.data || [];

  // Fetch admin fee totals report
  const { data: feeReport } = useQuery({
    queryKey: ['fees', 'admin-report'],
    queryFn: () => apiClient.get('/fees/admin-report'),
  });

  // Fetch paginated invoices
  const {
    data: invoicesResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'invoices', page, statusFilter, sectionFilter, studentSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (sectionFilter) params.set('sectionId', sectionFilter);
      if (studentSearch.trim()) params.set('studentId', studentSearch.trim());
      return apiClient.get(`/fees/invoices?${params.toString()}`);
    },
  });

  const invoices = invoicesResponse?.data || [];
  const pagination = invoicesResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  // Fetch details of selected invoice
  const {
    data: invoiceDetail,
    isLoading: detailLoading,
  } = useQuery({
    queryKey: ['fees', 'invoice-detail', selectedInvoiceId],
    queryFn: () => apiClient.get(`/fees/invoices/${selectedInvoiceId}`),
    enabled: Boolean(selectedInvoiceId),
  });

  // Create single invoice mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/fees/invoices', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fees', 'admin-report'] });
      setCreateModalOpen(false);
      setFormError(null);
    },
    onError: (err) => {
      setFormError(err.message || 'Failed to raise invoice.');
    },
  });

  // Void invoice mutation
  const voidMutation = useMutation({
    mutationFn: (id) => apiClient.post(`/fees/invoices/${id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fees', 'admin-report'] });
      setVoidConfirmInvoice(null);
      setVoidError(null);
    },
    onError: (err) => {
      setVoidError(err.message || 'Cannot void invoice.');
    },
  });

  function handleCreateInvoiceSubmit(e) {
    e.preventDefault();
    setFormError(null);

    if (!invoiceForm.studentId) return setFormError('Select a student.');
    if (!invoiceForm.feeTypeId) return setFormError('Select a fee type.');
    const paise = parseRupeesToPaise(invoiceForm.amountDueRupees);
    if (!paise || paise <= 0) return setFormError('Amount must be greater than zero.');
    if (!invoiceForm.dueDate) return setFormError('Due date is required.');

    createInvoiceMutation.mutate({
      studentId: Number(invoiceForm.studentId),
      feeTypeId: Number(invoiceForm.feeTypeId),
      amountDue: paise,
      dueDate: invoiceForm.dueDate,
    });
  }

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice No',
      render: (inv) => <span className="font-mono text-xs font-semibold text-slate-900">{inv.invoiceNumber}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (inv) => (
        <div>
          <span className="font-medium text-slate-900">{inv.student?.name}</span>
          <div className="text-xs text-slate-400 font-mono">ID #{inv.studentId}</div>
        </div>
      ),
    },
    {
      key: 'feeType',
      header: 'Fee Type',
      render: (inv) => <span className="text-xs font-medium text-slate-700">{inv.feeType?.name}</span>,
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (inv) => <span className="font-mono text-xs text-slate-500">{inv.dueDate}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) => {
        const badges = {
          PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          PARTIAL: 'bg-blue-50 text-blue-700 border-blue-200',
          UNPAID: 'bg-amber-50 text-amber-700 border-amber-200',
          VOID: 'bg-slate-100 text-slate-600 border-slate-200',
        };
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${badges[inv.status] || 'bg-slate-50'}`}>
            {inv.status}
          </span>
        );
      },
    },
    {
      key: 'amountDue',
      header: 'Amount Due',
      align: 'right',
      render: (inv) => <span className="font-mono text-xs">{formatPaiseToRupees(inv.amountDue)}</span>,
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (inv) => (
        <span className={`font-mono text-xs font-bold ${inv.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
          {formatPaiseToRupees(inv.outstandingBalance)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedInvoiceId(inv.id)}>
            Ledger
          </Button>
          {inv.status !== 'PAID' && inv.status !== 'VOID' && inv.amountPaid === 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setVoidConfirmInvoice(inv);
                setVoidError(null);
              }}
            >
              Void
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Invoices & Student Accounts"
        description="Raise single and bulk fee assessments, track ledger debits/credits, and audit payment balances."
        actions={
          <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
            Raise Single Invoice
          </Button>
        }
      />

      {/* Fee Totals KPI Overview */}
      {feeReport && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Institutional Invoiced Total
            </span>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
              {formatPaiseToRupees(feeReport.overall?.totalInvoiced || 0)}
            </div>
            <div className="mt-1 text-xs text-slate-400">Total debit assessments</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Total Realized Collections
            </span>
            <div className="mt-2 text-2xl font-extrabold text-emerald-700 font-mono">
              {formatPaiseToRupees(feeReport.overall?.totalPaid || 0)}
            </div>
            <div className="mt-1 text-xs text-emerald-600">Total verified credit entries</div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Net Outstanding Receivables
            </span>
            <div className="mt-2 text-2xl font-extrabold text-rose-600 font-mono">
              {formatPaiseToRupees(feeReport.overall?.outstanding || 0)}
            </div>
            <div className="mt-1 text-xs text-rose-500">Uncollected fees across active invoices</div>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                Status: {st}
              </option>
            ))}
          </select>

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
          Showing <strong>{invoices.length}</strong> of {pagination.total} invoices
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        {isLoading ? (
          <Spinner message="Loading fee invoices..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Invoices"
            message={error?.message || 'Could not fetch invoices.'}
            onRetry={refetch}
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            description="No fee invoices matched your filter criteria."
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={invoices}
              emptyMessage="No invoices found."
            />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* RAISE SINGLE INVOICE MODAL */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Raise Single Invoice</h2>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
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

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4">
              <FormField id="invoice-student" label="Student" required>
                <select
                  id="invoice-student"
                  value={invoiceForm.studentId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, studentId: e.target.value })}
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

              <FormField id="invoice-fee-type" label="Fee Assessment Type" required>
                <select
                  id="invoice-fee-type"
                  value={invoiceForm.feeTypeId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, feeTypeId: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Select Fee Type</option>
                  {feeTypes?.map((ft) => (
                    <option key={ft.id} value={ft.id}>
                      {ft.name}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField id="invoice-amount" label="Amount Due in Rupees (INR)" required>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">
                    ₹
                  </span>
                  <input
                    id="invoice-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 5000.00"
                    value={invoiceForm.amountDueRupees}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amountDueRupees: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-300 text-sm font-mono shadow-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </FormField>

              <FormField id="invoice-due" label="Payment Due Date" required>
                <input
                  id="invoice-due"
                  type="date"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={createInvoiceMutation.isPending}>
                  Create Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VOID INVOICE CONFIRMATION DIALOG */}
      {voidConfirmInvoice && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">
              Void Invoice #{voidConfirmInvoice.invoiceNumber}
            </h2>
            <p className="text-sm text-slate-600">
              Are you sure you want to void this invoice for{' '}
              <strong className="text-slate-900">{voidConfirmInvoice.student?.name}</strong>?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-lg space-y-1">
              <div className="font-semibold">Irreversible Ledger Adjustment:</div>
              <div>
                Voiding will write an immediate reversing CREDIT entry of{' '}
                <strong>{formatPaiseToRupees(voidConfirmInvoice.amountDue)}</strong> to cancel the student's debt balance. Voiding is permitted only if zero payments have been recorded.
              </div>
            </div>

            {voidError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md">
                {voidError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setVoidConfirmInvoice(null);
                  setVoidError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={voidMutation.isPending}
                onClick={() => voidMutation.mutate(voidConfirmInvoice.id)}
              >
                Confirm Void
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE DETAIL & LEDGER MODAL */}
      {selectedInvoiceId && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 max-h-[85vh] flex flex-col space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Invoice #{invoiceDetail?.invoiceNumber || selectedInvoiceId} Ledger
              </h2>
              <button
                type="button"
                onClick={() => setSelectedInvoiceId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 py-2">
              {detailLoading ? (
                <Spinner message="Loading ledger entries..." />
              ) : invoiceDetail ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block">Student</span>
                      <span className="font-semibold text-slate-900">{invoiceDetail.student?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Status</span>
                      <span className="font-bold">{invoiceDetail.status}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Invoiced</span>
                      <span className="font-mono">{formatPaiseToRupees(invoiceDetail.amountDue)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Current Balance</span>
                      <span className="font-mono font-bold text-rose-600">
                        {formatPaiseToRupees(invoiceDetail.outstandingBalance)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Ledger Entries (Accounting Audit Trail)
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Entry</th>
                            <th className="px-3 py-2 text-left font-semibold">Description</th>
                            <th className="px-3 py-2 text-right font-semibold">Amount</th>
                            <th className="px-3 py-2 text-right font-semibold">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {invoiceDetail.ledgerEntries?.map((entry) => (
                            <tr key={entry.id}>
                              <td className="px-3 py-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  entry.entryType === 'DEBIT' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                                }`}>
                                  {entry.entryType}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-700">{entry.description}</td>
                              <td className="px-3 py-2 text-right font-mono font-medium">
                                {entry.entryType === 'CREDIT' ? '-' : '+'}
                                {formatPaiseToRupees(entry.amount)}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-400 font-mono text-[10px]">
                                {new Date(entry.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {invoiceDetail.payments?.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Recorded Payments ({invoiceDetail.payments.length})
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">ID</th>
                              <th className="px-3 py-2 text-left font-semibold">Idempotency Key</th>
                              <th className="px-3 py-2 text-right font-semibold">Amount Paid</th>
                              <th className="px-3 py-2 text-right font-semibold">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {invoiceDetail.payments.map((p) => (
                              <tr key={p.id}>
                                <td className="px-3 py-2 font-mono">#{p.id}</td>
                                <td className="px-3 py-2 font-mono text-[10px] text-slate-400 truncate max-w-[150px]">{p.idempotencyKey}</td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                                  {formatPaiseToRupees(p.amountPaid)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-400 font-mono text-[10px]">
                                  {new Date(p.paidAt).toLocaleString()}
                                </td>
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

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedInvoiceId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
