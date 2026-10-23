export const ErrorCode = {
  // Common
  ValidationError: "VALIDATION_ERROR",
  InternalServerError: "INTERNAL_SERVER_ERROR",
  HttpError: "HTTP_ERROR",
  RouteNotFound: "ROUTE_NOT_FOUND",

  // Books
  BookNotFound: "BOOK_NOT_FOUND",
  BookHasActiveLoans: "BOOK_HAS_ACTIVE_LOANS",
  IsbnAlreadyExists: "ISBN_ALREADY_EXISTS",
  CopiesLessThanActiveLoans: "COPIES_LESS_THAN_ACTIVE_LOANS",

  // Loans
  LoanNotFound: "LOAN_NOT_FOUND",
  LoanAlreadyClosed: "LOAN_ALREADY_CLOSED",
  LoanDuplicate: "LOAN_DUPLICATE",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
