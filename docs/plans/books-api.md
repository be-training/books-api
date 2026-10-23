# Implementation Plan: Books API (Library Admin)

## 1. Goal and Scope

- **Goal**: Implement the Books API backend for the Library Admin screens strictly following `docs/api-contract.md`, the UI specification, and the official project plan.
- **Scope (In-Scope)**:
  - `GET /books`: Search by keyword, filter by tag & status, pagination math with default `ORDER BY id DESC`.
  - `GET /books/:id`: Detailed view matching Book Information and Stock cards (`totalCopies`, `onLoan`, `available`, `publisher`, `edition`, `description`, `addedOn`).
  - `GET /books/:id/loans`: Loan history matching the UI table (`MEMBER`, `BORROWED`, `DUE`, `RETURNED`, `STATUS`). Returns 404 if book does not exist.
  - `POST /books`: Create new book with strict JSON Schema validation. Rejects duplicate ISBN with 409 `ISBN_ALREADY_EXISTS`.
  - `PATCH /books/:id`: Edit existing book attributes. Rejects duplicate ISBN with 409 `ISBN_ALREADY_EXISTS` and rejects `totalCopies < onLoan` with 409 `COPIES_LESS_THAN_ACTIVE_LOANS`.
  - `DELETE /books/:id`: Delete book, rejecting with HTTP `409 Conflict` (`BOOK_HAS_ACTIVE_LOANS`) when active/overdue loans exist.
  - Standardized error format `{ error: { code, message, details?, requestId } }`.
- **Out-of-Scope**:
  - Member management CRUD APIs (handled by separate module).
  - Loan checkout/check-in transaction endpoints (only reading loan history for books is in scope).
  - Excel/CSV bulk import/export.
  - Authentication / Authorization / JWT (unless specified later).

---

## 2. Architecture and Naming Conventions

### Fastify Architecture Layout
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

## 3. Database Schema (Aligned with UI & Contract)

### Table `books`
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

## 4. Work Breakdown Structure (Official Project Plan)

