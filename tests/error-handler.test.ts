import { describe, it, expect, vi } from "vitest";

// Mock mysql2/promise for app initialization
vi.mock("mysql2/promise", () => ({
  default: {
    createPool: vi.fn(() => ({
      getConnection: vi.fn().mockResolvedValue({
        ping: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
      }),
      end: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

import { buildApp } from "../src/app.js";
import { NotFoundError, ConflictError } from "../src/common/errors/app-error.js";

describe("Shared Error Handler & Request ID Plugins", () => {
  it("formats AppError into standardized error envelope", async () => {
    const app = buildApp();

    app.get("/test-not-found", async () => {
      throw new NotFoundError("Book with ID 999 not found", "BOOK_NOT_FOUND");
    });

    const response = await app.inject({
      method: "GET",
      url: "/test-not-found",
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["x-request-id"]).toBeDefined();

    const body = response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("BOOK_NOT_FOUND");
    expect(body.error.message).toBe("Book with ID 999 not found");
    expect(body.error.requestId).toBe(response.headers["x-request-id"]);

    await app.close();
  });

  it("formats ConflictError with details", async () => {
    const app = buildApp();

    app.get("/test-conflict", async () => {
      throw new ConflictError(
        "COPIES_LESS_THAN_ACTIVE_LOANS",
        "Cannot reduce totalCopies below active loans",
        { requestedTotalCopies: 2, activeLoansCount: 3 }
      );
    });

    const response = await app.inject({
      method: "GET",
      url: "/test-conflict",
    });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error.code).toBe("COPIES_LESS_THAN_ACTIVE_LOANS");
    expect(body.error.details).toEqual({
      requestedTotalCopies: 2,
      activeLoansCount: 3,
    });

    await app.close();
  });

  it("formats 404 Route Not Found into standard envelope", async () => {
    const app = buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/non-existent-route",
    });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
    expect(body.error.requestId).toBeDefined();

    await app.close();
  });
});
