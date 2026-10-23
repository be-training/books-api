# Implementation Plan: Books API (Library Admin)

## 1. Goal and Scope

- **Goal**: Implement the Books API backend for the Library Admin screens strictly following `docs/api-contract.md` and the UI specification.
- **Scope (In-Scope)**:
  - `GET /books`: Search by keyword, filter by tag & status, pagination math.
  - `GET /books/:id`: Detailed view matching Book Information and Stock cards (`totalCopies`, `onLoan`, `available`, `publisher`, `edition`, `description`, `addedOn`).
  - `GET /books/:id/loans`: Loan history matching the UI table (`MEMBER`, `BORROWED`, `DUE`, `RETURNED`, `STATUS`).
  - `POST /books`: Create new book with strict JSON Schema validation.
  - `PATCH /books/:id`: Edit existing book attributes.
  - `DELETE /books/:id`: Delete book, rejecting with HTTP `409 Conflict` when active/overdue loans exist.
  - Standardized error format `{ error: { code, message, details?, requestId } }`.
- **Out-of-Scope**:
  - Member management CRUD APIs (handled by separate module).
  - Loan checkout/check-in transaction endpoints (only reading loan history for books is in scope).
  - Excel/CSV bulk import/export.
  - Authentication / Authorization / JWT (unless specified later).

---

## 2. Architecture and Naming Conventions

### Naming Rules
- **TypeScript code**: `camelCase` for variables and functions (functions start with a verb, e.g. `deleteBook`, `countActiveLoans`).
- **Booleans**: `is` / `has` / `can` + adjective (`isAvailable`, `hasMore`, `canDelete`).
- **Classes/Types**: `PascalCase` nouns (`BookService`, `BookListQuery`).
- **Constants**: `UPPER_SNAKE_CASE` (`MAX_PAGE_SIZE`, `DEFAULT_PAGE`).
- **Files/Folders**: `kebab-case` with role suffix (`book.routes.ts`, `book.service.ts`, `book.repository.ts`, `book.schema.ts`, `book.service.test.ts`).
- **Database Tables**: Plural `snake_case` (`books`, `book_loans`).
- **Database Columns**: `snake_case`, foreign keys `<table>_id` (`book_id`, `created_at`, `borrowed_date`, `due_date`, `returned_date`).
- **Database Indexes**: `idx_<table>_<column>` (`idx_books_title`, `idx_book_loans_book_id`, `idx_book_loans_status`).
- **JSON Fields**: `camelCase` (`totalCopies`, `onLoan`, `available`, `borrowedDate`, `dueDate`, `returnedDate`, `addedOn`).

### Directory Layout
```
src/
├── app.ts                         # Fastify app instance, plugin registrations, error handler
├── server.ts                      # Server startup & graceful shutdown
├── config/
│   └── env.ts                     # Environment validation
├── plugins/
│   ├── database.plugin.ts         # Fastify MySQL plugin with fastify.decorate('db') & onClose hook
│   ├── request-id.plugin.ts       # Request ID generation & logging plugin
│   └── error-handler.plugin.ts    # Central Fastify error handler mapping contract format
├── common/
│   └── errors/
│       └── app-error.ts           # AppError, NotFoundError, ConflictError
└── modules/
    └── books/
        ├── book.types.ts          # TypeScript interfaces & DTOs matching UI
        ├── book.schema.ts         # Fastify JSON Schema (params, querystring, body, response)
        ├── book.repository.ts     # SQL queries with ? placeholders (using fastify.db)
        ├── book.service.ts        # Business logic & calculations (available = totalCopies - onLoan)
        ├── book.controller.ts     # HTTP controller
        ├── book.routes.ts         # Fastify route plugin
        └── book.service.test.ts   # Vitest unit tests (AAA pattern, repository mocked)
```

---

## 3. Database Schema & Migration Plan (Aligned with UI)

### Table `books`
Matches Book Information card and Stock card:
```sql
CREATE TABLE IF NOT EXISTS books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(50) NOT NULL UNIQUE,
  published_year INT NOT NULL,
  publisher VARCHAR(255) NULL,
  edition VARCHAR(255) NULL,
  description TEXT NULL,
  total_copies INT NOT NULL DEFAULT 1,
  tags JSON NULL,
  status ENUM('AVAILABLE', 'OUT_OF_STOCK', 'ARCHIVED') NOT NULL DEFAULT 'AVAILABLE',
  added_on DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_books_title (title),
  INDEX idx_books_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Table `book_loans`
Matches Loan history table (MEMBER, BORROWED, DUE, RETURNED, STATUS):
```sql
CREATE TABLE IF NOT EXISTS book_loans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  member_id INT NOT NULL,
  member_name VARCHAR(255) NOT NULL,
  borrowed_date DATE NOT NULL,
  due_date DATE NOT NULL,
  returned_date DATE NULL,
  status ENUM('ACTIVE', 'OVERDUE', 'RETURNED') NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_book_loans_book_id (book_id),
  INDEX idx_book_loans_status (status),
  CONSTRAINT fk_book_loans_book FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Small, Ordered Implementation Tasks

### Step 1: Project Preparation Baseline
- [x] Initialize `package.json`, `tsconfig.json` (strict), `.gitignore`, `.env.example`, `.env`, and `docker-compose.yml`.
- [x] Install Fastify, mysql2, dotenv, vitest, supertest, tsx, typescript.
- [x] Setup minimal `src/app.ts` with healthcheck endpoint.
- **Verification**: `npm run build` succeeds, `npm test` runs vitest.
- **Commit**: `chore(project): initialize fastify typescript project and tools`