| Task ID & Name | Description | Deliverable | Estimate (h) | Start Date | End Date | Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **BOOK API** | **Complete Library Admin Books API** | **Full Feature** | **24** | **10/23/2026** | **10/27/2026** | **In Progress** |
| **1 Phân tích & lập kế hoạch** | Khảo sát dự án và xác nhận phạm vi | Implementation plan | 2 | 10/23/2026 | 10/23/2026 | **Completed** |
| 1.1 Setup source code | Kiểm tra cấu trúc, DB, routing, validation và test | Xác định cấu trúc triển khai | 1 | 10/23/2026 | 10/23/2026 | **Completed** |
| 1.2 Phân tích API contract | Xác nhận 6 endpoint, request, response, error codes | Danh sách yêu cầu API | 0.5 | 10/23/2026 | 10/23/2026 | **Completed** |
| 1.3 Lập implementation plan | Chia task theo thứ tự phụ thuộc, xác định cách kiểm thử và tiêu chí hoàn thành | `docs/plans/books-api.md` | 0.5 | 10/23/2026 | 10/23/2026 | **Completed** |
| **2 Database** | Thiết kế và chuẩn bị schema | Database migration/schema | 1.5 | 10/23/2026 | 10/23/2026 | **Completed** |
| 2.1 Kiểm tra thiết kế dữ liệu | Xác định Book, Loan và quan hệ dựa trên tài liệu/schema hiện tại | Thiết kế dữ liệu | 0.5 | 10/23/2026 | 10/23/2026 | **Completed** |
| 2.2 Tạo migration/schema | Tạo hoặc cập nhật bảng, khóa và index cần thiết | Migration/schema | 1 | 10/23/2026 | 10/23/2026 | **Completed** |
| **3 Data Access Layer** | Xây dựng lớp truy cập dữ liệu | Repository | 2 | 10/23/2026 | 10/23/2026 | **Completed** |
| 3.1 Book Repository | Truy vấn, tạo, cập nhật và xóa Book | Book repository | 1 | 10/23/2026 | 10/23/2026 | **Completed** |
| 3.2 Loan queries | Truy vấn Loan và dữ liệu phục vụ thống kê | Loan queries/repository | 1 | 10/23/2026 | 10/23/2026 | **Completed** |
| **4 Books API** | Triển khai các endpoint theo contract | 6 API endpoints | 11 | 10/23/2026 | 10/26/2026 | **In Progress** |
| 4.1 GET /books | Tìm kiếm, lọc và phân trang (mặc định `ORDER BY id DESC`) | Danh sách Book | 2.5 | 10/23/2026 | 10/23/2026 | **In Progress** |
| 4.2 GET /books/:id | Trả chi tiết Book và số lượng bản sao (`totalCopies`, `onLoan`, `available`) | Chi tiết Book | 1.5 | 10/26/2026 | 10/26/2026 | **Pending** |
| 4.3 GET /books/:id/loans | Lấy danh sách Loan của Book (404 nếu không tồn tại) | Danh sách Loan | 1 | 10/26/2026 | 10/26/2026 | **Pending** |
| 4.4 POST /books | Tạo Book và validate input (409 nếu trùng ISBN) | API tạo Book | 1.5 | 10/26/2026 | 10/26/2026 | **Pending** |
| 4.5 PATCH /books/:id | Cập nhật Book và xử lý lỗi (409 nếu copies < active loans hoặc trùng ISBN) | API cập nhật Book | 1.5 | 10/26/2026 | 10/26/2026 | **Pending** |
| 4.6 DELETE /books/:id | Xóa Book, trả 409 nếu có bản sao đang được mượn | API xóa Book | 1.5 | 10/26/2026 | 10/26/2026 | **Pending** |
| 4.7 Hoàn thiện schema/error | Chuẩn hóa JSON Schema, response và error contract | Schema/error handling | 1.5 | 10/26/2026 | 10/26/2026 | **Completed** |
| **5 Testing** | Kiểm thử logic và HTTP API | Test suite | 6 | 10/27/2026 | 10/27/2026 | **Pending** |
| 5.1 Unit tests | Kiểm tra business logic và các trường hợp lỗi; mock repository khi phù hợp | Unit test suite | 4 | 10/27/2026 | 10/27/2026 | **Pending** |
| 5.2 Integration tests | Kiểm tra endpoint, status code, response và error contract | Integration test suite | 2 | 10/27/2026 | 10/27/2026 | **Pending** |
| **6 Review & bàn giao** | Kiểm tra chất lượng và chuẩn bị bàn giao | Kết quả review | 1.5 | 10/27/2026 | 10/27/2026 | **Pending** |
| 6.1 Self-review | Kiểm tra diff, TypeScript strict, SQL parameterization và xử lý lỗi | Code đã review | 0.75 | 10/27/2026 | 10/27/2026 | **Pending** |
| 6.2 Xác minh & bàn giao | Chạy test/lint và cập nhật hướng dẫn hoặc request collection nếu cần | Kết quả kiểm tra và tài liệu bàn giao | 0.75 | 10/27/2026 | 10/27/2026 | **Pending** |

---

## 5. Detailed Task Breakdown & Acceptance Criteria

### Phase 1: Phân tích & Lập kế hoạch (Completed)
- [x] **1.1 Setup source code**: Khởi tạo Fastify, strict TypeScript, mysql2, vitest, cấu hình `src/app.ts`, `src/server.ts`, `.gitignore`, `docker-compose.yml`.
- [x] **1.2 Phân tích API contract**: Hoàn thiện `docs/api-contract.md` bao gồm 6 endpoints, inventory calculations, error envelope `{ error: { code, message, details?, requestId } }`, và 4 edge cases.
- [x] **1.3 Lập implementation plan**: Xây dựng `docs/plans/books-api.md` theo bảng kế hoạch WBS chuẩn.

