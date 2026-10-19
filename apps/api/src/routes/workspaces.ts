import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { AppError, notFound } from "../lib/errors.js";
import { requireMember } from "../middleware/auth.js";
import { logActivity } from "../services/activity.js";

export const workspacesRouter = Router();

workspacesRouter.post("/", async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(60) }).parse(req.body);
  const workspace = await db.workspace.create({
    data: { name, members: { create: { userId: req.userId!, role: "OWNER" } } },
  });
  res.status(201).json({ data: workspace });
});

workspacesRouter.get("/:workspaceId/members", requireMember(), async (req, res) => {
  const rows = await db.workspaceMember.findMany({
    where: { workspaceId: req.workspaceId! }, orderBy: { joinedAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.json({ data: rows.map((m) => ({ ...m.user, role: m.role, joinedAt: m.joinedAt })) });
});

// Simple invite flow: an Admin adds an existing user by email. Email-based invite links are a future improvement.
workspacesRouter.post("/:workspaceId/members", requireMember("ADMIN"), async (req, res) => {
  const { email, role } = z.object({ email: z.string().email(), role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER") }).parse(req.body);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new AppError(404, "No user with that email. They need to register first.", "NOT_FOUND");
  const exists = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: user.id, workspaceId: req.workspaceId! } } });
  if (exists) throw new AppError(409, "Already a member of this workspace", "CONFLICT");
  await db.workspaceMember.create({ data: { userId: user.id, workspaceId: req.workspaceId!, role } });
  await logActivity(req.workspaceId!, req.userId!, "added member", "member", user.id, { name: user.name, role });
  res.status(201).json({ data: { id: user.id, name: user.name, email: user.email, role } });
});

workspacesRouter.delete("/:workspaceId/members/:userId", requireMember("ADMIN"), async (req, res) => {
  const target = await db.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: req.params.userId, workspaceId: req.workspaceId! } },
  });
  if (!target) throw notFound("Member");
  if (target.role === "OWNER") throw new AppError(403, "The workspace owner cannot be removed", "FORBIDDEN");
  await db.workspaceMember.delete({ where: { id: target.id } });
  await logActivity(req.workspaceId!, req.userId!, "removed member", "member", req.params.userId);
  res.status(204).end();
});

workspacesRouter.get("/:workspaceId/activity", requireMember(), async (req, res) => {
  const { page, pageSize } = z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  }).parse(req.query);
  const where = { workspaceId: req.workspaceId! };
  const [data, total] = await Promise.all([
    db.activityLog.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      include: { actor: { select: { name: true } } },
    }),
    db.activityLog.count({ where }),
  ]);
  res.json({ data, meta: { page, pageSize, total } });
});
