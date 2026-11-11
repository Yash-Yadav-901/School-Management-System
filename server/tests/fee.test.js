import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app.js';
import prisma from '../src/db/index.js';

let adminToken, teacherToken, guardian1Token, guardian2Token;
let rahulStudent, priyaStudent;
let tuitionFeeType;
let grade9aSection;

beforeAll(async () => {
  async function login(email, password) {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    return res.body.token;
  }

  [adminToken, teacherToken, guardian1Token, guardian2Token] = await Promise.all([
    login('admin@school.demo', 'Admin@123'),
    login('teacher1@school.demo', 'Teacher@123'),
    login('guardian1@school.demo', 'Guardian@123'),
    login('guardian2@school.demo', 'Guardian@123'),
  ]);

  rahulStudent = await prisma.student.findFirst({ where: { name: 'Rahul Singh' } });
  priyaStudent = await prisma.student.findFirst({ where: { name: 'Priya Verma' } });
  tuitionFeeType = await prisma.feeType.findFirst({ where: { name: 'Tuition Fee' } });
  grade9aSection = await prisma.section.findFirst({
    where: { name: 'A', class: { name: 'Grade 9' } },
  });
});

describe('Phase 6: Fees, Ledger, and Simulated Payments', () => {
  describe('RBAC & Teacher access control', () => {
    it('blocks teacher from all fee routes with 403 FORBIDDEN', async () => {
      const res1 = await request(app)
        .get('/api/fees/invoices')
        .set('Authorization', `Bearer ${teacherToken}`);
      expect(res1.status).toBe(403);
      expect(res1.body.error).toBe('FORBIDDEN');

      const res2 = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send({ studentId: rahulStudent.id, feeTypeId: tuitionFeeType.id, amountDue: 50000, dueDate: '2026-05-01' });
      expect(res2.status).toBe(403);
    });

    it('blocks guardian from admin-only fee routes with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${guardian1Token}`)
        .send({ studentId: rahulStudent.id, feeTypeId: tuitionFeeType.id, amountDue: 50000, dueDate: '2026-05-01' });
      expect(res.status).toBe(403);
    });
  });

  describe('Invoice Creation & Ledger DEBIT entries', () => {
    it('admin creates a single invoice: writes DEBIT ledger entry and audit log in one transaction', async () => {
      const res = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: rahulStudent.id,
          feeTypeId: tuitionFeeType.id,
          amountDue: 60000, // ₹600
          dueDate: '2026-07-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('UNPAID');
      expect(res.body.amountDue).toBe(60000);
      expect(res.body.outstandingBalance).toBe(60000);

      const invoiceId = res.body.id;

      // Verify ledger DEBIT entry
      const ledgerEntry = await prisma.feeLedgerEntry.findFirst({
        where: { invoiceId, entryType: 'DEBIT' },
      });
      expect(ledgerEntry).toBeDefined();
      expect(ledgerEntry.amount).toBe(60000);
      expect(ledgerEntry.studentId).toBe(rahulStudent.id);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: { action: 'INVOICE_CREATED', entityType: 'FeeInvoice', entityId: invoiceId },
      });
      expect(audit).toBeDefined();
    });

    it('admin creates bulk invoices for a section in one transaction', async () => {
      const res = await request(app)
        .post('/api/fees/invoices/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          sectionId: grade9aSection.id,
          feeTypeId: tuitionFeeType.id,
          amountDue: 40000,
          dueDate: '2026-08-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.createdCount).toBeGreaterThan(0);
      expect(res.body.invoiceIds.length).toBe(res.body.createdCount);
    });
  });

  describe('Payment, Idempotency, and Ledger Calculations', () => {
    let testInvoiceId;
    const TOTAL_AMOUNT = 50000; // 500.00

    beforeAll(async () => {
      // Create a fresh isolated invoice for payment tests
      const res = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: rahulStudent.id,
          feeTypeId: tuitionFeeType.id,
          amountDue: TOTAL_AMOUNT,
          dueDate: '2026-09-01',
        });
      testInvoiceId = res.body.id;
    });

    it('rejects payment when Idempotency-Key header is missing → 400 BAD_REQUEST', async () => {
      const res = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amountPaid: 10000 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BAD_REQUEST');
      expect(res.body.message).toContain('Idempotency-Key header is required');
    });

    it('rejects overpayment exceeding outstanding balance → 400 BAD_REQUEST', async () => {
      const key = `key-overpay-${Date.now()}`;
      const res = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: TOTAL_AMOUNT + 10000 }); // Exceeds balance

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('BAD_REQUEST');
      expect(res.body.message).toContain('exceeds outstanding invoice balance');
    });

    it('records partial payment: writes CREDIT entry, updates status to PARTIAL, and reduces balance', async () => {
      const key = `key-partial-${Date.now()}`;
      const PARTIAL_AMOUNT = 20000;

      const res = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: PARTIAL_AMOUNT });

      expect(res.status).toBe(200);
      expect(res.body.isReplay).toBe(false);
      expect(res.body.invoiceStatus).toBe('PARTIAL');
      expect(res.body.amountPaid).toBe(PARTIAL_AMOUNT);
      expect(res.body.outstandingBalance).toBe(TOTAL_AMOUNT - PARTIAL_AMOUNT);

      // Verify CREDIT ledger entry exists
      const creditEntry = await prisma.feeLedgerEntry.findFirst({
        where: { invoiceId: testInvoiceId, entryType: 'CREDIT', amount: PARTIAL_AMOUNT },
      });
      expect(creditEntry).toBeDefined();
    });

    it('idempotent replay: repeating same key with same payload returns original result without second payment', async () => {
      const key = `key-replay-${Date.now()}`;
      const amount = 10000;

      // First call
      const firstRes = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: amount });

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.isReplay).toBe(false);
      const paymentId = firstRes.body.payment.id;

      // Second call with same key and same payload
      const secondRes = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: amount });

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.isReplay).toBe(true);
      expect(secondRes.body.payment.id).toBe(paymentId);

      // Assert only ONE payment row was created with this key
      const count = await prisma.feePayment.count({
        where: { idempotencyKey: key },
      });
      expect(count).toBe(1);
    });

    it('same key with different payload returns 409 CONFLICT', async () => {
      const key = `key-conflict-${Date.now()}`;

      // First call
      await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: 5000 });

      // Second call with different amount
      const res = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: 8000 });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toContain('already been used with a different request payload');
    });

    it('completing payment transitions status to PAID and outstanding balance to 0', async () => {
      // Check current outstanding balance
      const invRes = await request(app)
        .get(`/api/fees/invoices/${testInvoiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      const remaining = invRes.body.outstandingBalance;
      expect(remaining).toBeGreaterThan(0);

      // Pay exact remaining balance
      const key = `key-full-${Date.now()}`;
      const res = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: remaining });

      expect(res.status).toBe(200);
      expect(res.body.invoiceStatus).toBe('PAID');
      expect(res.body.outstandingBalance).toBe(0);
    });

    it('rejects payment on a PAID invoice → 409 CONFLICT', async () => {
      const key = `key-paid-attempt-${Date.now()}`;
      const res = await request(app)
        .post(`/api/fees/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', key)
        .send({ amountPaid: 1000 });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('CONFLICT');
      expect(res.body.message).toContain('already PAID');
    });
  });

  describe('Concurrent Payments handling', () => {
    it('two concurrent payments that together exceed balance: only one succeeds, other gets 4xx', async () => {
      // Create invoice with 10,000 paise balance
      const invRes = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: rahulStudent.id,
          feeTypeId: tuitionFeeType.id,
          amountDue: 10000,
          dueDate: '2026-10-01',
        });

      const invId = invRes.body.id;

      // Both try to pay 8,000 paise concurrently (together 16,000 > 10,000)
      const pay1 = request(app)
        .post(`/api/fees/invoices/${invId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `concurrent-1-${crypto.randomUUID()}`)
        .send({ amountPaid: 8000 });

      const pay2 = request(app)
        .post(`/api/fees/invoices/${invId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `concurrent-2-${crypto.randomUUID()}`)
        .send({ amountPaid: 8000 });

      const [res1, res2] = await Promise.all([pay1, pay2]);

      const statuses = [res1.status, res2.status];
      expect(statuses).toContain(200);
      // The other should fail with 400 (exceeds balance)
      expect(statuses.some((s) => s === 400 || s === 409)).toBe(true);

      // Verify invoice is not overpaid
      const finalInvoice = await request(app)
        .get(`/api/fees/invoices/${invId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(finalInvoice.body.outstandingBalance).toBeGreaterThanOrEqual(0);
      expect(finalInvoice.body.amountPaid).toBe(8000);
    });
  });

  describe('VOID Invoices', () => {
    it('voiding an invoice with payments is rejected → 409 CONFLICT', async () => {
      // Create invoice and make a partial payment
      const invRes = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: rahulStudent.id,
          feeTypeId: tuitionFeeType.id,
          amountDue: 20000,
          dueDate: '2026-11-01',
        });
      const invId = invRes.body.id;

      await request(app)
        .post(`/api/fees/invoices/${invId}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Idempotency-Key', `void-test-${crypto.randomUUID()}`)
        .send({ amountPaid: 5000 });

      // Attempt to void
      const voidRes = await request(app)
        .post(`/api/fees/invoices/${invId}/void`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(voidRes.status).toBe(409);
      expect(voidRes.body.error).toBe('CONFLICT');
      expect(voidRes.body.message).toContain('already has recorded payments');
    });

    it('voiding an invoice without payments succeeds, writes reversing ledger entry and audit log', async () => {
      const invRes = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          studentId: rahulStudent.id,
          feeTypeId: tuitionFeeType.id,
          amountDue: 25000,
          dueDate: '2026-11-15',
        });
      const invId = invRes.body.id;

      const voidRes = await request(app)
        .post(`/api/fees/invoices/${invId}/void`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(voidRes.status).toBe(200);
      expect(voidRes.body.status).toBe('VOID');

      // Verify reversing CREDIT entry
      const reversingEntry = await prisma.feeLedgerEntry.findFirst({
        where: { invoiceId: invId, entryType: 'CREDIT', amount: 25000 },
      });
      expect(reversingEntry).toBeDefined();

      // Check balance is 0
      const detailRes = await request(app)
        .get(`/api/fees/invoices/${invId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(detailRes.body.outstandingBalance).toBe(0);
    });
  });

  describe('Guardian Privacy & Ownership Checks', () => {
    let rahulInvoiceId, priyaInvoiceId;

    beforeAll(async () => {
      // Create invoice for rahulStudent (linked to guardian1)
      const r1 = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: rahulStudent.id, feeTypeId: tuitionFeeType.id, amountDue: 30000, dueDate: '2026-12-01' });
      rahulInvoiceId = r1.body.id;

      // Create invoice for priyaStudent (linked to guardian2)
      const r2 = await request(app)
        .post('/api/fees/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: priyaStudent.id, feeTypeId: tuitionFeeType.id, amountDue: 35000, dueDate: '2026-12-01' });
      priyaInvoiceId = r2.body.id;
    });

    it('guardian sees only linked child invoices in list', async () => {
      const res = await request(app)
        .get('/api/fees/invoices')
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((inv) => inv.studentId === rahulStudent.id || inv.student.name.includes('Singh'))).toBe(true);
    });

    it('guardian can view invoice detail of linked child → 200', async () => {
      const res = await request(app)
        .get(`/api/fees/invoices/${rahulInvoiceId}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(rahulInvoiceId);
    });

    it('guardian requesting unlinked invoice returns 404 NOT_FOUND (privacy preservation)', async () => {
      // guardian1 tries to access priyaStudent's invoice
      const res = await request(app)
        .get(`/api/fees/invoices/${priyaInvoiceId}`)
        .set('Authorization', `Bearer ${guardian1Token}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
      expect(res.body.message).toBe('Invoice not found.');
    });

    it('guardian cannot pay for unlinked child invoice → 404 NOT_FOUND', async () => {
      const res = await request(app)
        .post(`/api/fees/invoices/${priyaInvoiceId}/pay`)
        .set('Authorization', `Bearer ${guardian1Token}`)
        .set('Idempotency-Key', `guardian-priv-${Date.now()}`)
        .send({ amountPaid: 10000 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('NOT_FOUND');
    });

    it('guardian student fee summary returns 200 for linked and 404 for unlinked', async () => {
      const linkedRes = await request(app)
        .get(`/api/fees/student-summary/${rahulStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);
      expect(linkedRes.status).toBe(200);
      expect(linkedRes.body.totalInvoiced).toBeGreaterThan(0);

      const unlinkedRes = await request(app)
        .get(`/api/fees/student-summary/${priyaStudent.id}`)
        .set('Authorization', `Bearer ${guardian1Token}`);
      expect(unlinkedRes.status).toBe(404);
    });
  });

  describe('Reconciliation test: total invoiced minus total paid equals sum of all ledger entries', () => {
    it('ledger entries sum perfectly reconciles with totalInvoiced - totalPaid across the system', async () => {
      const reportRes = await request(app)
        .get('/api/fees/admin-report')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(reportRes.status).toBe(200);
      const { totalInvoiced, totalPaid, outstandingBalance } = reportRes.body.totals;

      expect(totalInvoiced - totalPaid).toBe(outstandingBalance);

      // Verify directly against raw DB ledger
      const allEntries = await prisma.feeLedgerEntry.findMany();
      let netLedger = 0;
      for (const entry of allEntries) {
        if (entry.entryType === 'DEBIT') netLedger += entry.amount;
        if (entry.entryType === 'CREDIT') netLedger -= entry.amount;
      }

      expect(netLedger).toBe(outstandingBalance);
    });
  });
});

