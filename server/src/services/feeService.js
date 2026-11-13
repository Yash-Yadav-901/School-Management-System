import prisma from '../db/index.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { parsePagination, formatPaginatedResponse } from '../utils/pagination.js';

/**
 * Computes outstanding balance strictly from the FeeLedgerEntry ledger.
 * Balance = sum(DEBIT) - sum(CREDIT).
 */
export async function computeInvoiceBalance(invoiceId, tx = prisma) {
  const entries = await tx.feeLedgerEntry.findMany({
    where: { invoiceId: Number(invoiceId) },
    select: { entryType: true, amount: true },
  });

  let debits = 0;
  let credits = 0;

  for (const entry of entries) {
    if (entry.entryType === 'DEBIT') {
      debits += entry.amount;
    } else if (entry.entryType === 'CREDIT') {
      credits += entry.amount;
    }
  }

  const remainingBalance = Math.max(0, debits - credits);
  return { debits, credits, remainingBalance };
}

export async function listFeeTypes() {
  return prisma.feeType.findMany({ orderBy: { name: 'asc' } });
}

export async function createSingleInvoice(data, userId) {
  const student = await prisma.student.findUnique({ where: { id: Number(data.studentId) } });
  if (!student) throw new AppError(404, 'NOT_FOUND', 'Referenced student does not exist.');

  const feeType = await prisma.feeType.findUnique({ where: { id: Number(data.feeTypeId) } });
  if (!feeType) throw new AppError(404, 'NOT_FOUND', 'Referenced fee type does not exist.');

  const amountDue = Number(data.amountDue);
  const dueDate = data.dueDate.trim();

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.feeInvoice.create({
      data: {
        studentId: student.id,
        feeTypeId: feeType.id,
        amountDue,
        dueDate,
        status: 'UNPAID',
      },
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        feeType: true,
      },
    });

    // Write DEBIT ledger entry
    await tx.feeLedgerEntry.create({
      data: {
        studentId: student.id,
        invoiceId: invoice.id,
        entryType: 'DEBIT',
        amount: amountDue,
        description: `Invoice #${invoice.id} raised for ${feeType.name}`,
      },
    });

    // Write audit log entry
    await tx.auditLog.create({
      data: {
        userId,
        action: 'INVOICE_CREATED',
        entityType: 'FeeInvoice',
        entityId: invoice.id,
        meta: JSON.stringify({
          studentId: student.id,
          feeTypeId: feeType.id,
          amountDue,
          dueDate,
        }),
      },
    });

    logger.info(`Invoice created: id=${invoice.id} studentId=${student.id} amountDue=${amountDue} by userId=${userId}`);
    return { ...invoice, outstandingBalance: amountDue };
  });
}

export async function createBulkInvoices(data, userId) {
  const section = await prisma.section.findUnique({
    where: { id: Number(data.sectionId) },
    include: { students: { select: { id: true, name: true } } },
  });
  if (!section) throw new AppError(404, 'NOT_FOUND', 'Referenced section does not exist.');

  if (section.students.length === 0) {
    throw new AppError(400, 'BAD_REQUEST', 'No students enrolled in this section.');
  }

  const feeType = await prisma.feeType.findUnique({ where: { id: Number(data.feeTypeId) } });
  if (!feeType) throw new AppError(404, 'NOT_FOUND', 'Referenced fee type does not exist.');

  const amountDue = Number(data.amountDue);
  const dueDate = data.dueDate.trim();

  return prisma.$transaction(async (tx) => {
    const createdInvoices = [];

    for (const student of section.students) {
      const invoice = await tx.feeInvoice.create({
        data: {
          studentId: student.id,
          feeTypeId: feeType.id,
          amountDue,
          dueDate,
          status: 'UNPAID',
        },
      });

      await tx.feeLedgerEntry.create({
        data: {
          studentId: student.id,
          invoiceId: invoice.id,
          entryType: 'DEBIT',
          amount: amountDue,
          description: `Bulk Invoice #${invoice.id} raised for ${feeType.name}`,
        },
      });

      createdInvoices.push(invoice);
    }

    await tx.auditLog.create({
      data: {
        userId,
        action: 'INVOICES_BULK_CREATED',
        entityType: 'Section',
        entityId: section.id,
        meta: JSON.stringify({
          sectionId: section.id,
          feeTypeId: feeType.id,
          amountDue,
          invoicesCount: createdInvoices.length,
        }),
      },
    });

    logger.info(
      `Bulk invoices created: sectionId=${section.id} count=${createdInvoices.length} amountDueEach=${amountDue} by userId=${userId}`
    );

    return {
      sectionId: section.id,
      feeTypeId: feeType.id,
      amountDueEach: amountDue,
      createdCount: createdInvoices.length,
      invoiceIds: createdInvoices.map((i) => i.id),
    };
  });
}

