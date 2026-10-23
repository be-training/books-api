import type { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import type {
  BookFilter,
  BookSchema,
  CreateBookDto,
  LoanSchema,
  UpdateBookDto,
} from "./book.types";

export interface BookRepository {
  findAll(
    filter: BookFilter,
    offset: number,
    limit: number,
  ): Promise<{ rows: BookSchema[]; total: number }>;
  findById(id: number): Promise<BookSchema | null>;
  findByIsbn(isbn: string): Promise<BookSchema | null>;
  create(data: CreateBookDto): Promise<number>;
  update(id: number, data: UpdateBookDto): Promise<void>;
  delete(id: number): Promise<boolean>;
  countActiveLoans(bookId: number): Promise<number>;
  findLoansByBookId(bookId: number): Promise<LoanSchema[]>;
}

type BookQueryRow = BookSchema & RowDataPacket;
type LoanQueryRow = LoanSchema & RowDataPacket;
interface CountRow extends RowDataPacket {
  total: number;
}

const BOOK_COLUMNS = `
  id, title, author, isbn, published_year, publisher, edition, description,
  total_copies, tags, status,
  DATE_FORMAT(added_on, '%Y-%m-%d') AS added_on,
  created_at, updated_at`;

const LOAN_COLUMNS = `
  id, book_id, member_id, member_name,
  DATE_FORMAT(borrowed_date, '%Y-%m-%d') AS borrowed_date,
  DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date,
  DATE_FORMAT(returned_date, '%Y-%m-%d') AS returned_date,
  status`;

const ACTIVE_LOAN_CONDITION = `(status IN ('ACTIVE', 'OVERDUE') OR returned_date IS NULL)`;

const UPDATABLE_COLUMNS = {
  title: "title",
  author: "author",
  isbn: "isbn",
  publishedYear: "published_year",
  publisher: "publisher",
  edition: "edition",
  description: "description",
  totalCopies: "total_copies",
  status: "status",
} as const;

const escapeLike = (value: string): string => value.replace(/[\\%_]/g, "\\$&");

export function createBookRepository(db: Pool): BookRepository {
  return {
    async findAll(filter, offset, limit) {
      const where: string[] = [];
      const params: Array<string | number> = [];

      if (filter.q) {
        const like = `%${escapeLike(filter.q)}%`;
        where.push("(title LIKE ? OR author LIKE ?)");
        params.push(like, like);
      }
      if (filter.tag) {
        where.push("JSON_CONTAINS(tags, JSON_QUOTE(?))");
        params.push(filter.tag);
      }
      if (filter.status) {
        where.push("status = ?");
        params.push(filter.status);
      }
      const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

      const [countRows] = await db.query<CountRow[]>(
        `SELECT COUNT(*) AS total FROM books ${whereSql}`,
        params,
      );
      const [rows] = await db.query<BookQueryRow[]>(
        `SELECT ${BOOK_COLUMNS} FROM books ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );

      return { rows, total: Number(countRows[0]?.total ?? 0) };
    },

    async findById(id) {
      const [rows] = await db.execute<BookQueryRow[]>(
        `SELECT ${BOOK_COLUMNS} FROM books WHERE id = ? LIMIT 1`,
        [id],
      );
      return rows[0] ?? null;
    },

    async findByIsbn(isbn) {
      const [rows] = await db.execute<BookQueryRow[]>(
        `SELECT ${BOOK_COLUMNS} FROM books WHERE isbn = ? LIMIT 1`,
        [isbn],
      );
      return rows[0] ?? null;
    },

    async findLoansByBookId(bookId) {
      const [rows] = await db.execute<LoanQueryRow[]>(
        `SELECT ${LOAN_COLUMNS} FROM book_loans WHERE book_id = ?`,
        [bookId],
      );
      return rows;
    },

    async create(data) {
      const [result] = await db.execute<ResultSetHeader>(
        `INSERT INTO books
           (title, author, isbn, published_year, publisher, edition, description, total_copies, tags, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.title,
          data.author,
          data.isbn,
          data.publishedYear,
          data.publisher ?? null,
          data.edition ?? null,
          data.description ?? null,
          data.totalCopies,
          JSON.stringify(data.tags ?? []),
          data.status ?? "AVAILABLE",
        ],
      );
      return result.insertId;
    },

    async update(id, data) {
      const sets: string[] = [];
      const params: Array<string | number> = [];

      for (const key of Object.keys(UPDATABLE_COLUMNS) as Array<
        keyof typeof UPDATABLE_COLUMNS
      >) {
        const value = data[key];
        if (value !== undefined) {
          sets.push(`${UPDATABLE_COLUMNS[key]} = ?`);
          params.push(value);
        }
      }
      if (data.tags !== undefined) {
        sets.push("tags = ?");
        params.push(JSON.stringify(data.tags));
      }
      if (sets.length === 0) return;

      await db.execute<ResultSetHeader>(
        `UPDATE books SET ${sets.join(", ")} WHERE id = ?`,
        [...params, id],
      );
    },

    async delete(id) {
      const [result] = await db.execute<ResultSetHeader>(
        "DELETE FROM books WHERE id = ?",
        [id],
      );
      return result.affectedRows > 0;
    },

    async countActiveLoans(bookId) {
      const [rows] = await db.execute<CountRow[]>(
        `SELECT COUNT(*) AS total FROM book_loans WHERE book_id = ? AND ${ACTIVE_LOAN_CONDITION}`,
        [bookId],
      );
      return Number(rows[0]?.total ?? 0);
    },
  };
}
