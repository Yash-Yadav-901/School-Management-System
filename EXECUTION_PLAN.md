# School Management System — Execution Plan

> Algions AI Labs | Full-Stack Web Development Internship Assessment  
> Project: School Management System  
> Last Updated: 2026-11-10

---

## 1. Tech Stack

### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | **React 18** (Vite) | Fast dev server, component-based, industry standard |
| Routing | **React Router v6** | Client-side routing with protected route support |
| State Management | **React Context + useReducer** | Sufficient for this scale; avoids Redux overhead |
| UI Components | **Tailwind CSS + shadcn/ui** | Utility-first CSS; accessible, pre-built components |
| Data Fetching | **TanStack Query (React Query)** | Caching, loading/error states, refetch on focus |
| Forms | **React Hook Form + Zod** | Validation on client side, matches server schemas |
| Charts/Reports | **Recharts** | Simple, responsive charts for dashboards |
| HTTP Client | **Axios** | Interceptors for JWT token injection |

### Backend
| Layer | Technology | Reason |
|---|---|---|
| Runtime | **Node.js 20** | JavaScript full-stack consistency |
| Framework | **Express.js** | Minimal, flexible, well-known |
| Auth | **JWT (jsonwebtoken) + bcrypt** | Stateless auth; bcrypt for password hashing |
| Validation | **Zod** | Shared schema definitions; server-side validation |
| ORM | **Drizzle ORM** | Lightweight, type-safe, works great with SQLite |
| Logging | **Morgan + Winston** | HTTP request logs + structured app logs (audit trail) |
| API Docs | **Swagger UI (swagger-jsdoc)** | Auto-generated OpenAPI docs from JSDoc comments |
| Testing | **Vitest + Supertest** | Unit & integration/API tests |

### Database
| Layer | Technology | Reason |
|---|---|---|
| Local DB | **SQLite** (via better-sqlite3) | Zero-config, file-based, perfect for local dev |
| Migrations | **Drizzle Kit** | Schema migrations as code; reproducible |
| Seed | Custom seed script | Realistic demo data for all roles |

### Project Structure
```
School Management System/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── components/        # Shared UI components
│   │   ├── pages/             # Page-level components (by role)
│   │   │   ├── admin/
│   │   │   ├── teacher/
│   │   │   └── guardian/
│   │   ├── hooks/             # Custom React hooks
│   │   ├── context/           # Auth context, global state
│   │   ├── services/          # Axios API calls
│   │   ├── lib/               # Zod schemas, utilities
│   │   └── App.jsx
│   └── package.json
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # Express routers (one per module)
│   │   │   ├── auth.js
│   │   │   ├── students.js
│   │   │   ├── teachers.js
│   │   │   ├── classes.js
│   │   │   ├── attendance.js
│   │   │   ├── exams.js
│   │   │   ├── fees.js
│   │   │   └── reports.js
│   │   ├── middleware/        # Auth, RBAC, error handler
│   │   ├── db/                # Drizzle schema, migrations, seed
│   │   │   ├── schema.js
│   │   │   ├── migrations/
│   │   │   └── seed.js
│   │   ├── services/          # Business logic layer
│   │   ├── validators/        # Zod validation schemas
│   │   └── app.js
│   └── package.json
│
├── docs/                      # ER diagram, API docs
├── tests/                     # Integration tests
├── .env.example
├── EXECUTION_PLAN.md          # This file
└── README.md
```

---

## 2. Database Schema (Tables Overview)

```
users            → id, name, email, password_hash, role (admin|teacher|guardian)
students         → id, user_id(nullable), name, dob, gender, guardian_id, class_id
guardians        → id, user_id, name, phone, email, relationship
teachers         → id, user_id, name, phone, email
classes          → id, name, section, grade_level
subjects         → id, name, code
class_subjects   → id, class_id, subject_id, teacher_id
attendance       → id, student_id, date, session, status, recorded_by | UNIQUE(student_id, date, session)
exams            → id, name, class_id, subject_id, max_marks, exam_date
exam_results     → id, exam_id, student_id, marks_obtained, grade, calculated_at
grading_rules    → id, min_marks, max_marks, grade, grade_point
fee_types        → id, name, amount, frequency
fee_invoices     → id, student_id, fee_type_id, amount_due, due_date, status
fee_payments     → id, invoice_id, amount_paid, paid_at, payment_method, reference
audit_logs       → id, user_id, action, entity_type, entity_id, old_value, new_value, created_at
```

**Key Constraints:**
- `UNIQUE(student_id, date, session)` on attendance → prevents duplicate entries
- `CHECK(marks_obtained <= max_marks)` on exam_results
- Foreign keys enforced (SQLite: `PRAGMA foreign_keys = ON`)
- Indexes on: `student_id`, `class_id`, `teacher_id`, `date` (attendance), `exam_id`

---

## 3. API Modules

### Auth
- `POST /api/auth/login` — returns JWT
- `POST /api/auth/logout`
- `GET  /api/auth/me` — current user profile

### Academic Admin (Admin only)
- CRUD `/api/students`
- CRUD `/api/teachers`
- CRUD `/api/classes`
- CRUD `/api/subjects`
- CRUD `/api/class-subjects` (assign teacher to class+subject)
- CRUD `/api/guardians`

### Attendance
- `POST /api/attendance` — record (Teacher/Admin); upsert safe
- `GET  /api/attendance?classId=&date=&session=` — list
- `GET  /api/attendance/summary/student/:id` — per-student summary
- `GET  /api/attendance/summary/class/:id` — class summary

