import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  BookDetailDto,
  BookIdParams,
  BookDto,
  CreateBookDto,
  BooksQuery,
  UpdateBookDto,
  LoanDto,
} from "./book.types";
import { BookService } from "./book.service";
import { ApiResponse, PaginatedResponse } from "../../common/response";
import { HttpCodes } from "../../common/errors/http-codes";

export class BookController {
  constructor(private readonly service: BookService) {}

  getBooks = async (
    request: FastifyRequest<{ Querystring: BooksQuery }>,
  ): Promise<PaginatedResponse<BookDto[]>> =>
    this.service.getBooks(request.query);

  getBookById = async (
    request: FastifyRequest<{ Params: BookIdParams }>,
  ): Promise<BookDetailDto> => this.service.getBookById(request.params.id);

  getLoans = async (
    request: FastifyRequest<{ Params: BookIdParams }>,
  ): Promise<ApiResponse<LoanDto[]>> =>
    this.service.getLoans(request.params.id);

  createBook = async (
    request: FastifyRequest<{ Body: CreateBookDto }>,
    reply: FastifyReply,
  ): Promise<BookDto> => {
    const book = await this.service.createBook(request.body);
    return reply.code(HttpCodes.Created).send(book);
  };

  updateBook = async (
    request: FastifyRequest<{ Params: BookIdParams; Body: UpdateBookDto }>,
  ): Promise<BookDetailDto> =>
    this.service.updateBook(request.params.id, request.body);

  removeBook = async (
    request: FastifyRequest<{ Params: BookIdParams }>,
    reply: FastifyReply,
  ): Promise<void> => {
    await this.service.removeBook(request.params.id);
    return reply.code(HttpCodes.NoContent).send();
  };
}
