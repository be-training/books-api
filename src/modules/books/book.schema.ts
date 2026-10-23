import { HttpCodes } from "../../common/errors/http-codes";

const STATUS_ENUM = ["AVAILABLE", "OUT_OF_STOCK", "ARCHIVED"];

const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "integer", minimum: 1 } },
  additionalProperties: false,
};

const bookProperties = {
  id: { type: "integer" },
  title: { type: "string" },
  author: { type: "string" },
  publishedYear: { type: "integer" },
  isbn: { type: "string" },
  publisher: { type: "string" },
  edition: { type: "string" },
  description: { type: "string" },
  totalCopies: { type: "integer" },
  tags: { type: "array", items: { type: "string" } },
  status: { type: "string", enum: STATUS_ENUM },
  addedOn: { type: "string" },
  createdAt: { type: "string" },
  updatedAt: { type: "string" },
};

const bookResponse = { type: "object", properties: bookProperties };

const bookDetailResponse = {
  type: "object",
  properties: {
    ...bookProperties,
    onLoan: { type: "integer" },
    available: { type: "integer" },
  },
};

const loanResponse = {
  type: "object",
  properties: {
    id: { type: "integer" },
    bookId: { type: "integer" },
    memberId: { type: "integer" },
    memberName: { type: "string" },
    borrowedDate: { type: "string" },
    dueDate: { type: "string" },
    returnedDate: { type: ["string", "null"] },
    status: { type: "string", enum: ["ACTIVE", "OVERDUE", "RETURNED"] },
  },
};

const tagsSchema = {
  type: "array",
  items: { type: "string", minLength: 1, maxLength: 50 },
  uniqueItems: true,
};

const createBodyProperties = {
  title: { type: "string", minLength: 1, maxLength: 255 },
  author: { type: "string", minLength: 1, maxLength: 255 },
  isbn: { type: "string", minLength: 1, maxLength: 50 },
  publishedYear: { type: "integer", minimum: 1000, maximum: 2100 },
  publisher: { type: "string", maxLength: 255 },
  edition: { type: "string", maxLength: 255 },
  description: { type: "string" },
  totalCopies: { type: "integer", minimum: 1 },
  tags: tagsSchema,
  status: { type: "string", enum: STATUS_ENUM },
};

export const listBooksSchema = {
  querystring: {
    type: "object",
    properties: {
      q: { type: "string", maxLength: 255 },
      tag: { type: "string", maxLength: 50 },
      status: { type: "string", enum: STATUS_ENUM },
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 10 },
    },
    additionalProperties: false,
  },
  response: {
    [HttpCodes.Success]: {
      type: "object",
      properties: {
        data: { type: "array", items: bookResponse },
        total: { type: "integer" },
        page: { type: "integer" },
        limit: { type: "integer" },
      },
    },
  },
};

export const getBookSchema = {
  params: idParams,
  response: { [HttpCodes.Success]: bookDetailResponse },
};

export const getBookLoansSchema = {
  params: idParams,
  response: {
    [HttpCodes.Success]: {
      type: "object",
      properties: { data: { type: "array", items: loanResponse } },
    },
  },
};

export const createBookSchema = {
  body: {
    type: "object",
    required: ["title", "author", "isbn", "publishedYear", "totalCopies"],
    properties: createBodyProperties,
    additionalProperties: false,
  },
  response: { [HttpCodes.Created]: bookResponse },
};

export const updateBookSchema = {
  params: idParams,
  body: {
    type: "object",
    properties: createBodyProperties,
    minProperties: 1,
    additionalProperties: false,
  },
  response: { [HttpCodes.Success]: bookDetailResponse },
};

export const deleteBookSchema = {
  params: idParams,
};
