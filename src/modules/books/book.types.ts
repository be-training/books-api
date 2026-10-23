export type BookStatus = "AVAILABLE" | "OUT_OF_STOCK" | "ARCHIVED";
export type LoanStatus = "ACTIVE" | "OVERDUE" | "RETURNED";

// SCHEMA
export interface BookSchema {
  id: number;
  title: string;
  author: string;
  isbn: string;
  published_year: number;
  publisher: string | null;
  edition: string | null;
  description: string | null;
  total_copies: number;
  tags: string[] | string | null; // mysql2 parses JSON columns, but be defensive
  status: BookStatus;
  added_on: string; // formatted as YYYY-MM-DD in SQL (DATE_FORMAT)
  created_at: Date | string;
  updated_at: Date | string;
}

export interface LoanSchema {
  id: number;
  book_id: number;
  member_id: number;
  member_name: string;
  borrowed_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-DD
  returned_date: string | null; // YYYY-MM-DD | null
  status: LoanStatus;
}

// MAP

export function mapToBookDto(row: BookSchema): BookDto {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    publishedYear: row.published_year,
    isbn: row.isbn,
    publisher: row.publisher ?? "",
    edition: row.edition ?? "",
    description: row.description ?? "",
    totalCopies: row.total_copies,
    tags: parseTags(row.tags),
    status: row.status,
    addedOn: row.added_on,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapToBookDetail(
  row: BookSchema,
  onLoan: number,
): BookDetailDto {
  return {
    ...mapToBookDto(row),
    onLoan,
    available: row.total_copies - onLoan,
  };
}

export function mapToLoan(row: LoanSchema): LoanDto {
  return {
    id: row.id,
    bookId: row.book_id,
    memberId: row.member_id,
    memberName: row.member_name,
    borrowedDate: row.borrowed_date,
    dueDate: row.due_date,
    returnedDate: row.returned_date,
    status: row.status,
  };
}

const toIso = (value: Date | string): string =>
  (value instanceof Date ? value : new Date(value)).toISOString();

const parseTags = (tags: BookSchema["tags"]): string[] => {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed: unknown = JSON.parse(tags);
      return Array.isArray(parsed)
        ? parsed.filter((t): t is string => typeof t === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
};

// DTO

export interface BookDto {
  id: number;
  title: string;
  author: string;
  publishedYear: number;
  isbn: string;
  publisher: string;
  edition: string;
  description: string;
  totalCopies: number;
  tags: string[];
  status: BookStatus;
  addedOn: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookDetailDto extends BookDto {
  onLoan: number;
  available: number;
}

export interface LoanDto {
  id: number;
  bookId: number;
  memberId: number;
  memberName: string;
  borrowedDate: string;
  dueDate: string;
  returnedDate: string | null;
  status: LoanStatus;
}

export interface BookIdParams {
  id: number;
}

export interface BooksQuery {
  q?: string;
  tag?: string;
  status?: BookStatus;
  page?: number;
  limit?: number;
}

export interface BookFilter {
  q?: string | undefined;
  tag?: string | undefined;
  status?: BookStatus | undefined;
}

export interface CreateBookDto {
  title: string;
  author: string;
  isbn: string;
  publishedYear: number;
  publisher?: string;
  edition?: string;
  description?: string;
  totalCopies: number;
  tags?: string[];
  status?: BookStatus;
}

export type UpdateBookDto = Partial<CreateBookDto>;
