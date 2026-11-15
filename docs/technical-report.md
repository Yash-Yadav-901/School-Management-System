# Technical Report: School Management System

## 1. Overview
The School Management System is a full-stack web application designed for K-12 operational management. It provides role-differentiated interfaces and secure APIs for three primary user personas:
- **Administrators**: Oversee institutional configuration (classes, sections, subjects, teacher assignments, guardian links), fee structures, exam schedules, dynamic grade boundary rules, and immutable audit logs.
- **Teachers**: Access assigned class sections, record daily morning/afternoon session attendance with bulk upsert protection, and submit examination marks with boundary validation.
- **Guardians**: Review linked children's academic performance, historical attendance records, fee invoices, ledger transactions, and execute simulated fee payments.

---

## 2. Architecture
The system employs a strict 3-tier decoupled architecture:

```
[ Frontend: React 18 + Vite + Tailwind CSS ]
                    │
                    ▼  (JSON over HTTP + Bearer JWT)
[ REST API: Node.js 22 + Express 4 Layered Architecture ]
    ├── Routes: Request dispatching & path routing
    ├── Middleware: Authentication, RBAC, Rate Limiting, Request Logging
    ├── Validators: Plain JS schema assertions (no third-party validator dependencies)
    ├── Controllers: HTTP translation, query parsing, and response status mapping
    └── Services: Core domain business logic, invariant enforcement, and transactions
                    │
                    ▼  (Prisma ORM 5.x)
[ Persistence: SQLite 3 Engine (dev.db / test.db) ]
```

### Key Architectural Decisions
- **Controllers never execute business logic**: Controllers only parse requests, invoke service functions, and return responses.
- **Service-layer transactions**: Multi-table state mutations (e.g., student deletion cascades, payment ledger insertions, bulk attendance, invoice voiding) execute exclusively within Prisma interactive transactions (`prisma.$transaction`).
- **Zero UI Component Libraries**: Frontend UI is implemented using clean, native Tailwind CSS utility classes and custom React hooks (e.g., `useDialogFocusTrap`), avoiding heavy component library dependencies.

---

## 3. Data Model
The relational schema comprises 18 tables defined in `server/prisma/schema.prisma`:
- **Identity & Profiles**: `User` (email, hashed password, role: `ADMIN` | `TEACHER` | `GUARDIAN`), `Teacher` (`userId`, name, phone), `Guardian` (`userId`, name, phone), and `Student` (`sectionId`, name, rollNumber, dob, gender).
- **Academic Structure**: `Class` (e.g., "Grade 9"), `Section` (e.g., "A", "B"), `Subject` (e.g., "Mathematics"), and junction table `ClassSubject` linking `(sectionId, subjectId, teacherId)` with a composite unique key.
- **Relationships**: `GuardianStudent` junction table linking `(guardianId, studentId)` with relationship metadata ("Father", "Mother", etc.).
- **Attendance**: `Attendance` recording `studentId`, `date`, `session` (`MORNING` | `AFTERNOON`), `status` (`PRESENT` | `ABSENT` | `LATE`), and `recordedById`, governed by `UNIQUE(studentId, date, session)`.
- **Examination & Dynamic Grading**: `Exam` (section, subject, maxMarks, examDate), `ExamResult` (`examId`, `studentId`, `marksObtained`), and `GradeRule` (`minPercent`, `maxPercent`, `grade`, `gradePoint`). Grades are never statically stored; they are dynamically resolved on query against `GradeRule`.
- **Double-Entry Fee Ledger**: `FeeType`, `FeeInvoice` (`amountDue`, `dueDate`, `status`), `FeePayment` (`amountPaid`, `idempotencyKey`), and `FeeLedgerEntry` (`entryType`: `DEBIT` | `CREDIT`, `amount`, `studentId`, `invoiceId`, `paymentId`). All financial values are strictly stored as integer paise.
- **Audit Logging**: `AuditLog` captures `userId`, `action`, `entityType`, `entityId`, `meta` (sanitized JSON), and `createdAt`.

---

## 4. Security
- **Authentication**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256, carrying user `id`, `email`, and `role`. Default expiration is 8 hours (`JWT_EXPIRES_IN=8h`). Passwords are encrypted using `bcrypt` with configurable cost factor (`BCRYPT_ROUNDS=10`).
- **Authorization & RBAC**: Every endpoint enforces `authenticate` and `requireRole(...)` middleware. Teachers are restricted to their assigned sections verified against `ClassSubject`.
- **Privacy Preservation**: When a guardian queries a student not linked to their account in `GuardianStudent`, the API responds with `404 NOT_FOUND` rather than `403 FORBIDDEN` to prevent ID enumeration and student enrollment probing.
- **Rate Limiting**: Express rate limiter applied to login endpoints (`LOGIN_RATE_LIMIT_MAX`, default 30 attempts per 15-minute window).
- **Credential Hygiene**: Audit logging explicitly scrubs passwords, hashes, secrets, and bearer tokens before persistence. Database responses explicitly project out `passwordHash`.

---

## 5. System Integrity

