# Luồng chạy Project Books API

## Tổng quan kiến trúc

```mermaid
graph TD
    A["server.ts<br/>Entry point"] --> B["app.ts<br/>buildApp()"]
    B --> C["Đăng ký Plugins"]
    C --> C1["request-id.plugin"]
    C --> C2["error-handler.plugin"]
    C --> C3["database.plugin<br/>Tạo MySQL Pool"]
    C --> C4["container.plugin<br/>Tạo DI Container"]
    C4 -.->|"phụ thuộc"| C3
    B --> D["Đăng ký Routes<br/>/api/v1"]
    D --> E["routes/index.ts"]
    E --> F["book.routes.ts"]
    F -->|"lấy từ app.container"| C4
```

---

## Luồng khởi động (Startup Flow)

### Bước 1: Entry Point — [`server.ts`](file:///d:/Personal/Antigravity/books-api/src/server.ts)

```typescript
const app = buildApp();     // Tạo Fastify instance
await app.listen({ port: 3000, host: "0.0.0.0" });
```

File này chỉ làm 2 việc: gọi `buildApp()` để lấy Fastify app, rồi `listen()` để start server.

### Bước 2: Xây dựng App — [`app.ts`](file:///d:/Personal/Antigravity/books-api/src/app.ts)

`buildApp()` tạo Fastify instance và **đăng ký plugins theo thứ tự**:

| Thứ tự | Plugin | Nhiệm vụ |
|--------|--------|-----------|
| 1 | `requestIdPlugin` | Gắn request ID vào mỗi request |
| 2 | `errorHandlerPlugin` | Bắt lỗi và trả response chuẩn |
| 3 | `databasePlugin` | Tạo MySQL connection pool → gắn vào `app.db` |
| 4 | **`containerPlugin`** | Tạo DI container → gắn vào `app.container` |

Sau đó đăng ký routes với prefix `/api/v1`.

### Bước 3: Database Plugin — [`database.plugin.ts`](file:///d:/Personal/Antigravity/books-api/src/plugins/database.plugin.ts)

```typescript
const pool = mysql.createPool(poolConfig);   // Tạo connection pool
fastify.decorate("db", pool);                // Gắn pool vào app.db
```

Sau bước này, `app.db` có sẵn MySQL pool để dùng.

### Bước 4: Container Plugin (DI) — [`container.plugin.ts`](file:///d:/Personal/Antigravity/books-api/src/plugins/container.plugin.ts)

```typescript
// Khai báo dependency: phải chạy SAU database plugin
export default fp(containerPlugin, {
  name: "container",
  dependencies: ["database"],   // ← Fastify đảm bảo database plugin chạy trước
});
```

Plugin này gọi [`createContainer(app.db)`](file:///d:/Personal/Antigravity/books-api/src/container.ts) — đây là **Composition Root**:

```typescript
function createContainer(db: Pool): AppContainer {
  // 1. Tạo Repository (tầng truy cập DB)
  const bookRepository = createBookRepository(db);

  // 2. Tạo Service (tầng business logic), inject repository
  const bookService = new BookService(bookRepository);

  // 3. Tạo Controller (tầng xử lý HTTP), inject service
  const bookController = new BookController(bookService);

  return { bookController, bookService };
}
```

> [!IMPORTANT]
> **Tất cả object được tạo ở ĐÂY, một lần duy nhất.** Không có layer nào tự `new` dependency của mình.

### Bước 5: Route Registration — [`book.routes.ts`](file:///d:/Personal/Antigravity/books-api/src/modules/books/book.routes.ts)

```typescript
const bookRoutes: FastifyPluginAsync = async (app) => {
  // Lấy controller đã được tạo sẵn từ container
  const { bookController: controller } = app.container;

  app.get("/books", { schema: listBooksSchema }, controller.getBooks);
  app.get("/books/:id", { schema: getBookSchema }, controller.getBookById);
  // ...
};
```

Routes **không tạo bất kỳ object nào** — chỉ lấy từ container và map vào HTTP endpoints.

---

## Luồng xử lý Request (Runtime Flow)

Khi client gọi `GET /api/v1/books`:

```mermaid
sequenceDiagram
    participant Client
    participant Fastify
    participant Controller as BookController
    participant Service as BookService
    participant Repo as BookRepository
    participant DB as MySQL

    Client->>Fastify: GET /api/v1/books?page=1
    Fastify->>Fastify: Validate query (AJV schema)
    Fastify->>Controller: getBooks(request)
    Controller->>Service: getBooks(request.query)
    Service->>Repo: findAll(filter, offset, limit)
    Repo->>DB: SELECT ... FROM books
    DB-->>Repo: Raw rows
    Repo-->>Service: { rows, total }
    Service->>Service: map rows → BookDto[]
    Service-->>Controller: PaginatedResponse
    Controller-->>Fastify: Response object
    Fastify-->>Client: JSON response
```

### Chi tiết từng tầng:

| Tầng | File | Trách nhiệm |
|------|------|-------------|
| **Routes** | [`book.routes.ts`](file:///d:/Personal/Antigravity/books-api/src/modules/books/book.routes.ts) | Khai báo endpoint, schema validation |
| **Controller** | [`book.controller.ts`](file:///d:/Personal/Antigravity/books-api/src/modules/books/book.controller.ts) | Đọc request, gọi service, set HTTP status code |
| **Service** | [`book.service.ts`](file:///d:/Personal/Antigravity/books-api/src/modules/books/book.service.ts) | Business logic (validate ISBN, check loans, map DTO) |
| **Repository** | [`book.repository.ts`](file:///d:/Personal/Antigravity/books-api/src/modules/books/book.repository.ts) | Viết SQL, tương tác MySQL |

---

## Dependency Injection Flow

```mermaid
graph LR
    subgraph "Composition Root (container.ts)"
        DB["db: Pool"] --> R["BookRepository"]
        R --> S["BookService"]
        S --> C["BookController"]
    end

    subgraph "Runtime"
        Routes -->|"app.container.bookController"| C
    end

    style DB fill:#4a9eff,color:#fff
    style R fill:#f59e0b,color:#fff
    style S fill:#10b981,color:#fff
    style C fill:#ef4444,color:#fff
```

**Nguyên tắc:** Mỗi layer chỉ biết interface của layer bên dưới:
- `BookController` nhận `BookService` qua constructor — không biết service tạo ra sao
- `BookService` nhận `BookRepository` (interface) — không biết implementation dùng MySQL hay gì
- `BookRepository` nhận `Pool` — không biết pool config ra sao

> [!TIP]
> Khi viết test, ta chỉ cần mock interface `BookRepository` rồi inject vào `BookService` — không cần database thật. Đó là lý do 33 test cases trong [`book.service.test.ts`](file:///d:/Personal/Antigravity/books-api/tests/book.service.test.ts) chạy cực nhanh (25ms).
