import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Delete all rows in dependency order (children before parents).
async function clearDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.feeLedgerEntry.deleteMany();
  await prisma.feePayment.deleteMany();
  await prisma.feeInvoice.deleteMany();
  await prisma.examResult.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.classSubject.deleteMany();
  await prisma.guardianStudent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.gradeRule.deleteMany();
  await prisma.feeType.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
}

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function pickStatus(rand) {
  if (rand > 0.85) return 'ABSENT';
  if (rand > 0.75) return 'LATE';
  return 'PRESENT';
}

async function main() {
  await clearDatabase();

  const rounds = parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10);
  const hash = (pw) => bcrypt.hash(pw, rounds);

  // ── Users ──────────────────────────────────────────────────────────────────
  const [adminUser, t1User, t2User, g1User, g2User] = await prisma.$transaction([
    prisma.user.create({ data: { email: 'admin@school.demo', passwordHash: await hash('Admin@123'), role: 'ADMIN' } }),
    prisma.user.create({ data: { email: 'teacher1@school.demo', passwordHash: await hash('Teacher@123'), role: 'TEACHER' } }),
    prisma.user.create({ data: { email: 'teacher2@school.demo', passwordHash: await hash('Teacher@123'), role: 'TEACHER' } }),
    prisma.user.create({ data: { email: 'guardian1@school.demo', passwordHash: await hash('Guardian@123'), role: 'GUARDIAN' } }),
    prisma.user.create({ data: { email: 'guardian2@school.demo', passwordHash: await hash('Guardian@123'), role: 'GUARDIAN' } }),
  ]);

  // ── Teacher and Guardian profiles ─────────────────────────────────────────
  const [teacher1, teacher2] = await prisma.$transaction([
    prisma.teacher.create({ data: { userId: t1User.id, name: 'Rajan Kumar', phone: '9876543210' } }),
    prisma.teacher.create({ data: { userId: t2User.id, name: 'Priya Sharma', phone: '9876543211' } }),
  ]);

  const [guardian1, guardian2] = await prisma.$transaction([
    prisma.guardian.create({ data: { userId: g1User.id, name: 'Amit Singh', phone: '9876543212' } }),
    prisma.guardian.create({ data: { userId: g2User.id, name: 'Sunita Verma', phone: '9876543213' } }),
  ]);

  // ── Classes and Sections ───────────────────────────────────────────────────
  const [clsGrade9, clsGrade10] = await prisma.$transaction([
    prisma.class.create({ data: { name: 'Grade 9' } }),
    prisma.class.create({ data: { name: 'Grade 10' } }),
  ]);

  const [sec9A, sec10A, sec10B] = await prisma.$transaction([
    prisma.section.create({ data: { name: 'A', classId: clsGrade9.id } }),
    prisma.section.create({ data: { name: 'A', classId: clsGrade10.id } }),
    prisma.section.create({ data: { name: 'B', classId: clsGrade10.id } }),
  ]);

  // ── Subjects ───────────────────────────────────────────────────────────────
  const [math, science, english, history] = await prisma.$transaction([
    prisma.subject.create({ data: { name: 'Mathematics', code: 'MATH' } }),
    prisma.subject.create({ data: { name: 'Science', code: 'SCI' } }),
    prisma.subject.create({ data: { name: 'English', code: 'ENG' } }),
    prisma.subject.create({ data: { name: 'History', code: 'HIST' } }),
  ]);

  // ── Class–Subject–Teacher assignments ─────────────────────────────────────
  // teacher1 owns Section 9-A for Math and Science.
  // teacher2 owns Section 10-A for Math and English, and Section 10-B for History.
  await prisma.classSubject.createMany({
    data: [
      { sectionId: sec9A.id,  subjectId: math.id,    teacherId: teacher1.id },
      { sectionId: sec9A.id,  subjectId: science.id, teacherId: teacher1.id },
      { sectionId: sec10A.id, subjectId: math.id,    teacherId: teacher2.id },
      { sectionId: sec10A.id, subjectId: english.id, teacherId: teacher2.id },
      { sectionId: sec10B.id, subjectId: history.id, teacherId: teacher2.id },
    ],
  });

  // ── Students ───────────────────────────────────────────────────────────────
  const [s1, s2, s3] = await prisma.$transaction([
    prisma.student.create({ data: { name: 'Rahul Singh',  dob: '2010-05-15', gender: 'MALE',   rollNumber: '9A01', sectionId: sec9A.id } }),
    prisma.student.create({ data: { name: 'Anjali Singh', dob: '2010-08-22', gender: 'FEMALE', rollNumber: '9A02', sectionId: sec9A.id } }),
    prisma.student.create({ data: { name: 'Ravi Patel',   dob: '2010-03-10', gender: 'MALE',   rollNumber: '9A03', sectionId: sec9A.id } }),
  ]);

  const [s4, s5] = await prisma.$transaction([
    prisma.student.create({ data: { name: 'Priya Verma', dob: '2009-11-30', gender: 'FEMALE', rollNumber: '10A01', sectionId: sec10A.id } }),
    prisma.student.create({ data: { name: 'Karan Verma', dob: '2009-07-18', gender: 'MALE',   rollNumber: '10A02', sectionId: sec10A.id } }),
  ]);

  const [s6, s7] = await prisma.$transaction([
    prisma.student.create({ data: { name: 'Sneha Gupta',  dob: '2009-02-14', gender: 'FEMALE', rollNumber: '10B01', sectionId: sec10B.id } }),
    prisma.student.create({ data: { name: 'Vikram Joshi', dob: '2009-09-05', gender: 'MALE',   rollNumber: '10B02', sectionId: sec10B.id } }),
  ]);

  // ── Guardian–Student Link Table ───────────────────────────────────────────
  // guardian1 linked to Rahul and Anjali
  // guardian2 linked to Priya and Karan
  await prisma.guardianStudent.createMany({
    data: [
      { guardianId: guardian1.id, studentId: s1.id, relationship: 'Father' },
      { guardianId: guardian1.id, studentId: s2.id, relationship: 'Father' },
      { guardianId: guardian2.id, studentId: s4.id, relationship: 'Mother' },
      { guardianId: guardian2.id, studentId: s5.id, relationship: 'Mother' },
    ],
  });

  // ── Grade rules ────────────────────────────────────────────────────────────
  await prisma.gradeRule.createMany({
    data: [
      { minPercent: 90,   maxPercent: 100,   grade: 'A+', gradePoint: 10 },
      { minPercent: 80,   maxPercent: 89.99, grade: 'A',  gradePoint: 9  },
      { minPercent: 70,   maxPercent: 79.99, grade: 'B+', gradePoint: 8  },
      { minPercent: 60,   maxPercent: 69.99, grade: 'B',  gradePoint: 7  },
      { minPercent: 50,   maxPercent: 59.99, grade: 'C',  gradePoint: 6  },
      { minPercent: 0,    maxPercent: 49.99, grade: 'F',  gradePoint: 0  },
    ],
  });

  // ── Attendance (last 5 school days for Section 9-A) ────────────────────────
  const dates = [-4, -3, -2, -1, 0].map(dateOffset);
  const students9A = [s1, s2, s3];
  const attendanceRows = [];

  for (const date of dates) {
    for (const student of students9A) {
      attendanceRows.push({
        studentId:    student.id,
        date,
        session:      'MORNING',
        status:       pickStatus(Math.random()),
        recordedById: t1User.id,
      });
    }
  }
  await prisma.attendance.createMany({ data: attendanceRows });

  // ── Exams and results ──────────────────────────────────────────────────────
  const gradeRules = await prisma.gradeRule.findMany({ orderBy: { minPercent: 'desc' } });

  function applyGrade(marks, maxMarks) {
    const pct = (marks / maxMarks) * 100;
    const rule = gradeRules.find((r) => pct >= r.minPercent && pct <= r.maxPercent);
    return rule ? { grade: rule.grade, gradePoint: rule.gradePoint } : { grade: 'F', gradePoint: 0 };
  }

  const mathExam = await prisma.exam.create({
    data: { name: 'Mid-Term Mathematics', sectionId: sec9A.id, subjectId: math.id, maxMarks: 100, examDate: '2026-10-15' },
  });
  const sciExam = await prisma.exam.create({
    data: { name: 'Mid-Term Science', sectionId: sec9A.id, subjectId: science.id, maxMarks: 100, examDate: '2026-10-17' },
  });

  const rawResults = [
    { examId: mathExam.id, studentId: s1.id, marksObtained: 85 },
    { examId: mathExam.id, studentId: s2.id, marksObtained: 72 },
    { examId: mathExam.id, studentId: s3.id, marksObtained: 55 },
    { examId: sciExam.id,  studentId: s1.id, marksObtained: 91 },
    { examId: sciExam.id,  studentId: s2.id, marksObtained: 68 },
    { examId: sciExam.id,  studentId: s3.id, marksObtained: 78 },
  ];

  for (const r of rawResults) {
    await prisma.examResult.create({ data: r });
  }

  // ── Fee types ──────────────────────────────────────────────────────────────
  // Amounts in paise: 500000 paise = ₹5,000  |  50000 paise = ₹500
  const [tuitionFee, libraryFee] = await prisma.$transaction([
    prisma.feeType.create({ data: { name: 'Tuition Fee', defaultAmount: 500000 } }),
    prisma.feeType.create({ data: { name: 'Library Fee', defaultAmount: 50000  } }),
  ]);

  // ── Fee invoices and ledger entries (DEBITS) ───────────────────────────────
  const allStudents = [s1, s2, s3, s4, s5, s6, s7];
  const invoices = [];
  for (const student of allStudents) {
    const inv = await prisma.feeInvoice.create({
      data: { studentId: student.id, feeTypeId: tuitionFee.id, amountDue: 500000, dueDate: '2026-11-30', status: 'UNPAID' },
    });
    // Create DEBIT ledger entry for each invoice
    await prisma.feeLedgerEntry.create({
      data: {
        studentId: student.id,
        invoiceId: inv.id,
        entryType: 'DEBIT',
        amount: 500000,
        description: 'Invoice generated: Tuition Fee',
      },
    });
    invoices.push({ student, inv });
  }

  // Record one full payment (CREDIT) for Rahul Singh in one transaction
  const rahulEntry = invoices.find((e) => e.student.id === s1.id);
  await prisma.$transaction(async (tx) => {
    const payment = await tx.feePayment.create({
      data: {
        invoiceId: rahulEntry.inv.id,
        amountPaid: 500000,
        idempotencyKey: 'seed-tuition-rahul-2026-11',
      },
    });
    await tx.feeInvoice.update({
      where: { id: rahulEntry.inv.id },
      data: { status: 'PAID' },
    });
    await tx.feeLedgerEntry.create({
      data: {
        studentId: rahulEntry.student.id,
        invoiceId: rahulEntry.inv.id,
        paymentId: payment.id,
        entryType: 'CREDIT',
        amount: 500000,
        description: 'Payment received: Tuition Fee',
      },
    });
    await tx.auditLog.create({
      data: {
        userId:     adminUser.id,
        action:     'PAYMENT_RECORDED',
        entityType: 'FeeInvoice',
        entityId:   rahulEntry.inv.id,
        meta: JSON.stringify({ amountPaid: 500000, method: 'SIMULATED' }),
      },
    });
  });

  console.log('Seed complete.');
  console.log('  Admin:     admin@school.demo    / Admin@123');
  console.log('  Teacher1:  teacher1@school.demo / Teacher@123  (Grade 9-A: Math, Science)');
  console.log('  Teacher2:  teacher2@school.demo / Teacher@123  (Grade 10-A: Math, English | Grade 10-B: History)');
  console.log('  Guardian1: guardian1@school.demo / Guardian@123  (Rahul & Anjali Singh)');
  console.log('  Guardian2: guardian2@school.demo / Guardian@123  (Priya & Karan Verma)');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
