import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, ApiClientError } from '../../api/client.js';
import { formatPaiseToRupees, parseRupeesToPaise } from '../../utils/formatCurrency.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { Button } from '../../components/Button.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { FormField } from '../../components/FormField.jsx';

export function GuardianFeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const selectedStudentId = searchParams.get('studentId') || '';
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

  // Simulated Payment Form state
  const [paymentAmountRupees, setPaymentAmountRupees] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [paymentFeedback, setPaymentFeedback] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  // Fetch children for filter dropdown
  const { data: children } = useQuery({
    queryKey: ['guardian', 'children'],
    queryFn: () => apiClient.get('/guardian/children'),
  });

  // Fetch invoices list
  const {
    data: invoicesResponse,
    isLoading: invoicesLoading,
    isError: invoicesError,
    error: invoicesErrObj,
    refetch: refetchInvoices,
  } = useQuery({
    queryKey: ['guardian', 'invoices', selectedStudentId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedStudentId) params.set('studentId', selectedStudentId);
      params.set('pageSize', '50');
      return apiClient.get(`/fees/invoices?${params.toString()}`);
    },
  });

  // Fetch details of selected invoice
  const {
    data: invoiceDetail,
    isLoading: detailLoading,
    isError: detailError,
    error: detailErrObj,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['guardian', 'invoice-detail', selectedInvoiceId],
    queryFn: () => apiClient.get(`/fees/invoices/${selectedInvoiceId}`),
    enabled: Boolean(selectedInvoiceId),
  });

  // Pay invoice mutation
  const payMutation = useMutation({
    mutationFn: ({ invoiceId, amountPaid, key }) =>
      apiClient.post(
        `/fees/invoices/${invoiceId}/pay`,
        { amountPaid },
        { headers: { 'Idempotency-Key': key } }
      ),
    onSuccess: (data) => {
      if (data.isReplay) {
        setPaymentFeedback({
          type: 'replay',
          message: data.message || 'Payment already processed with this idempotency key (Replay).',
        });
      } else {
        setPaymentFeedback({
          type: 'success',
          message: `Payment of ${formatPaiseToRupees(data.payment?.amountPaid || 0)} recorded successfully.`,
        });
      }
      setPaymentError(null);
      // Generate a fresh idempotency key for the NEXT payment
      setIdempotencyKey(crypto.randomUUID());
      setPaymentAmountRupees('');

      // Refresh invoices and invoice detail
      queryClient.invalidateQueries({ queryKey: ['guardian', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['guardian', 'invoice-detail', selectedInvoiceId] });
      queryClient.invalidateQueries({ queryKey: ['guardian', 'fee-summary'] });
    },
    onError: (err) => {
      setPaymentFeedback(null);
      // On network errors (status 0), do NOT change idempotencyKey so the user can safely retry!
      if (err.status === 0 || err.code === 'NETWORK_ERROR') {
        setPaymentError('Network connection issue. You can safely click Retry Payment using the same transaction key.');
      } else {
        setPaymentError(err.message || 'Payment failed.');
      }
    },
  });

  function handleOpenPay(invoice) {
    setSelectedInvoiceId(invoice.id);
    setPaymentFeedback(null);
    setPaymentError(null);
    // Pre-fill full remaining balance
    const remainingRupees = (invoice.outstandingBalance / 100).toFixed(2);
    setPaymentAmountRupees(remainingRupees > 0 ? remainingRupees : '');
    // Fresh key for this session
    setIdempotencyKey(crypto.randomUUID());
  }

  function handlePaymentSubmit(e) {
    e.preventDefault();
    setPaymentFeedback(null);
    setPaymentError(null);

    const paise = parseRupeesToPaise(paymentAmountRupees);
    if (!paise || paise <= 0) {
      setPaymentError('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (invoiceDetail && paise > invoiceDetail.outstandingBalance) {
      setPaymentError(
        `Payment amount (${formatPaiseToRupees(paise)}) exceeds remaining balance (${formatPaiseToRupees(invoiceDetail.outstandingBalance)}).`
      );
      return;
    }

    payMutation.mutate({
      invoiceId: selectedInvoiceId,
      amountPaid: paise,
      key: idempotencyKey,
    });
  }

  function handleFilterStudent(studentId) {
    if (studentId) {
      setSearchParams({ studentId });
    } else {
      setSearchParams({});
    }
  }

  const invoices = invoicesResponse?.data || [];

  const columns = [
    {
      key: 'invoiceNumber',
      header: 'Invoice No',
      render: (inv) => <span className="font-mono text-xs font-semibold text-slate-800">{inv.invoiceNumber}</span>,
    },
    {
      key: 'student',
      header: 'Student',
      render: (inv) => <span className="font-medium text-slate-900">{inv.student?.name}</span>,
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
      header: 'Action',
      align: 'right',
      render: (inv) => (
        <Button
          variant={inv.outstandingBalance > 0 && inv.status !== 'VOID' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handleOpenPay(inv)}
        >
          {inv.outstandingBalance > 0 && inv.status !== 'VOID' ? 'Pay / View' : 'View Ledger'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fee Invoices & Payments"
        description="View school fee invoices, inspection ledgers, and execute simulated payments."
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="student-filter" className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Filter by Child:
          </label>
          <select
            id="student-filter"
            value={selectedStudentId}
            onChange={(e) => handleFilterStudent(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">All Children</option>
            {children?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{invoices.length}</strong> invoices
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        {invoicesLoading ? (
          <Spinner message="Loading fee invoices..." />
        ) : invoicesError ? (
          <ErrorState
            title="Failed to Load Invoices"
            message={invoicesErrObj?.message || 'Could not fetch invoices.'}
            onRetry={refetchInvoices}
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            title="No Invoices Found"
            description="There are no fee invoices matching your filter."
          />
        ) : (
          <DataTable
            columns={columns}
            data={invoices}
            emptyMessage="No invoices found."
          />
        )}
      </div>

      {/* Invoice Details & Payment Modal */}
      {selectedInvoiceId && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-500 uppercase tracking-wider">
                  Invoice Details
                </span>
                <h2 id="invoice-modal-title" className="text-xl font-bold text-slate-900 mt-0.5">
                  {invoiceDetail?.invoiceNumber || 'Loading...'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceId(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
                aria-label="Close dialog"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto py-4 flex-1 space-y-6">
              {detailLoading ? (
                <Spinner message="Loading invoice and ledger entries..." />
              ) : detailError ? (
                <ErrorState
                  title="Failed to Load Invoice Details"
                  message={detailErrObj?.message || 'Invoice details unavailable.'}
                  onRetry={refetchDetail}
                />
              ) : invoiceDetail ? (
                <>
                  {/* Summary Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Student</span>
                      <span className="font-bold text-slate-900 text-sm">{invoiceDetail.student?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fee Type</span>
                      <span className="font-semibold text-slate-900 text-sm">{invoiceDetail.feeType?.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Due</span>
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {formatPaiseToRupees(invoiceDetail.amountDue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Outstanding Balance</span>
                      <span className={`font-extrabold text-sm font-mono ${invoiceDetail.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {formatPaiseToRupees(invoiceDetail.outstandingBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Feedback banners */}
                  {paymentFeedback && (
                    <div
                      role="status"
                      className={`p-3 rounded-lg text-xs flex items-center justify-between ${
                        paymentFeedback.type === 'replay'
                          ? 'bg-blue-50 text-blue-900 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 shrink-0 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">{paymentFeedback.message}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentFeedback(null)}
                        className="font-bold ml-2 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between">
                      <span>{paymentError}</span>
                      <button
                        type="button"
                        onClick={() => setPaymentError(null)}
                        className="font-bold ml-2 underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}

                  {/* SIMULATED PAYMENT FORM */}
                  {invoiceDetail.outstandingBalance > 0 && invoiceDetail.status !== 'VOID' ? (
                    <div className="p-4 rounded-xl border-2 border-brand-200 bg-brand-50/50 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <h3 className="text-sm font-bold text-slate-900">
                          Simulated Payment Form
                        </h3>
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[11px] font-semibold border border-amber-300">
                          Simulated payment, no real money
                        </span>
                      </div>

                      <form onSubmit={handlePaymentSubmit} className="space-y-3">
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <FormField
                              id="payment-amount"
                              label={`Payment Amount in Rupees (Max: ${formatPaiseToRupees(invoiceDetail.outstandingBalance)})`}
                              required
                            >
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">
                                  ₹
                                </span>
                                <input
                                  id="payment-amount"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={(invoiceDetail.outstandingBalance / 100).toFixed(2)}
                                  placeholder="0.00"
                                  value={paymentAmountRupees}
                                  onChange={(e) => setPaymentAmountRupees(e.target.value)}
                                  className="block w-full pl-8 pr-3 py-2 rounded-md border border-slate-300 shadow-sm focus:border-brand-500 focus:outline-none text-sm font-mono"
                                />
                              </div>
                            </FormField>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="md"
                            className="whitespace-nowrap mb-0.5"
                            onClick={() =>
                              setPaymentAmountRupees((invoiceDetail.outstandingBalance / 100).toFixed(2))
                            }
                          >
                            Pay Full
                          </Button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2 pt-1">
                          <div className="font-mono text-[11px] text-slate-400 truncate max-w-xs" title={`Idempotency-Key: ${idempotencyKey}`}>
                            Key: {idempotencyKey}
                          </div>
                          <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            isLoading={payMutation.isPending}
                          >
                            Submit Simulated Payment
                          </Button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                      {invoiceDetail.status === 'PAID'
                        ? 'This invoice is fully settled.'
                        : 'This invoice has been voided.'}
                    </div>
                  )}

                  {/* LEDGER ENTRIES TABLE */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      Accounting Ledger (Debit / Credit Audit Trail)
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50 text-slate-700">
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold">Type</th>
                            <th className="px-3 py-2 text-left font-semibold">Description</th>
                            <th className="px-3 py-2 text-right font-semibold">Amount</th>
                            <th className="px-3 py-2 text-right font-semibold">Recorded At</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {invoiceDetail.ledgerEntries?.map((entry) => (
                            <tr key={entry.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    entry.entryType === 'DEBIT'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  }`}
                                >
                                  {entry.entryType}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-slate-700">{entry.description}</td>
                              <td className={`px-3 py-2 text-right font-mono font-medium ${
                                entry.entryType === 'DEBIT' ? 'text-amber-900' : 'text-emerald-900'
                              }`}>
                                {entry.entryType === 'CREDIT' ? '-' : '+'}
                                {formatPaiseToRupees(entry.amount)}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-400 font-mono text-[11px]">
                                {new Date(entry.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* RECENT PAYMENTS */}
                  {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                        Recorded Payments ({invoiceDetail.payments.length})
                      </h3>
                      <div className="overflow-x-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                          <thead className="bg-slate-50 text-slate-700">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Payment ID</th>
                              <th className="px-3 py-2 text-left font-semibold">Idempotency Key</th>
                              <th className="px-3 py-2 text-right font-semibold">Amount Paid</th>
                              <th className="px-3 py-2 text-right font-semibold">Payment Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {invoiceDetail.payments.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-mono text-slate-600">#{p.id}</td>
                                <td className="px-3 py-2 font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={p.idempotencyKey}>
                                  {p.idempotencyKey}
                                </td>
                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                                  {formatPaiseToRupees(p.amountPaid)}
                                </td>
                                <td className="px-3 py-2 text-right text-slate-500 font-mono text-[11px]">
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

            <div className="pt-4 border-t border-slate-200 flex justify-end">
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