### Exams & Results
- CRUD `/api/exams`
- `POST /api/exam-results` — bulk mark entry
- `GET  /api/exam-results/:examId` — results list
- `GET  /api/report-card/:studentId` — full report card

### Fees
- CRUD `/api/fee-types`
- CRUD `/api/fee-invoices`
- `POST /api/fee-payments` — record payment (simulated)
- `GET  /api/fee-invoices/student/:id` — student fee ledger

### Reports
- `GET  /api/reports/attendance` — filterable attendance report
- `GET  /api/reports/academic` — class/exam performance
- `GET  /api/reports/fees` — fee collection report

### Audit
- `GET  /api/audit-logs` — Admin only

---

## 4. Role-Based Access Matrix

| Action | Admin | Teacher | Guardian |
|---|:---:|:---:|:---:|
| Manage students/teachers/classes | ✅ | ❌ | ❌ |
| View all classes | ✅ | ❌ | ❌ |
| View assigned classes | ✅ | ✅ | ❌ |
| Record attendance | ✅ | ✅ (own classes) | ❌ |
| Enter exam marks | ✅ | ✅ (own subjects) | ❌ |
| View all results | ✅ | ✅ (own subjects) | ❌ |
| View own child's results | — | — | ✅ |
| Manage fee invoices | ✅ | ❌ | ❌ |
| View own child's fees | — | — | ✅ |
| View all reports | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ❌ | ❌ |

---

## 5. Execution Timeline (15-Day Plan)

### Day 1 — Planning & Repo Setup
- [x] Read and understand the brief
- [x] Create execution plan (this document)
- [ ] Initialize Git repo structure (client + server)
- [ ] Set up .env.example, .gitignore, README skeleton

### Days 2–4 — Architecture & Scaffolding
- [ ] Design and finalize DB schema (Drizzle)
- [ ] Run initial migration, create seed script
- [ ] Scaffold Express server with middleware (auth, RBAC, error handler)
- [ ] Scaffold React app with Vite, Tailwind, React Router
- [ ] Set up protected routes and auth context
- [ ] Design ER diagram

### Days 5–8 — Core Feature Implementation
- [ ] Auth: login, JWT, role-based redirect
- [ ] Admin panel: Students, Teachers, Classes, Subjects CRUD
- [ ] Teacher panel: Assigned classes view
- [ ] Attendance module: recording, duplicate prevention (upsert)
- [ ] Exams & Results: create exam, bulk mark entry, grade calculation
- [ ] Fee module: invoices, simulated payment, ledger
- [ ] Guardian panel: child info, attendance, results, fees

### Days 9–11 — Security, Validation & Edge Cases
- [ ] Server-side RBAC middleware for every route
- [ ] Zod validation on all API inputs
- [ ] Duplicate attendance rejection test
- [ ] Fee reconciliation logic
- [ ] Audit trail logging for material actions
- [ ] Search, filter, pagination on all list APIs
- [ ] Report card generation logic

### Days 12–13 — Testing
- [ ] Unit tests: grade calculation, fee balance calculation
- [ ] Integration/API tests: auth flow, attendance duplicate rejection
- [ ] Negative case tests: teacher accessing wrong class, guardian accessing other student
- [ ] Responsive UI testing
- [ ] Fix all defects

### Day 14 — Documentation & Demo
- [ ] Complete README (setup, env vars, demo credentials, test commands)
- [ ] Finalize ER diagram (export PNG/SVG)
- [ ] Swagger/OpenAPI docs live at `/api/docs`
- [ ] Technical report (Markdown)
- [ ] Record 3–5 min demo video

### Day 15 — Final Checks & Submission
- [ ] Full regression run
- [ ] Verify all links and reviewer access
- [ ] Submit form

---

## 6. Demo Credentials (Planned — Seed Data)

| Role | Email | Password |
|---|---|---|
| Admin | admin@school.demo | Admin@123 |
| Teacher | teacher1@school.demo | Teacher@123 |
| Guardian | guardian1@school.demo | Guardian@123 |

---

## 7. Key Design Decisions

1. **SQLite for local dev** — Zero setup, file-based. Can be swapped to PostgreSQL via Drizzle config for production.
2. **Drizzle ORM** — Type-safe, schema-as-code, lightweight migrations. Avoids heavy ORMs like Prisma.
3. **Zod for dual validation** — Same schema used in both backend (validation) and frontend (form validation), ensuring consistency.
4. **JWT (stateless auth)** — No session store needed; role embedded in token payload.
5. **Upsert for attendance** — `INSERT OR REPLACE` with unique constraint prevents duplicates while allowing correction.
6. **Simulated payments** — No real payment gateway; payment is recorded as "SIMULATED" method in the ledger.
7. **Audit log table** — Every create/update/delete on critical entities (attendance, results, payments) logs old + new values.
8. **Monorepo structure** — Client and server in same repo for simpler submission; independent `package.json` for each.

---

## 8. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SQLite concurrent writes | Use WAL mode; acceptable for single-user local demo |
| JWT expiry UX | Implement token refresh or clear warning before expiry |
| Large seed data | Keep to ~3 classes, ~30 students, ~5 teachers for demo |
| Report card complexity | Pre-compute grades server-side; cache per exam |

---

## 9. What Will NOT Be Built (Known Scope Cuts)
- Real payment gateway integration (simulated only — by design per brief)
- Email/SMS notifications
- Multi-school/tenant support
- Mobile native app
- File upload (profile photos, documents)

---

*This document is a living plan. Update checkboxes as tasks complete.*

