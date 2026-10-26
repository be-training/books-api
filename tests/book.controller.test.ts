// test/book.controller.unit.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from "fastify";
import { BookController } from "../src/modules/books/book.controller";
import type { BookService } from "../src/modules/books/book.service";
import type {
  BookDetailDto,
  BookDto,
  BookIdParams,
  BooksQuery,
  CreateBookDto,
  LoanDto,
  UpdateBookDto,
} from "../src/modules/books/book.types";
import { HttpCodes } from "../src/common/errors/http-codes";

// ─── Fixtures ───────────────────────────────────────────────────────────

const bookDto = { id: 1, title: "Clean Code" } as unknown as BookDto;
const bookDetail = {
  ...bookDto,
  onLoan: 2,
  available: 3,
} as unknown as BookDetailDto;
const loanDto = {
  id: 1,
  bookId: 1,
  memberName: "Nguyen Van A",
} as unknown as LoanDto;

const createInput = {
  title: "Clean Code",
  author: "Robert C. Martin",
  isbn: "978-0-13-235088-4",
  publishedYear: 2008,
  totalCopies: 3,
} as CreateBookDto;

// ─── Mock helpers ───────────────────────────────────────────────────────

// Fake service: only the methods the controller calls
const service = {
  getBooks: vi.fn(),
  getBookById: vi.fn(),
  getLoans: vi.fn(),
  createBook: vi.fn(),
  updateBook: vi.fn(),
  removeBook: vi.fn(),
};

const makeRequest = <T extends RouteGenericInterface>(
  parts: Partial<Record<"query" | "params" | "body", unknown>>,
) => parts as unknown as FastifyRequest<T>;

// code() and send() return the reply itself so they can be chained
const makeReply = () => {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply as typeof reply & FastifyReply;
};

const expectNoOtherServiceCalls = (except: keyof typeof service) => {
  (Object.keys(service) as Array<keyof typeof service>)
    .filter((name) => name !== except)
    .forEach((name) => expect(service[name]).not.toHaveBeenCalled());
};

// ─── Tests ──────────────────────────────────────────────────────────────

