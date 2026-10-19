import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// These need a real Postgres (DATABASE_URL) with migrations applied. CI provides one.
const app = createApp();
const rand = () => Math.random().toString(36).slice(2, 8);

async function signup() {
  const agent = request.agent(app);
  const email = `user-${rand()}@test.dev`;
  const res = await agent.post("/api/auth/register").send({ name: "Test User", email, password: "password123" });
  expect(res.status).toBe(201);
  return { agent, email, id: res.body.data.user.id as string, wid: res.body.data.workspace.id as string };
}
const mkProject = async (u: Awaited<ReturnType<typeof signup>>, name = "Project") =>
  (await u.agent.post(`/api/workspaces/${u.wid}/projects`).send({ name })).body.data.id as string;

describe("authentication", () => {
  it("rejects duplicate emails and wrong passwords", async () => {
    const u = await signup();
    const dup = await request(app).post("/api/auth/register").send({ name: "Dup", email: u.email, password: "password123" });
    expect(dup.status).toBe(409);
    const bad = await request(app).post("/api/auth/login").send({ email: u.email, password: "wrong-password" });
    expect(bad.status).toBe(401);
  });
  it("sets an HTTP-only cookie, serves /me, and logs out", async () => {
    const email = `user-${rand()}@test.dev`;
    const agent = request.agent(app);
    const reg = await agent.post("/api/auth/register").send({ name: "Cookie Test", email, password: "password123" });
    expect(String(reg.headers["set-cookie"])).toContain("HttpOnly");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});

describe("projects and tasks", () => {
  it("supports project CRUD with validation", async () => {
    const u = await signup();
    const base = `/api/workspaces/${u.wid}/projects`;
    expect((await u.agent.post(base).send({ name: "x" })).status).toBe(400);
    const id = await mkProject(u, "Website");
    expect((await u.agent.get(base)).body.data).toHaveLength(1);
    const patched = await u.agent.patch(`${base}/${id}`).send({ status: "ON_HOLD" });
    expect(patched.body.data.status).toBe("ON_HOLD");
    expect((await u.agent.delete(`${base}/${id}`)).status).toBe(204);
    expect((await u.agent.get(`${base}/${id}`)).status).toBe(404);
  });
  it("supports task CRUD, completion timestamps and assignee checks", async () => {
    const u = await signup();
    const other = await signup();
    const projectId = await mkProject(u);
    const base = `/api/workspaces/${u.wid}/tasks`;
    const created = await u.agent.post(base).send({ projectId, title: "Write tests" });
    expect(created.status).toBe(201);
    const id = created.body.data.id as string;
    const moved = await u.agent.patch(`${base}/${id}`).send({ status: "DONE" });
    expect(moved.body.data.completedAt).not.toBeNull();
    const back = await u.agent.patch(`${base}/${id}`).send({ status: "TODO" });
    expect(back.body.data.completedAt).toBeNull();
    const badAssignee = await u.agent.post(base).send({ projectId, title: "Nope", assigneeId: other.id });
    expect(badAssignee.status).toBe(400);
    const comment = await u.agent.post(`${base}/${id}/comments`).send({ body: "Looks good" });
    expect(comment.status).toBe(201);
    expect((await u.agent.delete(`${base}/${id}`)).status).toBe(204);
  });
});

describe("workspace isolation and roles", () => {
  it("hides one workspace's data from another user", async () => {
    const a = await signup();
    const b = await signup();
    const projectId = await mkProject(a);
    const taskRes = await a.agent.post(`/api/workspaces/${a.wid}/tasks`).send({ projectId, title: "Secret task" });
    const taskId = taskRes.body.data.id as string;
    for (const path of ["projects", "tasks", "dashboard", `tasks/${taskId}/comments`]) {
      expect((await b.agent.get(`/api/workspaces/${a.wid}/${path}`)).status).toBe(404);
    }
    // Using your OWN workspace id with someone else's record id must not leak or modify it.
    expect((await b.agent.get(`/api/workspaces/${b.wid}/projects/${projectId}`)).status).toBe(404);
    expect((await b.agent.patch(`/api/workspaces/${b.wid}/tasks/${taskId}`).send({ title: "Hacked" })).status).toBe(404);
    expect((await b.agent.delete(`/api/workspaces/${b.wid}/projects/${projectId}`)).status).toBe(404);
    expect((await a.agent.get(`/api/workspaces/${a.wid}/tasks`)).body.data[0].title).toBe("Secret task");
  });
  it("enforces roles: members cannot delete projects or add members", async () => {
    const owner = await signup();
    const member = await signup();
    const added = await owner.agent.post(`/api/workspaces/${owner.wid}/members`).send({ email: member.email });
    expect(added.status).toBe(201);
    const projectId = await mkProject(owner);
    expect((await member.agent.get(`/api/workspaces/${owner.wid}/projects`)).status).toBe(200);
    expect((await member.agent.delete(`/api/workspaces/${owner.wid}/projects/${projectId}`)).status).toBe(403);
    expect((await member.agent.post(`/api/workspaces/${owner.wid}/members`).send({ email: owner.email })).status).toBe(403);
    expect((await owner.agent.delete(`/api/workspaces/${owner.wid}/members/${owner.id}`)).status).toBe(403);
  });
});

describe("dashboard and errors", () => {
  it("calculates metrics from real records", async () => {
    const u = await signup();
    const projectId = await mkProject(u);
    const base = `/api/workspaces/${u.wid}/tasks`;
    await u.agent.post(base).send({ projectId, title: "Done task", status: "DONE" });
    await u.agent.post(base).send({ projectId, title: "Late task", dueDate: new Date(Date.now() - 864e5).toISOString() });
    const d = (await u.agent.get(`/api/workspaces/${u.wid}/dashboard`)).body.data;
    expect(d.activeProjects).toBe(1);
    expect(d.completedTasks).toBe(1);
    expect(d.overdueTasks).toBe(1);
    expect(d.completionRate).toBe(50);
    expect(d.weeklyCompletion).toHaveLength(7);
  });
  it("returns 401 without a session and 400 for malformed JSON", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    const res = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});
