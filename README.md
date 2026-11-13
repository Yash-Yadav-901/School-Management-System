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
cd server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set JWT_SECRET to a random string of 32+ characters
```

### 3. Run migrations and seed

```bash
npm run db:migrate   # creates dev.db and applies all migrations
npm run db:seed      # populates with synthetic demo data
```

### 4. Start the development server

```bash
npm run dev          # http://localhost:4000
```

---

## NPM Scripts

| Script | Action |
|---|---|
| `npm run dev` | Start server with file watcher |
| `npm start` | Start server (production) |
| `npm test` | Run all tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Reset and seed demo data |
| `npm run db:reset` | Drop all tables and re-migrate (destructive) |

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@school.demo | Admin@123 |
| Teacher 1 | teacher1@school.demo | Teacher@123 |
| Teacher 2 | teacher2@school.demo | Teacher@123 |
| Guardian 1 | guardian1@school.demo | Guardian@123 |
| Guardian 2 | guardian2@school.demo | Guardian@123 |

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

```bash
cd server
npm test           # single run, resets test.db before suite
npm run test:watch # interactive
```

The test suite uses a separate `test.db` database that is wiped and re-migrated automatically before each run.

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
