# School Management System

A full-stack web application for managing school operations — built for the Algions AI Labs internship assessment.

---

## Architecture

```
client/        React 18 + Vite + Tailwind CSS (Phase 8+)
server/        Node.js + Express, ES modules
  src/
    config/    Environment variable validation
    db/        Prisma client singleton
    middleware/ Auth, RBAC, error handler, request logger
    utils/     logger, AppError, asyncHandler
    validators/ Plain JS validation functions (no Zod)
    routes/    Express routers (one per module)
    controllers/ HTTP layer only — no business logic
    services/  Business rules and transactions
  prisma/
    schema.prisma  Database schema
    migrations/    Repeatable migration history
    seed.js        Synthetic demo data
  tests/       Vitest + Supertest integration tests
docs/          ER diagram, technical report, API docs
```

**Layering rule:** routes → controllers → services → Prisma. Controllers never contain business logic.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router, TanStack Query |
| Backend | Node.js 22, Express 4 |
| ORM | Prisma 5 |
| Database | SQLite (local dev) |
| Auth | bcrypt, jsonwebtoken |
| Security | helmet, cors, express-rate-limit |
| API Docs | swagger-ui-express |
| Testing | Vitest, Supertest |

---

## Setup

### Prerequisites
- Node.js 20+ (tested on 22)
- npm 10+

### 1. Clone and install

```bash
git clone <repo-url>
cd "School Management System"

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure environment

```bash
cd ../server
cp .env.example .env
# Edit .env — set JWT_SECRET to a random string of 32+ characters
```

### 3. Run migrations and seed

```bash
npm run db:migrate   # creates dev.db and applies all migrations
npm run db:seed      # populates with synthetic demo data matching prisma/seed.js
```

### 4. Start backend and frontend servers

In terminal 1 (backend):
```bash
cd server
npm run dev          # http://localhost:4000 (API & Swagger UI at /api-docs)
```

In terminal 2 (frontend):
```bash
cd client
npm run dev          # http://localhost:5173
```

---

## Application URLs

| Service / Interface | URL | Description |
|---|---|---|
| Frontend Web Client | `http://localhost:5173` | React application (Admin, Teacher, Guardian portals) |
| Backend API Root | `http://localhost:4000` | Express REST API server |
| Swagger UI API Docs | `http://localhost:4000/api-docs` | Interactive OpenAPI 3.0 specification |
| Health Check | `http://localhost:4000/api/health` | Service uptime and status probe |

---

## Demo Credentials & Seed Data

The database seed (`server/prisma/seed.js`) provisions realistic synthetic accounts, classes, and records:

### User Credentials

| Role | Email | Password | Assigned Scope / Details |
|---|---|---|---|
| **Admin** | `admin@school.demo` | `Admin@123` | Institutional superuser (full access to academic setup, fees, reports, audit) |
| **Teacher 1** | `teacher1@school.demo` | `Teacher@123` | Rajan Kumar — Assigned to **Grade 9 Section A** (Mathematics & Science) |
| **Teacher 2** | `teacher2@school.demo` | `Teacher@123` | Priya Sharma — Assigned to **Grade 10 Section A** (Math, English) & **Grade 10 Section B** (History) |
| **Guardian 1** | `guardian1@school.demo` | `Guardian@123` | Amit Singh — Linked children: **Rahul Singh** (`9A01`) & **Anjali Singh** (`9A02`) |
| **Guardian 2** | `guardian2@school.demo` | `Guardian@123` | Sunita Verma — Linked children: **Priya Verma** (`10A01`) & **Karan Verma** (`10A02`) |

### Example Seed Data

- **Classes & Sections**:
  - `Grade 9` &rarr; Section `A`
  - `Grade 10` &rarr; Section `A`, Section `B`
- **Subjects**:
  - Mathematics (`MATH`), Science (`SCI`), English (`ENG`), History (`HIST`)
- **Students**:
  - **Grade 9-A**: Rahul Singh (`9A01`), Anjali Singh (`9A02`), Ravi Patel (`9A03`)
  - **Grade 10-A**: Priya Verma (`10A01`), Karan Verma (`10A02`)
  - **Grade 10-B**: Sneha Gupta (`10B01`), Vikram Joshi (`10B02`)
