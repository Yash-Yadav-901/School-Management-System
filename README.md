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
| `JWT_EXPIRES_IN` | No | Token lifetime, default `7d` |
| `PORT` | No | HTTP port, default `4000` |
| `BCRYPT_ROUNDS` | No | bcrypt cost factor, default `10` |
| `CORS_ORIGIN` | No | Allowed origin, default `http://localhost:5173` |
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

- **Payment is simulated.** No real payment gateway. Payment method is recorded as `SIMULATED`.
- **Attendance can be corrected.** A duplicate `(studentId, date, session)` submission updates the existing record (upsert). The original entry is preserved in the audit log.
- **SQLite is for local development only.** The schema and Prisma configuration support swapping to PostgreSQL by changing `provider` and `DATABASE_URL`.
- **No file uploads.** Profile photos and document attachments are out of scope.
- **No email/SMS notifications.** Out of scope.

---

## Technical Report

See [docs/technical-report.md](docs/technical-report.md) (Phase 10).
