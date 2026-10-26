import { ConflictError, NotFoundError } from "../../common/errors/app-error";
import { ErrorCode } from "../../common/errors/error-codes";
import {
  ApiResponse,
  paginatedResponse,
  PaginatedResponse,
  successResponse,
} from "../../common/response";
import type { BookRepository } from "./book.repository";
import {
  type BookDetailDto,
  type BookFilter,
  type BookDto,
  type BookSchema,
  type CreateBookDto,
  type BooksQuery,
  type UpdateBookDto,
  mapToBookDto,
  mapToBookDetail,
  mapToLoan,
  LoanDto,
} from "./book.types";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const isDuplicateEntryError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === "ER_DUP_ENTRY";

export class BookService {
  constructor(private readonly repo: BookRepository) {}

  async getBooks(query: BooksQuery): Promise<PaginatedResponse<BookDto[]>> {
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const filter: BookFilter = {
      q: query.q?.trim() || undefined,
      tag: query.tag?.trim() || undefined,
      status: query.status,
    };

    const { rows, total } = await this.repo.findAll(
      filter,
      (page - 1) * limit,
      limit,
    );
    return paginatedResponse(rows.map(mapToBookDto), page, limit, total);
  }

  async getBookById(id: number): Promise<BookDetailDto> {
    const book = await this.getBookOrThrow(id);
    const onLoan = await this.repo.countActiveLoans(id);
    return mapToBookDetail(book, onLoan);
  }

  async createBook(input: CreateBookDto): Promise<BookDto> {
    await this.assertIsbnAvailable(input.isbn);

    let newId: number;
    try {
      newId = await this.repo.create(input);
    } catch (error) {
      if (isDuplicateEntryError(error)) throw this.isbnConflict(input.isbn);
      throw error;
    }

    const created = await this.repo.findById(newId);
    if (!created) throw new Error(`Book ${newId} not found after insert`);
    return mapToBookDto(created);
  }

  async updateBook(id: number, input: UpdateBookDto): Promise<BookDetailDto> {
    const existing = await this.getBookOrThrow(id);

    if (input.isbn !== undefined && input.isbn !== existing.isbn) {
      await this.assertIsbnAvailable(input.isbn, id);
    }

    const onLoan = await this.repo.countActiveLoans(id);
    if (input.totalCopies !== undefined && input.totalCopies < onLoan) {
      throw new ConflictError(
        ErrorCode.CopiesLessThanActiveLoans,
        `Cannot reduce totalCopies to ${input.totalCopies} because ${onLoan} copies are currently on loan`,
        { requestedTotalCopies: input.totalCopies, activeLoansCount: onLoan },
      );
    }

    try {
      await this.repo.update(id, input);
    } catch (error) {
      if (isDuplicateEntryError(error) && input.isbn !== undefined) {
        throw this.isbnConflict(input.isbn);
      }
      throw error;
    }

    const updated = await this.getBookOrThrow(id);
    return mapToBookDetail(updated, onLoan);
  }

  async removeBook(id: number): Promise<void> {
    await this.getBookOrThrow(id);

    const onLoan = await this.repo.countActiveLoans(id);
    if (onLoan > 0) {
      throw new ConflictError(
        ErrorCode.BookHasActiveLoans,
        `Cannot delete book while ${onLoan} copies are currently on loan`,
        { activeLoansCount: onLoan },
      );
    }

    await this.repo.delete(id);
  }

  async getLoans(bookId: number): Promise<ApiResponse<LoanDto[]>> {
    const loans = await this.repo.findLoansByBookId(bookId);
    return successResponse(loans.map(mapToLoan));
  }

  private async getBookOrThrow(id: number): Promise<BookSchema> {
    const book = await this.repo.findById(id);
    if (!book) {
      throw new NotFoundError(
        ErrorCode.BookNotFound,
        `Book with ID ${id} does not exist`,
      );
    }
    return book;
  }

  private async assertIsbnAvailable(
    isbn: string,
    excludeId?: number,
  ): Promise<void> {
    const found = await this.repo.findByIsbn(isbn);
    if (found && found.id !== excludeId) throw this.isbnConflict(isbn);
  }

  private isbnConflict(isbn: string): ConflictError {
    return new ConflictError(
      ErrorCode.IsbnAlreadyExists,
      `A book with ISBN '${isbn}' already exists`,
      {
        isbn,
      },
    );
  }
}