- **Exams**:
  - `Mid-Term Mathematics` (Section 9-A, Subject: MATH, Max Marks: 100, Date: 2026-10-15)
  - `Mid-Term Science` (Section 9-A, Subject: SCI, Max Marks: 100, Date: 2026-10-17)
  - Results entered for Rahul, Anjali, and Ravi.
- **Grade Rules (Scale)**:
  - `A+` (90.00% – 100.00%, GP 10)
  - `A` (80.00% – 89.99%, GP 9)
  - `B+` (70.00% – 79.99%, GP 8)
  - `B` (60.00% – 69.99%, GP 7)
  - `C` (50.00% – 59.99%, GP 6)
  - `F` (0.00% – 49.99%, GP 0) &mdash; Protected base rule guard
- **Fee Types & Invoices**:
  - `Tuition Fee`: ₹5,000 (500,000 paise)
  - `Library Fee`: ₹500 (50,000 paise)
  - Invoices generated for all 7 students; Rahul Singh has one full payment recorded (`PAID`, ₹5,000 credit in fee ledger).

---

## NPM Scripts

### Server (`server/`)

| Script | Action |
|---|---|
| `npm run dev` | Start server with file watcher |
| `npm start` | Start server (production) |
| `npm test` | Run all Vitest backend tests (13 test files, 161 tests) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Reset and seed demo data |
| `npm run db:reset` | Drop all tables and re-migrate (destructive) |

### Client (`client/`)

| Script | Action |
|---|---|
| `npm run dev` | Start Vite dev server on `http://localhost:5173` |
| `npm run build` | Build production bundle in `dist/` |
| `npm test` | Run all Vitest frontend unit tests (3 test files, 17 tests) |
| `npm run preview` | Locally preview production build |

---

## Environment Variables

See [server/.env.example](server/.env.example).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Prisma SQLite path, e.g. `file:./dev.db` |
| `JWT_SECRET` | Yes | Min 32-char random string |
| `JWT_EXPIRES_IN` | No | Token lifetime, default `8h` |
| `PORT` | No | HTTP port, default `4000` |
| `BCRYPT_ROUNDS` | No | bcrypt cost factor, default `10` |
| `CORS_ORIGIN` | No | Allowed origin, default `http://localhost:5173` |
| `CLIENT_ORIGIN` | No | Allowed frontend origin for Vite dev, default `http://localhost:5173` |
| `LOGIN_RATE_LIMIT_MAX` | No | Max login attempts per window, default `30` (higher in test env) |
| `LOGIN_RATE_LIMIT_WINDOW_MIN` | No | Window duration in minutes for login rate limit, default `15` |
| `SCHOOL_TIMEZONE` | No | School timezone for future-date attendance and daily metrics, default `Asia/Kolkata` |
| `LOG_SILENT` | No | Set `true` during tests to suppress logs |

---

## API Documentation

Swagger UI is served at `http://localhost:4000/api-docs` (Phase 7+).

---

## ER Diagram

See [docs/er-diagram.md](docs/er-diagram.md) (Phase 7+).

---

## Running Tests

### Backend Tests (13 test files, 161 tests)

```bash
cd server
npm test           # single run, resets test.db before suite
npm run test:watch # interactive watch mode
```

The server test suite uses a separate `test.db` database that is wiped and re-migrated automatically before each test suite run.

### Frontend Tests (3 test files, 17 tests)

```bash
cd client
npm test           # runs Vitest for API client, idempotency key, and currency utils
```

**Total automated test coverage**: 16 test files, 178 tests, 100% passing.

---

## Demo Walkthrough

Visual evidence and UI screenshots for each acceptance test scenario are organized in the [docs/screenshots/](docs/screenshots/) folder.

To perform the manual end-to-end evaluation, start both servers (`npm run dev` in `server` and `npm run dev` in `client`), navigate to `http://localhost:5173`, and follow the steps below:

