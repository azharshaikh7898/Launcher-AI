import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// These run without a database: they cover the layers that reject a request before any query.
const app = createApp();

describe("API guards", () => {
  it("health check responds", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
  });
  it("rejects unauthenticated access to workspace data", async () => {
    const res = await request(app).get("/api/workspaces/abc/projects");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
  it("validates registration input", async () => {
    const res = await request(app).post("/api/auth/register").send({ email: "nope", password: "short" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION");
  });
  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
  });
});