export async function listInvoices(query, userContext) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = {};

  if (query.studentId) where.studentId = Number(query.studentId);
  if (query.status) where.status = query.status.toUpperCase();
  if (query.sectionId) where.student = { sectionId: Number(query.sectionId) };

  // Guardian privacy filter: guardian sees ONLY invoices for linked students
  if (userContext.role === 'GUARDIAN') {
    const guardian = await prisma.guardian.findUnique({
      where: { userId: userContext.id },
      include: { guardianStudents: { select: { studentId: true } } },
    });

    if (!guardian) throw new AppError(403, 'FORBIDDEN', 'Guardian profile not found.');
    const linkedStudentIds = guardian.guardianStudents.map((gs) => gs.studentId);

    where.studentId = { in: linkedStudentIds };
  }

  const [invoices, total] = await Promise.all([
    prisma.feeInvoice.findMany({
      where,
      skip,
      take,
      orderBy: [{ createdAt: 'desc' }],
      include: {
        student: { select: { id: true, name: true, rollNumber: true, sectionId: true } },
        feeType: true,
      },
    }),
    prisma.feeInvoice.count({ where }),
  ]);

  // Enrich with computed balance from ledger
  const enriched = await Promise.all(
    invoices.map(async (inv) => {
      const { credits, remainingBalance } = await computeInvoiceBalance(inv.id);
      return {
        ...inv,
        amountPaid: credits,
        outstandingBalance: remainingBalance,
      };
    })
  );

  return formatPaginatedResponse(enriched, total, page, pageSize);
}