### Step 2: Database Infrastructure & Migration Runner
- [x] Implement `src/plugins/database.plugin.ts` using `fastify-plugin` to register `fastify.decorate('db', pool)` with automatic cleanup on `onClose` hook.
- [x] Create database migration / init script `scripts/init-db.sql` and run script `npm run db:init` (populating initial seed data like "The Pragmatic Programmer" and loans shown in the UI).
- **Verification**: MySQL container running, migration script executes cleanly, tables and indexes verified, plugin unit test with lifecycle onClose passes.
- **Commit**: `feat(db): add fastify database plugin and migration scripts`

### Step 3: Shared Infrastructure (Error Handler & Request ID)
- [x] Implement `src/common/errors/app-error.ts` (`AppError`, `NotFoundError`, `ConflictError`, `ValidationError`).
- [x] Implement `src/plugins/error-handler.plugin.ts` mapping Fastify errors and AppErrors to `{ error: { code, message, details?, requestId } }`.
- [x] Implement `src/plugins/request-id.plugin.ts` ensuring `x-request-id` response header and structured logging via `request.log`.
- **Verification**: Unit tests in `tests/error-handler.test.ts` pass 100%.
- **Commit**: `feat(core): implement shared error handler and request id plugin`

### Step 4: Book Repository Layer (`book.repository.ts`)
- [ ] Implement `src/modules/books/book.repository.ts` with parameterized SQL (`?`):
  - `findAll(query, offset, limit)`: returns books and total count with default sorting `ORDER BY id DESC`.
  - `findById(id)`: returns book row by ID.
  - `findByIsbn(isbn)`: returns book row by ISBN (for unique check).
  - `countActiveLoans(bookId)`: returns number of active/overdue loans (`status IN ('ACTIVE', 'OVERDUE')` or `returned_date IS NULL`).
  - `findLoansByBookId(bookId)`: returns loan history.
  - `create(bookData)`: inserts new book.
  - `update(id, bookData)`: updates book row.
  - `delete(id)`: deletes book row.
- **Verification**: Vitest repository tests.
- **Commit**: `feat(books): implement book repository with parameterized sql`

### Step 5: Book Service Layer & Business Logic Unit Tests
- [ ] Implement `src/modules/books/book.service.ts`:
  - Calculate `available = totalCopies - onLoan`.
  - Calculate pagination meta (`total`, `page`, `limit`).
  - `getBookLoans(id)`: verify book exists first; throw `NotFoundError` (`404 BOOK_NOT_FOUND`) if not found.
  - `createBook(data)`: check duplicate ISBN; throw `ConflictError` (`409 ISBN_ALREADY_EXISTS`).
  - `updateBook(id, data)`: verify book exists, check duplicate ISBN, and if updating `totalCopies`, ensure `totalCopies >= onLoan`, otherwise throw `ConflictError` (`409 COPIES_LESS_THAN_ACTIVE_LOANS`).
  - `deleteBook(id)`: verify book exists, check active loans and throw `ConflictError` (`409 BOOK_HAS_ACTIVE_LOANS`) if `onLoan > 0`.
- [ ] Write unit tests `src/modules/books/book.service.test.ts` covering all standard and edge cases using AAA pattern, mocking repository with `vi.fn()`.
- **Verification**: `npx vitest run src/modules/books/book.service.test.ts` passes 100%.
- **Commit**: `test(books): add unit tests and implement book service logic`

### Step 6: Book Schemas & Controller (`book.schema.ts`, `book.controller.ts`)
- [ ] Implement `src/modules/books/book.schema.ts`: JSON Schema for input validation (params, querystring, body) and response serialization (200, 201, 204, 400, 404, 409).
- [ ] Implement `src/modules/books/book.controller.ts`: wire HTTP handlers to service methods.
- **Verification**: Fastify rejects malformed payloads with 400 validation error.
- **Commit**: `feat(books): implement fastify schemas and controller handlers`

### Step 7: Route Registration & End-to-End Integration Tests
- [ ] Implement `src/modules/books/book.routes.ts` and register in `src/app.ts`.
- [ ] Write integration tests in `tests/books.integration.test.ts` covering all 6 endpoints:
  - `GET /books`: search, tag filter, status filter, default `id DESC` order, pagination.
  - `GET /books/:id`: 200 with inventory calculation, 404 when not found.
  - `GET /books/:id/loans`: 200 with loan history, 404 when book does not exist.
  - `POST /books`: 201 created, 400 invalid schema, 409 duplicate ISBN.
  - `PATCH /books/:id`: 200 updated, 404 not found, 409 copies < active loans, 409 duplicate ISBN.
  - `DELETE /books/:id`: 204 deleted, 404 not found, 409 active loans exist.
- **Verification**: All integration tests pass: `npm test`.
- **Commit**: `feat(books): register book routes and add api integration tests`

---

## 5. Risks and Mitigations

| Risk | Mitigation |
| :--- | :--- |
| **Race condition when deleting book while loan is created** | Wrap active loan count and book deletion in a single database transaction with row locks if necessary. |
| **SQL Injection via search or filters** | Enforce parameterized queries (`?`) for all dynamic values; never concatenate strings into SQL. |
| **Response schema filtering out fields** | Fastify response schemas strip unlisted fields; ensure every UI field (`publisher`, `edition`, `addedOn`, `borrowedDate`, `dueDate`, `returnedDate`, etc.) is explicitly defined in `book.schema.ts`. |
| **Database container unavailable during CI/tests** | Unit tests mock repository completely (`vi.fn()`); integration tests use test database with healthcheck. |
