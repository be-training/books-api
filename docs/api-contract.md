# Library Admin - Books API Contract

This document defines the formal API contract between the Fastify backend and the React frontend (Library Admin screens), matching the UI specification.

---

## 1. General Conventions

- **Base URL**: `/api/v1` (or root `/books`)
- **Content-Type**: `application/json; charset=utf-8`
- **Date Format**: ISO Date string (`YYYY-MM-DD`) for business dates, and ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`) for timestamps.
- **Naming**:
  - Request and response JSON keys use `camelCase`.
  - URL paths use plural nouns with `kebab-case` (e.g. `/books/:id/loans`).

---

## 2. Standard Error Format

All error responses (4xx and 5xx) must follow this consistent envelope:

```json
{
  "error": {
    "code": "STRING_ERROR_CODE",
    "message": "Human-readable description of the error",
    "details": {},
    "requestId": "req-1a2b3c4d"
  }
}
```

### Common Error Codes
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Request query, params, or body failed validation schema |
| **404 Not Found** | `BOOK_NOT_FOUND` | Book with the specified ID does not exist |
| **409 Conflict** | `BOOK_HAS_ACTIVE_LOANS` | Cannot delete book while copies are currently on loan |
| **409 Conflict** | `ISBN_ALREADY_EXISTS` | A book with this ISBN already exists (on create or update) |
| **409 Conflict** | `COPIES_LESS_THAN_ACTIVE_LOANS` | Cannot reduce totalCopies below the number of currently active loans |
| **500 Internal Server Error** | `INTERNAL_SERVER_ERROR` | Unexpected server or database error |

---

## 3. Data Models (Aligned with Library Admin UI)

### 3.1. Book Item (List Representation)
```typescript
interface BookItem {
  id: number;
  title: string;              // e.g. "The Pragmatic Programmer"
  author: string;             // e.g. "David Thomas, Andrew Hunt"
  publishedYear: number;      // e.g. 2019
  isbn: string;               // e.g. "978-0-13-595705-9"
  publisher: string;          // e.g. "Addison-Wesley"
  edition: string;            // e.g. "20th Anniversary Edition"
  description: string;        // e.g. "[Short description of the book]"
  totalCopies: number;        // e.g. 5
  tags: string[];             // e.g. ["Programming", "Career"]
  status: "AVAILABLE" | "OUT_OF_STOCK" | "ARCHIVED"; // UI badge: "Available"
  addedOn: string;            // e.g. "2026-09-12"
  createdAt: string;
  updatedAt: string;
}
```

### 3.2. Book Detail (Detail Screen & Stock Calculation)
```typescript
interface BookDetail extends BookItem {
  onLoan: number;             // Count of active/overdue loans (e.g. 3)
  available: number;          // totalCopies - onLoan (e.g. 2)
}
```

### 3.3. Loan Item (Loan History Screen)
Matches columns: **MEMBER**, **BORROWED**, **DUE**, **RETURNED**, **STATUS**
```typescript
interface Loan {
  id: number;
  bookId: number;
  memberId: number;
  memberName: string;         // Column MEMBER, e.g. "Minh Tran"
  borrowedDate: string;       // Column BORROWED (YYYY-MM-DD), e.g. "2026-10-15"
  dueDate: string;            // Column DUE (YYYY-MM-DD), e.g. "2026-10-29"
  returnedDate: string | null;// Column RETURNED (YYYY-MM-DD or null for "—"), e.g. "2026-10-03"
  status: "ACTIVE" | "OVERDUE" | "RETURNED"; // Column STATUS: "Active", "Overdue", "Returned"
}
```

---

## 4. Endpoints Specification

### 4.1. `GET /books`
Search, filter, and paginate books for the Library Admin table.

- **Sorting**: Default sorting is `ORDER BY id DESC` (newest first) to ensure consistent table pagination.
- **Query Parameters**:
  - `q` *(optional, string)*: Case-insensitive search on `title` or `author`.
  - `tag` *(optional, string)*: Filter books containing this tag (e.g. `Programming`).
  - `status` *(optional, string)*: Filter by status (`AVAILABLE`, `OUT_OF_STOCK`, `ARCHIVED`).
  - `page` *(optional, integer, default: 1, min: 1)*: Current page number.
  - `limit` *(optional, integer, default: 10, min: 1, max: 100)*: Items per page.

- **Response `200 OK`**:
```json
{
  "data": [
    {
      "id": 1,
      "title": "The Pragmatic Programmer",
      "author": "David Thomas, Andrew Hunt",
      "publishedYear": 2019,
      "isbn": "978-0-13-595705-9",
      "publisher": "Addison-Wesley",
      "edition": "20th Anniversary Edition",
      "description": "[Short description of the book]",
      "totalCopies": 5,
      "tags": ["Programming", "Career"],
      "status": "AVAILABLE",
      "addedOn": "2026-09-12",
      "createdAt": "2026-09-12T08:00:00.000Z",
      "updatedAt": "2026-09-12T08:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### 4.2. `GET /books/:id`
Retrieve detailed information for a single book (matching Book Information & Stock cards).

- **URL Parameters**:
  - `id` *(required, integer)*: Book ID.

- **Response `200 OK`**:
```json
{
  "id": 1,
  "title": "The Pragmatic Programmer",
  "author": "David Thomas, Andrew Hunt",
  "publishedYear": 2019,
  "isbn": "978-0-13-595705-9",
  "publisher": "Addison-Wesley",
  "edition": "20th Anniversary Edition",
  "description": "[Short description of the book]",
  "addedOn": "2026-09-12",
  "totalCopies": 5,
  "onLoan": 3,
  "available": 2,
  "tags": ["Programming", "Career"],
  "status": "AVAILABLE",
  "createdAt": "2026-09-12T08:00:00.000Z",
  "updatedAt": "2026-09-12T08:00:00.000Z"
}
```

- **Response `404 Not Found`**:
```json
{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book with ID 999 does not exist",
    "requestId": "req-123"
  }
}
```

---

### 4.3. `GET /books/:id/loans`
Retrieve the loan history for a specific book (matching Loan History table).

- **URL Parameters**:
  - `id` *(required, integer)*: Book ID.

- **Business Constraint**:
  - If the book with the specified `id` does NOT exist, the endpoint **must return 404 BOOK_NOT_FOUND** (not an empty array `[]`).

- **Response `200 OK`**:
```json
{
  "data": [
    {
      "id": 1,
      "bookId": 1,
      "memberId": 101,
      "memberName": "Minh Tran",
      "borrowedDate": "2026-10-15",
      "dueDate": "2026-10-29",
      "returnedDate": null,
      "status": "ACTIVE"
    },
    {
      "id": 2,
      "bookId": 1,
      "memberId": 102,
      "memberName": "Lan Pham",
      "borrowedDate": "2026-10-02",
      "dueDate": "2026-10-16",
      "returnedDate": null,
      "status": "OVERDUE"
    },
    {
      "id": 3,
      "bookId": 1,
      "memberId": 103,
      "memberName": "Huy Nguyen",
      "borrowedDate": "2026-10-10",
      "dueDate": "2026-10-24",
      "returnedDate": null,
      "status": "ACTIVE"
    },
    {
      "id": 4,
      "bookId": 1,
      "memberId": 104,
      "memberName": "Thao Le",
      "borrowedDate": "2026-09-20",
      "dueDate": "2026-10-04",
      "returnedDate": "2026-10-03",
      "status": "RETURNED"
    },
    {
      "id": 5,
      "bookId": 1,
      "memberId": 105,
      "memberName": "Khoa Vo",
      "borrowedDate": "2026-09-01",
      "dueDate": "2026-09-15",
      "returnedDate": "2026-09-14",
      "status": "RETURNED"
    }
  ]
}
```

- **Response `404 Not Found`**:
```json
{
  "error": {
    "code": "BOOK_NOT_FOUND",
    "message": "Book with ID 999 does not exist",
    "requestId": "req-123"
  }
}
```

---

### 4.4. `POST /books`
Create a new book record.

- **Request Body**:
```json
{
  "title": "The Pragmatic Programmer",
  "author": "David Thomas, Andrew Hunt",
  "isbn": "978-0-13-595705-9",
  "publishedYear": 2019,
  "publisher": "Addison-Wesley",
  "edition": "20th Anniversary Edition",
  "description": "[Short description of the book]",
  "totalCopies": 5,
  "tags": ["Programming", "Career"],
  "status": "AVAILABLE"
}
```

- **Validation Rules**:
  - `title`: required, string, min 1, max 255.
  - `author`: required, string, min 1, max 255.
  - `isbn`: required, string, unique.
  - `publishedYear`: required, integer, 1000 - 2100.
  - `publisher`: optional, string, max 255.
  - `edition`: optional, string, max 255.
  - `description`: optional, string.
  - `totalCopies`: required, integer, min 1.
  - `tags`: optional, array of strings.
  - `status`: optional (default: `"AVAILABLE"`), enum `AVAILABLE` | `OUT_OF_STOCK` | `ARCHIVED`.

- **Response `201 Created`**: Returns created BookItem.
- **Response `409 Conflict` (Duplicate ISBN)**:
```json
{
  "error": {
    "code": "ISBN_ALREADY_EXISTS",
    "message": "A book with ISBN '978-0-13-595705-9' already exists",
    "details": {
      "isbn": "978-0-13-595705-9"
    },
    "requestId": "req-789"
  }
}
```

---

### 4.5. `PATCH /books/:id`
Update an existing book record.

- **URL Parameters**:
  - `id` *(required, integer)*: Book ID.

- **Request Body** *(All fields optional)*:
```json
{
  "title": "The Pragmatic Programmer (Special Edition)",
  "totalCopies": 6,
  "publisher": "Addison-Wesley Professional",
  "edition": "Special Anniversary Edition",
  "status": "AVAILABLE"
}
```

- **Business Constraints (Edge Cases)**:
  - **Duplicate ISBN**: If updated `isbn` is already used by another book, returns `409 ISBN_ALREADY_EXISTS`.
  - **Inventory Conflict**: If updated `totalCopies < onLoan` (active loans), the update is rejected with `409 COPIES_LESS_THAN_ACTIVE_LOANS`.

- **Response `200 OK`**: Updated Book object.
- **Response `404 Not Found`**: When book does not exist.
- **Response `409 Conflict` (Total copies < active loans)**:
```json
{
  "error": {
    "code": "COPIES_LESS_THAN_ACTIVE_LOANS",
    "message": "Cannot reduce totalCopies to 2 because 3 copies are currently on loan",
    "details": {
      "requestedTotalCopies": 2,
      "activeLoansCount": 3
    },
    "requestId": "req-101"
  }
}
```
- **Response `409 Conflict` (Duplicate ISBN)**:
```json
{
  "error": {
    "code": "ISBN_ALREADY_EXISTS",
    "message": "A book with ISBN '978-0-13-595705-9' already exists",
    "details": {
      "isbn": "978-0-13-595705-9"
    },
    "requestId": "req-102"
  }
}
```

---

### 4.6. `DELETE /books/:id`
Delete a book.

- **URL Parameters**:
  - `id` *(required, integer)*: Book ID.

- **Business Logic Constraint**:
  - If `onLoan > 0` (there are active loans with `status IN ('ACTIVE', 'OVERDUE')` or `returnedDate IS NULL`), deletion **must fail**.

- **Response `204 No Content`**: Deletion successful.
- **Response `409 Conflict`**:
```json
{
  "error": {
    "code": "BOOK_HAS_ACTIVE_LOANS",
    "message": "Cannot delete book while 3 copies are currently on loan",
    "details": {
      "activeLoansCount": 3
    },
    "requestId": "req-456"
  }
}
```
- **Response `404 Not Found`**: When book does not exist.