describe("BookController (unit)", () => {
  let controller: BookController;

  beforeEach(() => {
    vi.resetAllMocks();
    controller = new BookController(service as unknown as BookService);
  });

  // ═════════════════════════════════════════════════════════════════════
  // getBooks
  // ═════════════════════════════════════════════════════════════════════
  describe("getBooks", () => {
    it("TC01: should pass the query to the service unchanged", async () => {
      const query = {
        q: "clean",
        tag: "Programming",
        page: 3,
        limit: 5,
      } as BooksQuery;

      service.getBooks.mockResolvedValue({
        data: [],
        total: 0,
        page: 3,
        limit: 5,
      });

      await controller.getBooks(
        makeRequest<{ Querystring: BooksQuery }>({ query }),
      );

      expect(service.getBooks).toHaveBeenCalledTimes(1);
      expect(service.getBooks).toHaveBeenCalledWith(query);
    });

    it("TC02: should return the paginated result from the service as-is", async () => {
      const paged = { data: [bookDto], total: 1, page: 1, limit: 10 };
      service.getBooks.mockResolvedValue(paged);

      const result = await controller.getBooks(
        makeRequest<{ Querystring: BooksQuery }>({ query: {} }),
      );

      expect(result).toBe(paged);
    });

    it("TC03: should return an empty page when the service returns no rows", async () => {
      const empty = { data: [], total: 0, page: 1, limit: 10 };
      service.getBooks.mockResolvedValue(empty);

      const result = await controller.getBooks(
        makeRequest<{ Querystring: BooksQuery }>({ query: {} }),
      );

      expect(result).toEqual(empty);
    });

    it("TC04: should propagate errors thrown by the service", async () => {
      const error = new Error("DB crashed");
      service.getBooks.mockRejectedValue(error);

      await expect(
        controller.getBooks(
          makeRequest<{ Querystring: BooksQuery }>({ query: {} }),
        ),
      ).rejects.toBe(error);
    });

    it("TC05: should not call any other service method", async () => {
      service.getBooks.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });

      await controller.getBooks(
        makeRequest<{ Querystring: BooksQuery }>({ query: {} }),
      );

      expectNoOtherServiceCalls("getBooks");
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // getBookById
  // ═════════════════════════════════════════════════════════════════════
  describe("getBookById", () => {
    it("TC06: should call the service with params.id", async () => {
      service.getBookById.mockResolvedValue(bookDetail);

      await controller.getBookById(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 42 } }),
      );

      expect(service.getBookById).toHaveBeenCalledTimes(1);
      expect(service.getBookById).toHaveBeenCalledWith(42);
    });

    it("TC07: should return the book detail from the service", async () => {
      service.getBookById.mockResolvedValue(bookDetail);

      const result = await controller.getBookById(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
      );

      expect(result).toBe(bookDetail);
    });

    it("TC08: should propagate errors (e.g. book not found)", async () => {
      const error = new Error("BOOK_NOT_FOUND");
      service.getBookById.mockRejectedValue(error);

      await expect(
        controller.getBookById(
          makeRequest<{ Params: BookIdParams }>({ params: { id: 999 } }),
        ),
      ).rejects.toBe(error);
    });

    it("TC09: should not call any other service method", async () => {
      service.getBookById.mockResolvedValue(bookDetail);

      await controller.getBookById(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
      );

      expectNoOtherServiceCalls("getBookById");
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // getLoans
  // ═════════════════════════════════════════════════════════════════════
  describe("getLoans", () => {
    it("TC10: should call the service with params.id", async () => {
      service.getLoans.mockResolvedValue({ data: [] });

      await controller.getLoans(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 7 } }),
      );

      expect(service.getLoans).toHaveBeenCalledTimes(1);
      expect(service.getLoans).toHaveBeenCalledWith(7);
    });

    it("TC11: should return the loans response from the service", async () => {
      const response = { data: [loanDto] };
      service.getLoans.mockResolvedValue(response);

      const result = await controller.getLoans(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
      );

      expect(result).toBe(response);
    });

    it("TC12: should return an empty list when the book has no loans", async () => {
      service.getLoans.mockResolvedValue({ data: [] });

      const result = await controller.getLoans(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
      );

      expect(result).toEqual({ data: [] });
    });

    it("TC13: should propagate errors thrown by the service", async () => {
      const error = new Error("DB crashed");
      service.getLoans.mockRejectedValue(error);

      await expect(
        controller.getLoans(
          makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
        ),
      ).rejects.toBe(error);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // createBook
  // ═════════════════════════════════════════════════════════════════════
  describe("createBook", () => {
    it("TC14: should call the service with the request body", async () => {
      service.createBook.mockResolvedValue(bookDto);

      await controller.createBook(
        makeRequest<{ Body: CreateBookDto }>({ body: createInput }),
        makeReply(),
      );

      expect(service.createBook).toHaveBeenCalledTimes(1);
      expect(service.createBook).toHaveBeenCalledWith(createInput);
    });

    it("TC15: should reply with 201 and send the created book", async () => {
      service.createBook.mockResolvedValue(bookDto);
      const reply = makeReply();

      await controller.createBook(
        makeRequest<{ Body: CreateBookDto }>({ body: createInput }),
        reply,
      );

      expect(reply.code).toHaveBeenCalledTimes(1);
      expect(reply.code).toHaveBeenCalledWith(HttpCodes.Created);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send).toHaveBeenCalledWith(bookDto);
    });

    it("TC16: should set the status code before sending the payload", async () => {
      service.createBook.mockResolvedValue(bookDto);
      const reply = makeReply();

      await controller.createBook(
        makeRequest<{ Body: CreateBookDto }>({ body: createInput }),
        reply,
      );

      expect(reply.code.mock.invocationCallOrder[0]).toBeLessThan(
        reply.send.mock.invocationCallOrder[0],
      );
    });

    it("TC17: should not mutate the request body", async () => {
      const body = { ...createInput };
      service.createBook.mockResolvedValue(bookDto);

      await controller.createBook(
        makeRequest<{ Body: CreateBookDto }>({ body }),
        makeReply(),
      );

      expect(body).toEqual(createInput);
    });

    it("TC18: should propagate service errors and not touch the reply", async () => {
      const error = new Error("ISBN_ALREADY_EXISTS");
      service.createBook.mockRejectedValue(error);
      const reply = makeReply();

      await expect(
        controller.createBook(
          makeRequest<{ Body: CreateBookDto }>({ body: createInput }),
          reply,
        ),
      ).rejects.toBe(error);

      expect(reply.code).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // updateBook
  // ═════════════════════════════════════════════════════════════════════
  describe("updateBook", () => {
    it("TC19: should call the service with (id, body) in the correct order", async () => {
      const body = { title: "New title" } as UpdateBookDto;
      service.updateBook.mockResolvedValue(bookDetail);

      await controller.updateBook(
        makeRequest<{ Params: BookIdParams; Body: UpdateBookDto }>({
          params: { id: 7 },
          body,
        }),
      );

      expect(service.updateBook).toHaveBeenCalledTimes(1);
      expect(service.updateBook).toHaveBeenCalledWith(7, body);
    });

    it("TC20: should return the updated book detail from the service", async () => {
      service.updateBook.mockResolvedValue(bookDetail);

      const result = await controller.updateBook(
        makeRequest<{ Params: BookIdParams; Body: UpdateBookDto }>({
          params: { id: 1 },
          body: { title: "New title" } as UpdateBookDto,
        }),
      );

      expect(result).toBe(bookDetail);
    });

    it("TC21: should forward a partial body without adding defaults", async () => {
      const body = { totalCopies: 4 } as UpdateBookDto;
      service.updateBook.mockResolvedValue(bookDetail);

      await controller.updateBook(
        makeRequest<{ Params: BookIdParams; Body: UpdateBookDto }>({
          params: { id: 1 },
          body,
        }),
      );

      expect(service.updateBook.mock.calls[0][1]).toStrictEqual({
        totalCopies: 4,
      });
    });

    it("TC22: should propagate service errors (e.g. ISBN conflict)", async () => {
      const error = new Error("ISBN_ALREADY_EXISTS");
      service.updateBook.mockRejectedValue(error);

      await expect(
        controller.updateBook(
          makeRequest<{ Params: BookIdParams; Body: UpdateBookDto }>({
            params: { id: 1 },
            body: { isbn: "TAKEN" } as UpdateBookDto,
          }),
        ),
      ).rejects.toBe(error);
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // removeBook
  // ═════════════════════════════════════════════════════════════════════
  describe("removeBook", () => {
    it("TC23: should call the service with params.id", async () => {
      service.removeBook.mockResolvedValue(undefined);

      await controller.removeBook(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 5 } }),
        makeReply(),
      );

      expect(service.removeBook).toHaveBeenCalledTimes(1);
      expect(service.removeBook).toHaveBeenCalledWith(5);
    });

    it("TC24: should reply with 204 and an empty body", async () => {
      service.removeBook.mockResolvedValue(undefined);
      const reply = makeReply();

      await controller.removeBook(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
        reply,
      );

      expect(reply.code).toHaveBeenCalledWith(HttpCodes.NoContent);
      expect(reply.send).toHaveBeenCalledTimes(1);
      expect(reply.send).toHaveBeenCalledWith();
    });

    it("TC25: should only reply after the service has finished", async () => {
      service.removeBook.mockResolvedValue(undefined);
      const reply = makeReply();

      await controller.removeBook(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
        reply,
      );

      expect(service.removeBook.mock.invocationCallOrder[0]).toBeLessThan(
        reply.code.mock.invocationCallOrder[0],
      );
    });

    it("TC26: should propagate service errors and not reply 204", async () => {
      const error = new Error("BOOK_HAS_ACTIVE_LOANS");
      service.removeBook.mockRejectedValue(error);
      const reply = makeReply();

      await expect(
        controller.removeBook(
          makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
          reply,
        ),
      ).rejects.toBe(error);

      expect(reply.code).not.toHaveBeenCalled();
      expect(reply.send).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════
  // Cross-cutting
  // ═════════════════════════════════════════════════════════════════════
  describe("handler binding", () => {
    it("TC27: handlers should keep `this` when detached from the controller", async () => {
      service.getBookById.mockResolvedValue(bookDetail);
      const { getBookById } = controller; // detached, as Fastify does when registering routes

      const result = await getBookById(
        makeRequest<{ Params: BookIdParams }>({ params: { id: 1 } }),
      );

      expect(result).toBe(bookDetail);
    });
  });
});
