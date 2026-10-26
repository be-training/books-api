import { beforeEach, describe, expect, it, vi } from "vitest";
import { BookService } from "../src/modules/books/book.service";
import type { BookRepository } from "../src/modules/books/book.repository";
import type {
  BookSchema,
  LoanSchema,
  CreateBookDto,
  UpdateBookDto,
} from "../src/modules/books/book.types";
import { ConflictError, NotFoundError } from "../src/common/errors/app-error";

describe("BookService", () => {
  const input: CreateBookDto = {
    title: "The Pragmatic Programmer",
    author: "David Thomas, Andrew Hunt",
    isbn: "978-0-13-595755-9",
    publishedYear: 2019,
    publisher: "Addison-Wesley",
    edition: "20th Anniversary Edition",
    description: "From journeyman to master",
    totalCopies: 5,
    tags: ["Programming", "Career"],
    status: "AVAILABLE",
  };

  const book: BookSchema = {
    id: 1,
    title: input.title,
    author: input.author,
    isbn: input.isbn,
    published_year: input.publishedYear,
    publisher: input.publisher ?? null,
    edition: input.edition ?? null,
    description: input.description ?? null,
    total_copies: input.totalCopies,
    tags: input.tags ?? [],
    status: "AVAILABLE",
    added_on: "2026-10-23",
    created_at: "2026-10-23T08:00:00.000Z",
    updated_at: "2026-10-23T08:00:00.000Z",
  };

  const loan: LoanSchema = {
    id: 1,
    book_id: 1,
    member_id: 10,
    member_name: "Nguyen Van A",
    borrowed_date: "2026-10-20",
    due_date: "2026-10-30",
    returned_date: null,
    status: "ACTIVE",
  };

  const repo = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByIsbn: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countActiveLoans: vi.fn(),
    findLoansByBookId: vi.fn(),
  };

  const service = new BookService(repo as unknown as BookRepository);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getBooks", () => {
    it("TC01: should return books with pagination", async () => {
      repo.findAll.mockResolvedValue({ rows: [book], total: 1 });

      const result = await service.getBooks({ page: 1, limit: 10 });

      expect(repo.findAll).toHaveBeenCalledWith(
        { q: undefined, tag: undefined, status: undefined },
        0,
        10,
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("TC02: should return an empty list when no books exist", async () => {
      repo.findAll.mockResolvedValue({ rows: [], total: 0 });

      const result = await service.getBooks({});

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it("TC03: should use default page and limit", async () => {
      repo.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.getBooks({});

      expect(repo.findAll).toHaveBeenCalledWith(
        { q: undefined, tag: undefined, status: undefined },
        0,
        10,
      );
    });

    it("TC04: should calculate offset for page 2", async () => {
      repo.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.getBooks({ page: 2, limit: 5 });

      expect(repo.findAll).toHaveBeenCalledWith(
        { q: undefined, tag: undefined, status: undefined },
        5,
        5,
      );
    });

    it("TC05: should trim search query and tag", async () => {
      repo.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.getBooks({ q: "  clean code  ", tag: "  Programming  " });

      expect(repo.findAll).toHaveBeenCalledWith(
        { q: "clean code", tag: "Programming", status: undefined },
        0,
        10,
      );
    });

    it("TC06: should propagate repository errors", async () => {
      const error = new Error("Database unavailable");
      repo.findAll.mockRejectedValue(error);

      await expect(service.getBooks({})).rejects.toBe(error);
    });

    it("TC34: should treat whitespace-only q and tag as undefined", async () => {
      repo.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.getBooks({ q: "   ", tag: "   " });

      expect(repo.findAll).toHaveBeenCalledWith(
        { q: undefined, tag: undefined, status: undefined },
        0,
        10,
      );
    });

    it("TC35: should pass status filter to repository", async () => {
      repo.findAll.mockResolvedValue({ rows: [], total: 0 });

      await service.getBooks({ status: "ARCHIVED" });

      expect(repo.findAll).toHaveBeenCalledWith(
        { q: undefined, tag: undefined, status: "ARCHIVED" },
        0,
        10,
      );
    });
  });

  // getBookById
  describe("getBookById", () => {
    it("TC07: should return book details with loan counts", async () => {
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(2);

      const result = await service.getBookById(1);

      expect(result.id).toBe(1);
      expect(result.onLoan).toBe(2);
      expect(result.available).toBe(3);
    });

    it("TC08: should return all copies as available when no loans exist", async () => {
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(0);

      const result = await service.getBookById(1);

      expect(result.onLoan).toBe(0);
      expect(result.available).toBe(5);
    });

    it("TC09: should throw NotFoundError when book does not exist", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.getBookById(999)).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect(repo.countActiveLoans).not.toHaveBeenCalled();
    });

    it("TC10: should propagate loan count errors", async () => {
      const error = new Error("Loan count failed");
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockRejectedValue(error);

      await expect(service.getBookById(1)).rejects.toBe(error);
    });
  });

  // createBook
  describe("createBook", () => {
    it("TC11: should create a book successfully", async () => {
      repo.findByIsbn.mockResolvedValue(null);
      repo.create.mockResolvedValue(1);
      repo.findById.mockResolvedValue(book);

      const result = await service.createBook(input);

      expect(repo.findByIsbn).toHaveBeenCalledWith(input.isbn);
      expect(repo.create).toHaveBeenCalledWith(input);
      expect(repo.findById).toHaveBeenCalledWith(1);
      expect(result).toMatchObject({
        id: 1,
        title: input.title,
        isbn: input.isbn,
        publishedYear: input.publishedYear,
      });
    });

    it("TC12: should reject an existing ISBN", async () => {
      repo.findByIsbn.mockResolvedValue(book);

      await expect(service.createBook(input)).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("TC13: should convert ER_DUP_ENTRY into ConflictError", async () => {
      repo.findByIsbn.mockResolvedValue(null);
      repo.create.mockRejectedValue({ code: "ER_DUP_ENTRY" });

      await expect(service.createBook(input)).rejects.toBeInstanceOf(
        ConflictError,
      );
      expect(repo.findById).not.toHaveBeenCalled();
    });

    it("TC14: should propagate unexpected insert errors", async () => {
      const error = new Error("Database connection lost");
      repo.findByIsbn.mockResolvedValue(null);
      repo.create.mockRejectedValue(error);

      await expect(service.createBook(input)).rejects.toBe(error);
    });

    it("TC15: should propagate ISBN lookup errors", async () => {
      const error = new Error("ISBN lookup failed");
      repo.findByIsbn.mockRejectedValue(error);

      await expect(service.createBook(input)).rejects.toBe(error);
      expect(repo.create).not.toHaveBeenCalled();
    });

    it("TC16: should throw if the inserted book cannot be found", async () => {
      repo.findByIsbn.mockResolvedValue(null);
      repo.create.mockResolvedValue(99);
      repo.findById.mockResolvedValue(null);

      await expect(service.createBook(input)).rejects.toThrow(
        "Book 99 not found after insert",
      );
    });

    it("TC17: should propagate errors retrieving the inserted book", async () => {
      const error = new Error("Failed to retrieve book");
      repo.findByIsbn.mockResolvedValue(null);
      repo.create.mockResolvedValue(1);
      repo.findById.mockRejectedValue(error);

      await expect(service.createBook(input)).rejects.toBe(error);
    });
  });

  // updateBook
  describe("updateBook", () => {
    it("TC18: should update a book successfully", async () => {
      const updatedBook: BookSchema = {
        ...book,
        title: "Clean Code",
      };
      const update: UpdateBookDto = { title: "Clean Code" };

      repo.findById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(updatedBook);
      repo.countActiveLoans.mockResolvedValue(1);
      repo.update.mockResolvedValue(undefined);

      const result = await service.updateBook(1, update);

      expect(repo.update).toHaveBeenCalledWith(1, update);
      expect(result.title).toBe("Clean Code");
      expect(result.onLoan).toBe(1);
      expect(result.available).toBe(4);
    });

    it("TC19: should throw NotFoundError when book does not exist", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(
        service.updateBook(999, { title: "New title" }),
      ).rejects.toBeInstanceOf(NotFoundError);

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("TC20: should allow changing to an unused ISBN", async () => {
      const update: UpdateBookDto = { isbn: "NEW-ISBN-001" };
      const updatedBook = { ...book, isbn: update.isbn! };

      repo.findById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(updatedBook);
      repo.findByIsbn.mockResolvedValue(null);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.update.mockResolvedValue(undefined);

      const result = await service.updateBook(1, update);

      expect(repo.findByIsbn).toHaveBeenCalledWith(update.isbn);
      expect(repo.update).toHaveBeenCalledWith(1, update);
      expect(result.isbn).toBe(update.isbn);
    });

    it("TC21: should reject an ISBN belonging to another book", async () => {
      repo.findById.mockResolvedValue(book);
      repo.findByIsbn.mockResolvedValue({ ...book, id: 2 });

      await expect(
        service.updateBook(1, { isbn: "ISBN-TAKEN" }),
      ).rejects.toBeInstanceOf(ConflictError);

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("TC22: should not check ISBN when it remains unchanged", async () => {
      repo.findById.mockResolvedValueOnce(book).mockResolvedValueOnce(book);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.update.mockResolvedValue(undefined);

      await service.updateBook(1, { isbn: book.isbn });

      expect(repo.findByIsbn).not.toHaveBeenCalled();
    });

    it("TC23: should reject reducing total copies below active loans", async () => {
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(3);

      await expect(
        service.updateBook(1, { totalCopies: 2 }),
      ).rejects.toBeInstanceOf(ConflictError);

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("TC24: should allow total copies equal to active loans", async () => {
      const updatedBook = { ...book, total_copies: 2 };
      repo.findById
        .mockResolvedValueOnce(book)
        .mockResolvedValueOnce(updatedBook);
      repo.countActiveLoans.mockResolvedValue(2);
      repo.update.mockResolvedValue(undefined);

      const result = await service.updateBook(1, { totalCopies: 2 });

      expect(repo.update).toHaveBeenCalledWith(1, { totalCopies: 2 });
      expect(result.available).toBe(0);
    });

    it("TC25: should convert duplicate ISBN update errors", async () => {
      repo.findById.mockResolvedValue(book);
      repo.findByIsbn.mockResolvedValue(null);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.update.mockRejectedValue({ code: "ER_DUP_ENTRY" });

      await expect(
        service.updateBook(1, { isbn: "RACING-ISBN" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("TC26: should propagate other update errors", async () => {
      const error = new Error("Update failed");
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.update.mockRejectedValue(error);

      await expect(service.updateBook(1, { title: "New title" })).rejects.toBe(
        error,
      );
    });

    it("TC36: should not convert ER_DUP_ENTRY when isbn is not in update payload", async () => {
      const dupError = { code: "ER_DUP_ENTRY" };
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.update.mockRejectedValue(dupError);

      await expect(service.updateBook(1, { title: "New Title" })).rejects.toBe(
        dupError,
      );
    });

    it("TC37: should propagate ISBN lookup errors during update", async () => {
      const error = new Error("ISBN check failed");
      repo.findById.mockResolvedValue(book);
      repo.findByIsbn.mockRejectedValue(error);

      await expect(service.updateBook(1, { isbn: "NEW-ISBN" })).rejects.toBe(
        error,
      );

      expect(repo.update).not.toHaveBeenCalled();
    });

    it("TC38: should throw NotFoundError if book disappears after update", async () => {
      repo.findById.mockResolvedValueOnce(book).mockResolvedValueOnce(null);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.update.mockResolvedValue(undefined);

      await expect(
        service.updateBook(1, { title: "New Title" }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // removeBook
  describe("removeBook", () => {
    it("TC27: should delete a book with no active loans", async () => {
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.delete.mockResolvedValue(undefined);

      await expect(service.removeBook(1)).resolves.toBeUndefined();

      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it("TC28: should reject deleting a missing book", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.removeBook(999)).rejects.toBeInstanceOf(
        NotFoundError,
      );

      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("TC29: should reject deleting a book with active loans", async () => {
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(1);

      await expect(service.removeBook(1)).rejects.toBeInstanceOf(ConflictError);

      expect(repo.delete).not.toHaveBeenCalled();
    });

    it("TC30: should propagate delete errors", async () => {
      const error = new Error("Delete failed");
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockResolvedValue(0);
      repo.delete.mockRejectedValue(error);

      await expect(service.removeBook(1)).rejects.toBe(error);
    });

    it("TC39: should propagate countActiveLoans errors", async () => {
      const error = new Error("Loan count failed");
      repo.findById.mockResolvedValue(book);
      repo.countActiveLoans.mockRejectedValue(error);

      await expect(service.removeBook(1)).rejects.toBe(error);

      expect(repo.delete).not.toHaveBeenCalled();
    });
  });

  // getLoans
  describe("getLoans", () => {
    it("TC31: should return mapped loans", async () => {
      repo.findLoansByBookId.mockResolvedValue([loan]);

      const result = await service.getLoans(1);

      expect(repo.findLoansByBookId).toHaveBeenCalledWith(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 1,
        bookId: 1,
        memberId: 10,
        memberName: "Nguyen Van A",
        status: "ACTIVE",
      });
    });

    it("TC32: should return an empty loan list", async () => {
      repo.findLoansByBookId.mockResolvedValue([]);

      const result = await service.getLoans(1);

      expect(result.data).toEqual([]);
    });

    it("TC33: should propagate loan lookup errors", async () => {
      const error = new Error("Loan lookup failed");
      repo.findLoansByBookId.mockRejectedValue(error);

      await expect(service.getLoans(1)).rejects.toBe(error);
    });
  });
});