### Attendance Upsert
- Database constraint `UNIQUE(student_id, date, session)` guarantees that duplicate records cannot exist.
- When attendance is submitted for an existing slot, the service updates the status, records both old and new statuses in `AuditLog` for traceability, and returns exact `createdCount` and `updatedCount` tallies.
- Future dates are strictly rejected against the configurable school timezone (`SCHOOL_TIMEZONE`, default `Asia/Kolkata`).

### Payment Transaction & Ledger Invariants
- Invoices do not store a static remaining balance. Balance is computed dynamically as:
  $$\text{Outstanding Balance} = \sum \text{DEBIT entries} - \sum \text{CREDIT entries}$$
- Payments run inside an atomic `prisma.$transaction`:
  1. Validates invoice exists, is not `VOID`, and payment does not exceed remaining balance.
  2. Inserts `FeePayment` with client-provided `idempotencyKey`.
  3. Inserts a `CREDIT` entry in `FeeLedgerEntry`.
  4. Updates invoice status to `PAID` or `PARTIALLY_PAID`.
  5. Records `PAYMENT_RECORDED` in `AuditLog`.

### Idempotency Lifecycle
- `FeePayment` enforces a unique constraint on `idempotency_key`.
- If a client retries a payment with the same `Idempotency-Key` and identical payload, the backend detects the replay and returns the original transaction details without executing a duplicate credit.
- The client-side payment workflow retains the key across network interruptions, HTTP 503 locks, and 5xx server errors, regenerating a fresh UUID only upon successful payment (2xx) or terminal client error (4xx).

### Invoice Voiding
- An invoice can only be voided if zero payments have been made against it (`amountPaid === 0`).
- Voiding executes in a transaction that marks the invoice `VOID`, appends an offsetting `CREDIT` entry to `FeeLedgerEntry` ("Invoice voided: reversing entry"), and logs the administrative void action.

---

## 6. Testing & Acceptance Verification
The automated test suite consists of 16 test files and 178 tests (161 backend tests, 17 frontend tests), completely green.

### Five Core Acceptance Tests Mapping

| # | Acceptance Criterion | Test File | Test Name |
|---|---|---|---|
| **1** | Teacher can only access assigned classes and record attendance | `server/tests/teacherGuardianReads.test.js`<br>`server/tests/attendance.test.js` | `teacher gets only their assigned sections from /api/teacher/sections`<br>`POST /api/attendance — record bulk attendance > teacher cannot record attendance for an unassigned section → 403` |
| **2** | Duplicate attendance is rejected / safely upserted | `server/tests/attendance.test.js` | `POST /api/attendance — record bulk attendance > same student/date/session submitted twice → second call succeeds (upsert, no duplicate error)`<br>`POST /api/attendance — record bulk attendance > concurrent duplicate submissions leave exactly one row` |
| **3** | Exam results calculated correctly from configured grading rules | `server/tests/exam.test.js`<br>`server/tests/gradeRule.test.js` | `Phase 5: Exams, Marks, and Report Cards > GET /api/exams/report-card/:studentId — Report Card > calculates grades correctly based on GradeRule table`<br>`Admin CRUD for GradeRule & Guard Rails > editing a rule changes the same student report card grade dynamically` |
| **4** | Guardian sees only their linked student's data | `server/tests/teacherGuardianReads.test.js` | `Phase 4: Teacher & Guardian Scoped Read Endpoints > guardian cannot access unlinked student profile (404 NOT_FOUND)`<br>`Phase 4: Teacher & Guardian Scoped Read Endpoints > guardian cannot view report card of unlinked student (404 NOT_FOUND)` |
| **5** | Fee due + paid = ledger balance | `server/tests/fee.test.js` | `Phase 6: Fees, Ledger, and Simulated Payments > Fee Invoices & Balances > calculates invoice balance as amountDue minus sum of CREDIT ledger entries`<br>`Phase 6: Fees, Ledger, and Simulated Payments > Reconciliation test: total invoiced minus total paid equals sum of all ledger entries > independent reconciliation with mix of paid, partial, unpaid, and void invoices` |

---

## 7. AI Usage
- **Development Assistant**: I used Claude Sonnet 4.6 and 5.5 AI code to generate and get code templates and to write repateive codes and develop this project.
- **Responsibilities Handled by AI**: Scaffolding repetitive CRUD routes, generating comprehensive integration test assertions across edge and boundary conditions, drafting the OpenAPI 3.0 specification, verifying timezone conversion logic, implementing modal focus-trap hooks, and auditing mobile viewport layouts.
- **Human Guidance & Guardrails**: System architecture, schema normalization, integer paise financial constraints, zero third-party UI library requirements, and idempotency key lifecycle policies were directed and reviewed by me.

---

## 8. Known Limitations
- **SQLite Concurrency**: SQLite employs database/file-level write locking. While perfectly suited for local demonstration and evaluation, high-concurrency production deployments would encounter lock contention (`SQLITE_BUSY`). The error handler maps these to `503 SERVICE_UNAVAILABLE`. Production deployment requires PostgreSQL.
- **Simulated Financial Rails**: Fee payment does not interface with external payment gateways (e.g., Stripe, Razorpay) or banking APIs; all ledger transactions are simulated internally.
- **Synchronous Notification Flow**: The system does not incorporate an asynchronous job queue (e.g., Redis/BullMQ) or email/SMS dispatch; notifications and confirmations are returned synchronously within API response payloads.