### 1. Acceptance Test 1: Teacher Class Scoping & Attendance
- **Seed Account**: `teacher1@school.demo` / `Teacher@123` (Rajan Kumar)
- **Goal**: Verify teacher access is strictly scoped to assigned sections, and attendance is recorded cleanly.
- **Steps**:
  1. Log in as Teacher 1.
  2. Navigate to **My Sections** (`/teacher/sections`). Confirm that only **Grade 9 Section A** appears (assigned for Mathematics and Science). Section 10-A and 10-B are completely excluded.
  3. Navigate to **Attendance** (`/teacher/attendance`). The section dropdown lists only Section 9-A.
  4. Select session **MORNING** and today's date (defaults to current date in school timezone `Asia/Kolkata`).
  5. The student roster displays **Rahul Singh** (`9A01`), **Anjali Singh** (`9A02`), and **Ravi Patel** (`9A03`).
  6. Click **Mark All Present** (or toggle individual status pills) and click **Submit Attendance**.
  7. A green confirmation banner confirms records saved with created count.

### 2. Acceptance Test 2: Duplicate Attendance Rejection & Safe Upsert
- **Seed Account**: `teacher1@school.demo` / `Teacher@123`
- **Goal**: Confirm that re-submitting attendance for the same student/date/session does not create duplicate rows, safely updates status, and logs changes.
- **Steps**:
  1. On the **Attendance** page (`/teacher/attendance`), choose Grade 9-A, session MORNING, and the same date used in Test 1.
  2. The page detects existing records and pre-populates existing statuses with a notice informing you that changes will update the records.
  3. Change Rahul Singh's status from **PRESENT** to **LATE** and click **Submit Attendance**.
  4. The success banner displays: `Attendance updated: 0 created, 3 updated`.
  5. Log out and log in as Admin (`admin@school.demo` / `Admin@123`). Navigate to **Audit Logs** (`/admin/audit-logs`).
  6. Inspect the latest `ATTENDANCE_UPDATED` entry: the metadata reflects `previousStatus: "PRESENT"` and `newStatus: "LATE"`, verifying zero duplicate database rows and full audit traceability.

### 3. Acceptance Test 3: Dynamic Grade Calculation from Configured Rules
- **Seed Account**: `admin@school.demo` / `Admin@123` & `guardian1@school.demo` / `Guardian@123`
- **Goal**: Verify that report card grades are computed dynamically from `GradeRule` rather than statically stored, and modifying grade boundaries updates grades immediately.
- **Steps**:
  1. Log in as Guardian 1 (`guardian1@school.demo` / `Guardian@123`).
  2. Click **Overview** for child **Rahul Singh** (`9A01`). For `Mid-Term Mathematics` (Score: 85/100, 85.00%), his current grade is **A** (rule: 80% to 89.99%).
  3. Log out and log in as Admin (`admin@school.demo` / `Admin@123`).
  4. Navigate to **Exams & Grading** (`/admin/exams`) and scroll to **Grade Rules Scale**.
  5. Edit the Grade `A` rule to increase the minimum threshold from `80` to `86`, and adjust `B+` maximum from `79.99` to `85.99`. Save the changes.
  6. Log back in as Guardian 1 and view Rahul Singh's report card. His letter grade for 85% dynamically changes to **B+** without any marks table modification.
  7. *(Optional cleanup)*: Revert Grade `A` minPercent back to `80` and `B+` maxPercent to `79.99`.