### Phase 2: Database (Completed)
- [x] **2.1 Kiểm tra thiết kế dữ liệu**: Thiết kế 2 bảng `books` và `book_loans` khớp 100% các trường trên giao diện UI Library Admin (`publisher`, `edition`, `description`, `added_on`, `borrowed_date`, `due_date`, `returned_date`, `status`).
- [x] **2.2 Tạo migration/schema**:
  - `scripts/migrations/001_create_books_table.sql`
  - `scripts/migrations/002_create_book_loans_table.sql`
  - `scripts/seeds/001_seed_books_and_loans.sql` (dữ liệu mẫu *The Pragmatic Programmer* và 5 lượt mượn)
  - `scripts/migrate.ts` (theo dõi phiên bản qua bảng `schema_migrations`)
  - `scripts/seed.ts` & `scripts/init-db.ts`
  - Plugin Fastify `src/plugins/database.plugin.ts` (`fastify.decorate('db', pool)`, hook `onClose`).

### Phase 3: Data Access Layer (Completed)
- [x] **3.1 Book Repository (`book.repository.ts`)**:
  - `findAll(filter, offset, limit)`: tìm kiếm theo title/author (`q`), lọc theo `tag`, lọc theo `status`, phân trang, sắp xếp mặc định `ORDER BY id DESC`.
  - `findById(id)`: lấy 1 dòng book.
  - `findByIsbn(isbn)`: kiểm tra trùng lặp ISBN.
  - `create(data)`: thêm mới sách (dùng SQL `?` placeholders).
  - `update(id, data)`: cập nhật sách.
  - `delete(id)`: xóa sách.
- [x] **3.2 Loan Queries**:
  - `countActiveLoans(bookId)`: đếm số bản copy đang mượn (`status IN ('ACTIVE', 'OVERDUE')` hoặc `returned_date IS NULL`).
  - `findLoansByBookId(bookId)`: lấy danh sách lịch sử mượn trả của sách.

### Phase 4: Books API (Endpoints)
- [x] **4.7 Hoàn thiện schema/error (Đã làm trước làm nền tảng)**:
  - `src/common/errors/app-error.ts` (`AppError`, `NotFoundError`, `ConflictError`, `ValidationError`).
  - `src/plugins/error-handler.plugin.ts` (`fastify.setErrorHandler`, `fastify.setNotFoundHandler`).
  - `src/plugins/request-id.plugin.ts` (`x-request-id` header).
- [ ] **4.1 GET /books**: Tìm kiếm, lọc tag/status, phân trang, default `ORDER BY id DESC`.
- [ ] **4.2 GET /books/:id**: Trả chi tiết book + `totalCopies`, `onLoan`, `available` (`totalCopies - onLoan`). 404 nếu không tìm thấy.
- [ ] **4.3 GET /books/:id/loans**: Trả danh sách lượt mượn; trả 404 `BOOK_NOT_FOUND` nếu sách không tồn tại.
- [ ] **4.4 POST /books**: Validate schema; trả 409 `ISBN_ALREADY_EXISTS` nếu trùng ISBN; trả 201 khi thành công.
- [ ] **4.5 PATCH /books/:id**: Cập nhật; trả 404 nếu không tìm thấy; trả 409 nếu trùng ISBN; trả 409 `COPIES_LESS_THAN_ACTIVE_LOANS` nếu `totalCopies < onLoan`.
- [ ] **4.6 DELETE /books/:id**: Trả 404 nếu không tìm thấy; trả 409 `BOOK_HAS_ACTIVE_LOANS` nếu `onLoan > 0`; trả 204 khi xóa thành công.

### Phase 5: Testing
- [ ] **5.1 Unit tests**: Viết `src/modules/books/book.service.test.ts` (AAA pattern, mock repository bằng `vi.fn()`, test toàn bộ business logic và các edge cases).
- [ ] **5.2 Integration tests**: Viết `tests/books.integration.test.ts` (kiểm tra toàn bộ 6 endpoint qua Fastify `app.inject()`).

### Phase 6: Review & Bàn giao
- [ ] **6.1 Self-review**: Kiểm tra diff, strict TypeScript (không có `any`), SQL parameterized (`?`), không còn `console.log`.
- [ ] **6.2 Xác minh & bàn giao**: Chạy `npm test`, `npm run build`, xuất kết quả kiểm tra.
