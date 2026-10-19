import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();
const rand = () => Math.random().toString(36).slice(2, 8);

async function signup() {
  const agent = request.agent(app);
  const email = `user-${rand()}@test.dev`;
  const res = await agent.post("/api/auth/register").send({ name: "Test User", email, password: "password123" });
  expect(res.status).toBe(201);
  return { agent, email, wid: res.body.data.workspace.id as string };
}

describe("account settings", () => {
  it("updates the profile name and validates it", async () => {
    const u = await signup();
    expect((await u.agent.patch("/api/account/profile").send({ name: "x" })).status).toBe(400);
    const res = await u.agent.patch("/api/account/profile").send({ name: "Renamed User" });
    expect(res.status).toBe(200);
    expect((await u.agent.get("/api/auth/me")).body.data.user.name).toBe("Renamed User");
  });

  it("changes the password only with the correct current password", async () => {
    const u = await signup();
    const wrong = await u.agent.post("/api/account/password").send({ currentPassword: "nope-nope", newPassword: "brand-new-pass" });
    expect(wrong.status).toBe(400);
    expect((await u.agent.post("/api/account/password").send({ currentPassword: "password123", newPassword: "short" })).status).toBe(400);
    expect((await u.agent.post("/api/account/password").send({ currentPassword: "password123", newPassword: "brand-new-pass" })).status).toBe(204);
    expect((await request(app).post("/api/auth/login").send({ email: u.email, password: "brand-new-pass" })).status).toBe(200);
    expect((await request(app).post("/api/auth/login").send({ email: u.email, password: "password123" })).status).toBe(401);
  });

  it("lets an owner rename the workspace but not a plain member", async () => {
    const owner = await signup();
    const member = await signup();
    await owner.agent.post(`/api/workspaces/${owner.wid}/members`).send({ email: member.email });
    const denied = await member.agent.patch(`/api/workspaces/${owner.wid}`).send({ name: "Hijacked" });
    expect(denied.status).toBe(403);
    const ok = await owner.agent.patch(`/api/workspaces/${owner.wid}`).send({ name: "Renamed Team" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.name).toBe("Renamed Team");
    const activity = await owner.agent.get(`/api/workspaces/${owner.wid}/activity`);
    expect(activity.body.data[0].action).toBe("renamed workspace to");
  });
});
