import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client.js';
import { PageHeader } from '../../components/PageHeader.jsx';
import { Spinner } from '../../components/Spinner.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ErrorState } from '../../components/ErrorState.jsx';
import { DataTable } from '../../components/DataTable.jsx';
import { Pagination } from '../../components/Pagination.jsx';
import { Button } from '../../components/Button.jsx';
import { FormField } from '../../components/FormField.jsx';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap.js';

const COMMON_ENTITIES = [
  'ALL',
  'Student',
  'Teacher',
  'Section',
  'Class',
  'Exam',
  'FeeInvoice',
  'FeePayment',
  'GradeRule',
];

export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [entityType, setEntityType] = useState('ALL');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMetaLog, setSelectedMetaLog] = useState(null);

  const metaModalRef = useDialogFocusTrap(Boolean(selectedMetaLog), () => setSelectedMetaLog(null));

  const {
    data: auditResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'audit-logs', page, entityType, action, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (entityType !== 'ALL') params.set('entityType', entityType);
      if (action.trim()) params.set('action', action.trim());
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      return apiClient.get(`/admin/audit-logs?${params.toString()}`);
    },
  });

  const logs = auditResponse?.data || [];
  const pagination = auditResponse?.pagination || { page: 1, totalPages: 1, total: 0 };

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      render: (log) => (
        <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action Event',
      render: (log) => (
        <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
          {log.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Target Entity',
      render: (log) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800">{log.entityType}</span>
          <span className="font-mono text-slate-400 ml-1.5">#{log.entityId}</span>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Actor User',
      render: (log) => (
        <div className="text-xs">
          <span className="font-medium text-slate-800">{log.user?.email || 'System'}</span>
          {log.user?.role && (
            <span className="text-[10px] text-slate-400 font-mono ml-1">({log.user.role})</span>
          )}
        </div>
      ),
    },
    {
      key: 'meta',
      header: 'Metadata Details',
      align: 'right',
      render: (log) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedMetaLog(log)}
        >
          View Meta
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable System Audit Logs"
        description="Comprehensive audit trail of sensitive administrative actions, grades, attendance changes, and payments."
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <FormField id="audit-entity" label="Entity Type">
            <select
              id="audit-entity"
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            >
              {COMMON_ENTITIES.map((ent) => (
                <option key={ent} value={ent}>
                  {ent === 'ALL' ? 'All Entities' : ent}
                </option>
              ))}
            </select>
          </FormField>

          <FormField id="audit-action" label="Action Pattern">
            <input
              id="audit-action"
              type="text"
              placeholder="e.g. PAYMENT_RECORDED"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>

          <FormField id="audit-start" label="From Date">
            <input
              id="audit-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>

          <FormField id="audit-end" label="To Date">
            <input
              id="audit-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-800 shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </FormField>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>Found <strong>{pagination.total}</strong> total logged events</span>
          {(entityType !== 'ALL' || action || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setEntityType('ALL');
                setAction('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="text-brand-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        {isLoading ? (
          <Spinner message="Loading audit trail..." />
        ) : isError ? (
          <ErrorState
            title="Failed to Load Audit Trail"
            message={error?.message || 'Could not fetch audit logs.'}
            onRetry={refetch}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            title="No Audit Entries Found"
            description="No audit logs matched your specified filter criteria."
          />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={logs}
              emptyMessage="No audit logs found."
            />
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </>
        )}
      </div>

      {/* METADATA INSPECTION MODAL */}
      {selectedMetaLog && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div ref={metaModalRef} className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <div>
                <span className="text-xs font-mono font-bold text-brand-600 uppercase">
                  {selectedMetaLog.action}
                </span>
                <h2 className="text-sm font-bold text-slate-900">
                  Event Metadata #{selectedMetaLog.id}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMetaLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="text-xs space-y-1">
              <div><strong>Timestamp:</strong> {new Date(selectedMetaLog.createdAt).toISOString()}</div>
              <div><strong>Target:</strong> {selectedMetaLog.entityType} #{selectedMetaLog.entityId}</div>
              <div><strong>Actor:</strong> {selectedMetaLog.user?.email || 'System'}</div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">
                Sanitized Payload Metadata (JSON):
              </span>
              <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto max-h-60">
                {typeof selectedMetaLog.meta === 'string'
                  ? selectedMetaLog.meta
                  : JSON.stringify(selectedMetaLog.meta, null, 2)}
              </pre>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedMetaLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
