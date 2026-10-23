import { describe, it, expect } from "vitest";
import { buildApp } from "../src/app.js";

describe("Health Endpoint", () => {
  it("should return status ok with 200 code", async () => {
    const app = buildApp();
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });

    await app.close();
  });
});