### 4. Acceptance Test 4: Guardian Child Scoping & Privacy Preservation
- **Seed Account**: `guardian1@school.demo` / `Guardian@123` (Amit Singh)
- **Goal**: Confirm guardians only see their linked children, and attempting to view unlinked students returns privacy-preserving 404s.
- **Steps**:
  1. Log in as Guardian 1.
  2. Navigate to **My Children** (`/guardian/children`). Confirm only linked children **Rahul Singh** and **Anjali Singh** are displayed. Children of other guardians (e.g., Priya Verma, Karan Verma) are not shown.
  3. Click **Overview** for Rahul Singh. View his attendance summary, report card, and fee invoices.
  4. In the browser address bar, modify the URL student ID to an unlinked student ID (e.g. Priya Verma's ID) or trigger an API request to `/api/guardian/students/<other-id>/overview`.
  5. The application renders a clear "Student not found or not linked to your account" error (`404 NOT_FOUND`). The system deliberately returns 404 rather than 403 to prevent student ID enumeration.

### 5. Acceptance Test 5: Fee Due + Paid = Ledger Balance
- **Seed Account**: `guardian1@school.demo` / `Guardian@123` & `admin@school.demo` / `Admin@123`
- **Goal**: Confirm dynamic double-entry ledger calculation, partial payments, idempotency replay, and overpayment prevention.
- **Steps**:
  1. Log in as Guardian 1 and go to child Anjali Singh's fees page (`/guardian/fees`).
  2. Observe her Tuition Fee invoice: Invoiced `₹5,000.00` (`500000` paise), Status: `UNPAID`, Balance: `₹5,000.00`.
  3. Under the simulated payment form ("Simulated payment, no real money"), enter `2500` (₹2,500.00) and click **Pay via Simulated Gateway**.
  4. The invoice status transitions to `PARTIALLY_PAID` with Remaining Balance `₹2,500.00`. The ledger below shows the original `DEBIT` of ₹5,000.00 and a new `CREDIT` of ₹2,500.00.
  5. Attempt to pay `3000` (exceeding the ₹2,500 balance). An inline validation error clearly prevents overpayment: `Payment amount cannot exceed the remaining balance`.
  6. Enter the exact remaining `2500` and submit. The invoice status updates to `PAID` with Remaining Balance `₹0.00`.
  7. Log in as Admin (`admin@school.demo` / `Admin@123`) &rarr; **Fee Invoices** (`/admin/fees`). View Anjali Singh's invoice detail ledger. Total Invoiced (₹5,000) minus Total Paid (₹5,000) = ₹0.00 balance, exactly matching the sum of ledger DEBIT and CREDIT entries.

---

## Known Limitations / Assumptions

- **Upsert on duplicate attendance:** Attendance records have a unique constraint on `(student_id, date, session)`. When an attendance record is submitted for an existing slot, the system updates the status (upsert) and records an immutable audit log entry capturing both previous and new statuses for complete traceability.
- **Attendance rate formula:** Attendance percentage is computed as `((PRESENT + LATE) / totalSessions) * 100`, rounded to two decimal places. Days or sessions without attendance taken are excluded from the denominator.
- **Teacher ownership by section:** Teachers have granular role-based access restricted strictly to their assigned class sections via `ClassSubject`. Teachers can only record attendance, enter grades, and view reports for sections they teach (attempting access to unassigned sections returns `403 FORBIDDEN`). Teachers are completely blocked from all fee and financial routes (`403 FORBIDDEN`).
- **404 for unlinked students (Privacy Preservation):** When a guardian attempts to access a student profile, attendance summary, report card, or fee invoice that is not linked to them in `GuardianStudent`, the API responds with `404 NOT_FOUND` rather than `403 FORBIDDEN`. This prevents attackers or unauthorized guardians from enumerating valid student IDs or confirming student enrollment.
- **SQLite concurrency note:** SQLite operates with file-level write locking. All multi-step operations (invoice creation, bulk invoicing, idempotent payment processing, voiding) execute inside Prisma interactive `$transaction` blocks. Under intense concurrent writes, lock conflicts (`SQLITE_BUSY`, `SQLITE_LOCKED`, `P2034`) are intercepted by the centralized error handler and mapped to a clean `503 SERVICE_UNAVAILABLE` rather than unhandled 500 errors. For production horizontal scaling, PostgreSQL or MySQL should replace SQLite.
- **Simulated payments only:** Payment processing is simulated without external banking or payment gateway integration. Balances are never statically stored on invoices; they are computed dynamically from `FeeLedgerEntry` (`SUM(DEBIT) - SUM(CREDIT)`). Every payment requires a unique `Idempotency-Key` header to protect against network replays and double charges.

---

## Technical Report

See [docs/technical-report.md](docs/technical-report.md) (Phase 10).