export async function getInvoiceById(id, userContext) {
  const invoice = await prisma.feeInvoice.findUnique({
    where: { id: Number(id) },
    include: {
      student: {
        include: {
          section: { include: { class: true } },
        },
      },
      feeType: true,
      payments: {
        orderBy: { paidAt: 'desc' },
      },
      ledgerEntries: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

  // Guardian privacy check: return 404 if not linked to student
  if (userContext.role === 'GUARDIAN') {
    const guardian = await prisma.guardian.findUnique({
      where: { userId: userContext.id },
    });
    if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

    const link = await prisma.guardianStudent.findUnique({
      where: {
        guardianId_studentId: {
          guardianId: guardian.id,
          studentId: invoice.studentId,
        },
      },
    });

    if (!link) {
      logger.warn(
        `Authorization denied: guardian=${userContext.id} attempted access to unlinked invoice=${id} student=${invoice.studentId}`
      );
      throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');
    }
  }

  const { credits, remainingBalance } = await computeInvoiceBalance(invoice.id);

  return {
    ...invoice,
    amountPaid: credits,
    outstandingBalance: remainingBalance,
  };
}

export async function recordPayment(invoiceId, amountPaid, idempotencyKey, userContext) {
  const numInvoiceId = Number(invoiceId);
  const numAmountPaid = Number(amountPaid);

  if (!idempotencyKey || typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
    throw new AppError(400, 'BAD_REQUEST', 'Idempotency-Key header is required.');
  }

  const cleanKey = idempotencyKey.trim();

  return prisma.$transaction(async (tx) => {
    // 1. Check Idempotency Key
    const existingPayment = await tx.feePayment.findUnique({
      where: { idempotencyKey: cleanKey },
      include: { invoice: { include: { feeType: true, student: true } } },
    });

    if (existingPayment) {
      // Different payload (different invoice or amount) → always 409, never leak original details
      if (existingPayment.invoiceId !== numInvoiceId || existingPayment.amountPaid !== numAmountPaid) {
        logger.warn(
          `Idempotency key collision with different payload: key=${cleanKey} incoming=(inv:${numInvoiceId}, amt:${numAmountPaid})`
        );
        throw new AppError(409, 'CONFLICT', 'Idempotency key has already been used with a different request payload.');
      }

      // Same payload but different user → 409, never let one user replay another's payment
      if (existingPayment.invoice.studentId !== undefined) {
        // Identify who originally made this payment via audit log
        const originalAudit = await tx.auditLog.findFirst({
          where: {
            action: 'PAYMENT_RECORDED',
            entityType: 'FeeInvoice',
            entityId: numInvoiceId,
            meta: { contains: `"paymentId":${existingPayment.id}` },
          },
          select: { userId: true },
        });
        if (originalAudit && originalAudit.userId !== userContext.id) {
          logger.warn(
            `Idempotency key reuse by different user: key=${cleanKey} originalUser=${originalAudit.userId} currentUser=${userContext.id}`
          );
          throw new AppError(409, 'CONFLICT', 'Idempotency key has already been used with a different request payload.');
        }
      }

      logger.info(`Duplicate idempotency key replayed: key=${cleanKey} paymentId=${existingPayment.id}`);
      const { remainingBalance } = await computeInvoiceBalance(numInvoiceId, tx);
      return {
        isReplay: true,
        message: 'Payment already processed with this idempotency key.',
        payment: existingPayment,
        invoiceStatus: existingPayment.invoice.status,
        outstandingBalance: remainingBalance,
      };
    }

    // 2. Fetch invoice and verify guardian access if applicable
    const invoice = await tx.feeInvoice.findUnique({
      where: { id: numInvoiceId },
    });
    if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

    if (userContext.role === 'GUARDIAN') {
      const guardian = await tx.guardian.findUnique({ where: { userId: userContext.id } });
      if (!guardian) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

      const link = await tx.guardianStudent.findUnique({
        where: {
          guardianId_studentId: {
            guardianId: guardian.id,
            studentId: invoice.studentId,
          },
        },
      });
      if (!link) {
        logger.warn(
          `Authorization denied: guardian=${userContext.id} attempted payment on unlinked invoice=${numInvoiceId}`
        );
        throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');
      }
    }

    // 3. Status checks: reject payment on PAID or VOID
    if (invoice.status === 'PAID') {
      throw new AppError(409, 'CONFLICT', 'Cannot record payment on an invoice that is already PAID.');
    }
    if (invoice.status === 'VOID') {
      throw new AppError(409, 'CONFLICT', 'Cannot record payment on a VOID invoice.');
    }

    // 4. Re-read balance inside transaction to strictly prevent overpayment and race conditions
    const { remainingBalance } = await computeInvoiceBalance(numInvoiceId, tx);

    if (numAmountPaid > remainingBalance) {
      logger.warn(
        `Overpayment rejected: invoice=${numInvoiceId} attempted=${numAmountPaid} balance=${remainingBalance}`
      );
      throw new AppError(
        400,
        'BAD_REQUEST',
        `Payment amount (${numAmountPaid} paise) exceeds outstanding invoice balance (${remainingBalance} paise).`
      );
    }

    // 5. Create FeePayment record
    const payment = await tx.feePayment.create({
      data: {
        invoiceId: numInvoiceId,
        amountPaid: numAmountPaid,
        idempotencyKey: cleanKey,
      },
    });

    // 6. Write CREDIT ledger entry
    await tx.feeLedgerEntry.create({
      data: {
        studentId: invoice.studentId,
        invoiceId: numInvoiceId,
        paymentId: payment.id,
        entryType: 'CREDIT',
        amount: numAmountPaid,
        description: `Payment received: payment #${payment.id} for invoice #${numInvoiceId}`,
      },
    });

    // 7. Update Invoice status based on remaining balance
    const newRemainingBalance = remainingBalance - numAmountPaid;
    const newStatus = newRemainingBalance === 0 ? 'PAID' : 'PARTIAL';

    const updatedInvoice = await tx.feeInvoice.update({
      where: { id: numInvoiceId },
      data: { status: newStatus },
    });

    // 8. Audit log entry
    await tx.auditLog.create({
      data: {
        userId: userContext.id,
        action: 'PAYMENT_RECORDED',
        entityType: 'FeeInvoice',
        entityId: numInvoiceId,
        meta: JSON.stringify({
          paymentId: payment.id,
          amountPaid: numAmountPaid,
          idempotencyKey: cleanKey,
          previousBalance: remainingBalance,
          newBalance: newRemainingBalance,
          newStatus,
        }),
      },
    });

    logger.info(
      `Payment recorded: invoiceId=${numInvoiceId} paymentId=${payment.id} amount=${numAmountPaid} newStatus=${newStatus} by userId=${userContext.id}`
    );

    return {
      isReplay: false,
      payment,
      invoiceStatus: updatedInvoice.status,
      amountPaid: numAmountPaid,
      outstandingBalance: newRemainingBalance,
    };
  });
}

export async function voidInvoice(invoiceId, userId) {
  const numId = Number(invoiceId);

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.feeInvoice.findUnique({
      where: { id: numId },
      include: { _count: { select: { payments: true } } },
    });

    if (!invoice) throw new AppError(404, 'NOT_FOUND', 'Invoice not found.');

    if (invoice.status === 'VOID') {
      throw new AppError(409, 'CONFLICT', 'Invoice is already VOID.');
    }

    if (invoice.status === 'PAID') {
      throw new AppError(409, 'CONFLICT', 'Cannot void a PAID invoice.');
    }

    // VOID is allowed only for invoices with NO payments (covers PARTIAL status)
    if (invoice._count.payments > 0) {
      throw new AppError(409, 'CONFLICT', 'Cannot void an invoice that already has recorded payments.');
    }

    // Update status to VOID
    const updated = await tx.feeInvoice.update({
      where: { id: numId },
      data: { status: 'VOID' },
    });

    // Write reversing CREDIT ledger entry to zero out the balance
    await tx.feeLedgerEntry.create({
      data: {
        studentId: invoice.studentId,
        invoiceId: invoice.id,
        entryType: 'CREDIT',
        amount: invoice.amountDue,
        description: `Reversing entry: Invoice #${invoice.id} voided`,
      },
    });

    // Audit entry
    await tx.auditLog.create({
      data: {
        userId,
        action: 'INVOICE_VOIDED',
        entityType: 'FeeInvoice',
        entityId: invoice.id,
        meta: JSON.stringify({ amountDue: invoice.amountDue }),
      },
    });

    logger.info(`Invoice voided: invoiceId=${invoice.id} amountDue=${invoice.amountDue} by userId=${userId}`);
    return { ...updated, outstandingBalance: 0 };
  });
}

export async function getStudentFeeSummary(studentId) {
  const numStudentId = Number(studentId);
  const student = await prisma.student.findUnique({
    where: { id: numStudentId },
    include: { section: { include: { class: true } } },
  });
  if (!student) throw new AppError(404, 'NOT_FOUND', 'Student record not found.');

  // Calculate from ledger
  const ledgerEntries = await prisma.feeLedgerEntry.findMany({
    where: { studentId: numStudentId },
    select: { entryType: true, amount: true },
  });

  let totalInvoiced = 0;
  let totalPaid = 0;

  for (const entry of ledgerEntries) {
    if (entry.entryType === 'DEBIT') {
      totalInvoiced += entry.amount;
    } else if (entry.entryType === 'CREDIT') {
      totalPaid += entry.amount;
    }
  }

  const outstandingBalance = Math.max(0, totalInvoiced - totalPaid);

  const invoices = await prisma.feeInvoice.findMany({
    where: { studentId: numStudentId },
    include: { feeType: true },
    orderBy: { createdAt: 'desc' },
  });

  return {
    student: {
      id: student.id,
      name: student.name,
      rollNumber: student.rollNumber,
      section: student.section?.name,
      class: student.section?.class?.name,
    },
    totalInvoiced,
    totalPaid,
    outstandingBalance,
    invoicesCount: invoices.length,
    invoices,
  };
}

export async function getAdminFeeReport() {
  const sections = await prisma.section.findMany({
    include: {
      class: true,
      students: {
        include: {
          feeInvoices: true,
          feeLedgerEntries: true,
        },
      },
    },
    orderBy: [{ classId: 'asc' }, { name: 'asc' }],
  });

  const sectionReports = sections.map((sec) => {
    let invoiced = 0;
    let paid = 0;
    let statusCounts = { UNPAID: 0, PARTIAL: 0, PAID: 0, VOID: 0 };

    for (const student of sec.students) {
      for (const inv of student.feeInvoices) {
        if (statusCounts[inv.status] !== undefined) {
          statusCounts[inv.status]++;
        }
      }

      for (const entry of student.feeLedgerEntries) {
        if (entry.entryType === 'DEBIT') invoiced += entry.amount;
        if (entry.entryType === 'CREDIT') paid += entry.amount;
      }
    }

    return {
      sectionId: sec.id,
      sectionName: `${sec.class.name}-${sec.name}`,
      studentCount: sec.students.length,
      totalInvoiced: invoiced,
      totalPaid: paid,
      outstandingBalance: Math.max(0, invoiced - paid),
      statusCounts,
    };
  });

  // Global totals
  const allLedgerEntries = await prisma.feeLedgerEntry.findMany({
    select: { entryType: true, amount: true },
  });

  let grandInvoiced = 0;
  let grandPaid = 0;
  for (const e of allLedgerEntries) {
    if (e.entryType === 'DEBIT') grandInvoiced += e.amount;
    if (e.entryType === 'CREDIT') grandPaid += e.amount;
  }

  return {
    totals: {
      totalInvoiced: grandInvoiced,
      totalPaid: grandPaid,
      outstandingBalance: Math.max(0, grandInvoiced - grandPaid),
    },
    sections: sectionReports,
  };
}

