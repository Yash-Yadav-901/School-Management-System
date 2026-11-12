# School Management System – Entity-Relationship (ER) Diagram

This diagram represents the relational database schema defined in `server/prisma/schema.prisma` (SQLite engine).

```mermaid
erDiagram
    User ||--o| Teacher : "has profile"
    User ||--o| Guardian : "has profile"
    User ||--o{ Attendance : "records"
    User ||--o{ AuditLog : "triggers"

    Class ||--o{ Section : "contains"
    Section ||--o{ Student : "enrolls"
    Section ||--o{ ClassSubject : "assigns"
    Section ||--o{ Exam : "schedules"

    Teacher ||--o{ ClassSubject : "assigned to"
    Subject ||--o{ ClassSubject : "assigned in"
    Subject ||--o{ Exam : "tested in"

    Student ||--o{ GuardianStudent : "linked via"
    Guardian ||--o{ GuardianStudent : "links to"

    Student ||--o{ Attendance : "has"
    Student ||--o{ ExamResult : "receives"
    Student ||--o{ FeeInvoice : "billed"
    Student ||--o{ FeeLedgerEntry : "ledger"

    Exam ||--o{ ExamResult : "contains"

    FeeType ||--o{ FeeInvoice : "categorizes"
    FeeInvoice ||--o{ FeePayment : "settled by"
    FeeInvoice ||--o{ FeeLedgerEntry : "generates debit"
    FeePayment ||--o{ FeeLedgerEntry : "generates credit"

    User {
        int id PK
        string email UK
        string password_hash
        string role "ADMIN | TEACHER | GUARDIAN"
        datetime created_at
        datetime updated_at
    }

    Teacher {
        int id PK
        int user_id FK,UK
        string name
        string phone
        datetime created_at
        datetime updated_at
    }

    Guardian {
        int id PK
        int user_id FK,UK
        string name
        string phone
        datetime created_at
        datetime updated_at
    }

    Class {
        int id PK
        string name UK
        datetime created_at
    }

    Section {
        int id PK
        string name
        int class_id FK
        datetime created_at
    }

    Subject {
        int id PK
        string name
        string code UK
        datetime created_at
    }

    ClassSubject {
        int id PK
        int section_id FK
        int subject_id FK
        int teacher_id FK
    }

    Student {
        int id PK
        string name
        string dob
        string gender
        string roll_number
        int section_id FK
        datetime created_at
        datetime updated_at
    }

    GuardianStudent {
        int id PK
        int guardian_id FK
        int student_id FK
        string relationship
        datetime created_at
    }

    Attendance {
        int id PK
        int student_id FK
        string date "YYYY-MM-DD"
        string session "MORNING | AFTERNOON"
        string status "PRESENT | ABSENT | LATE"
        int recorded_by_id FK
        datetime created_at
        datetime updated_at
    }

    GradeRule {
        int id PK
        float min_percent
        float max_percent
        string grade
        float grade_point
    }

    Exam {
        int id PK
        string name
        int section_id FK
        int subject_id FK
        int max_marks
        string exam_date "YYYY-MM-DD"
        datetime created_at
    }

    ExamResult {
        int id PK
        int exam_id FK
        int student_id FK
        int marks_obtained
        datetime calculated_at
    }

    FeeType {
        int id PK
        string name UK
        int default_amount
    }

    FeeInvoice {
        int id PK
        int student_id FK
        int fee_type_id FK
        int amount_due "paise"
        string due_date "YYYY-MM-DD"
        string status "UNPAID | PARTIAL | PAID | VOID"
        datetime created_at
        datetime updated_at
    }

    FeePayment {
        int id PK
        int invoice_id FK
        int amount_paid "paise"
        string idempotency_key UK
        datetime paid_at
    }

    FeeLedgerEntry {
        int id PK
        int student_id FK
        int invoice_id FK
        int payment_id FK
        string entry_type "DEBIT | CREDIT"
        int amount "paise"
        string description
        datetime created_at
    }

    AuditLog {
        int id PK
        int user_id FK
        string action
        string entity_type
        int entity_id
        string meta "JSON"
        datetime created_at
    }
```
