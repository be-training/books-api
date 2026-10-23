import type { FastifyPluginAsync } from "fastify";
import { createBookRepository } from "./book.repository";
import type {
  BookIdParams,
  CreateBookDto,
  BooksQuery,
  UpdateBookDto,
} from "./book.types";
import { BookService } from "./book.service";
import {
  createBookSchema,
  deleteBookSchema,
  getBookLoansSchema,
  getBookSchema,
  listBooksSchema,
  updateBookSchema,
} from "./book.schema";
import { BookController } from "./book.controller";

const bookRoutes: FastifyPluginAsync = async (app) => {
  const repository = createBookRepository(app.db);
  const service = new BookService(repository);
  const controller = new BookController(service);

  app.get<{ Querystring: BooksQuery }>(
    "/books",
    { schema: listBooksSchema },
    controller.getBooks,
  );
  app.get<{ Params: BookIdParams }>(
    "/books/:id",
    { schema: getBookSchema },
    controller.getBookById,
  );
  app.get<{ Params: BookIdParams }>(
    "/books/:id/loans",
    { schema: getBookLoansSchema },
    controller.getLoans,
  );
  app.post<{ Body: CreateBookDto }>(
    "/books",
    { schema: createBookSchema },
    controller.createBook,
  );
  app.patch<{ Params: BookIdParams; Body: UpdateBookDto }>(
    "/books/:id",
    { schema: updateBookSchema },
    controller.updateBook,
  );
  app.delete<{ Params: BookIdParams }>(
    "/books/:id",
    { schema: deleteBookSchema },
    controller.removeBook,
  );
};

export default bookRoutes;
