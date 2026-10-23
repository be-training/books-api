import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockExecute, mockEnd, mockGetConnection, mockPing, mockRelease } = vi.hoisted(() => {
  const execute = vi.fn();
  const end = vi.fn().mockResolvedValue(undefined);
  const ping = vi.fn().mockResolvedValue(undefined);
  const release = vi.fn();
  const getConnection = vi.fn().mockResolvedValue({
    ping,
    release,
  });
  return {
    mockExecute: execute,
    mockEnd: end,
    mockGetConnection: getConnection,
    mockPing: ping,
    mockRelease: release,
  };
});

vi.mock("mysql2/promise", () => ({
  default: {
    createPool: vi.fn(() => ({
      execute: mockExecute,
      end: mockEnd,
      getConnection: mockGetConnection,
    })),
  },
}));

import { buildApp } from "../src/app.js";

describe("Fastify Database Plugin (Standard Fastify Lifecycle)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies connection ping and decorates Fastify instance with database pool", async () => {
    const app = buildApp();
    await app.ready();

    expect(mockGetConnection).toHaveBeenCalledTimes(1);
    expect(mockPing).toHaveBeenCalledTimes(1);
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(app.hasDecorator("db")).toBe(true);
    expect(app.db).toBeDefined();

    await app.close();
  });

  it("allows querying via app.db decorator", async () => {
    const app = buildApp();
    await app.ready();

    const mockRows = [{ id: 1, title: "The Pragmatic Programmer" }];
    mockExecute.mockResolvedValueOnce([mockRows, []]);

    const [rows] = await app.db.execute("SELECT * FROM books WHERE id = ?", [1]);
    expect(mockExecute).toHaveBeenCalledWith("SELECT * FROM books WHERE id = ?", [1]);
    expect(rows).toEqual(mockRows);

    await app.close();
  });

  it("automatically closes database pool on app.close() via Fastify onClose hook", async () => {
    const app = buildApp();
    await app.ready();

    expect(mockEnd).not.toHaveBeenCalled();

    await app.close();

    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});
