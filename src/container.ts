import type { Pool } from "mysql2/promise";
import { createBookRepository } from "./modules/books/book.repository.js";
import { BookService } from "./modules/books/book.service.js";
import { BookController } from "./modules/books/book.controller.js";

/**
 * Application-level dependency container.
 *
 * All object creation is centralised here so that:
 *  - Each layer depends only on interfaces (constructor injection).
 *  - Routes / plugins never instantiate services or repositories.
 *  - Tests can build a container with mock dependencies.
 */
export interface AppContainer {
  bookController: BookController;
  bookService: BookService;
}

export function createContainer(db: Pool): AppContainer {
  const bookRepository = createBookRepository(db);
  const bookService = new BookService(bookRepository);
  const bookController = new BookController(bookService);

  return {
    bookController,
    bookService,
  };
}
