import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { AppError, notFound } from "../lib/errors.js";
import { requireMember } from "../middleware/auth.js";
import { logActivity } from "../services/activity.js";

const status = z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]);
const create = z.object({
  projectId: z.string(),
  title: z.string().trim().min(2).max(120),
  description: z.string().max(4000).optional(),
  status: status.optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  labels: z.array(z.string().max(24)).max(8).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
});
const update = create.omit({ projectId: true }).partial().extend({ position: z.number().int().min(0).optional() });

export const tasksRouter = Router({ mergeParams: true });
tasksRouter.use(requireMember());

// Every task is reached through its project, and the project is checked against the workspace.
const scoped = (workspaceId: string) => ({ project: { workspaceId } });

// completedAt powers the weekly completion chart: set on DONE, cleared when moved back.
const completion = (s?: string) => (s === "DONE" ? { completedAt: new Date() } : s ? { completedAt: null } : {});

async function assertAssignee(workspaceId: string, assigneeId?: string | null) {
  if (!assigneeId) return;
  const m = await db.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: assigneeId, workspaceId } } });
  if (!m) throw new AppError(400, "Assignee must be a workspace member", "VALIDATION");
}

async function findTask(workspaceId: string, id: string) {
  const task = await db.task.findFirst({ where: { id, ...scoped(workspaceId) } });
  if (!task) throw notFound("Task");
  return task;
}

tasksRouter.get("/", async (req, res) => {
  const f = z.object({ projectId: z.string().optional(), status: status.optional(), assigneeId: z.string().optional() }).parse(req.query);
  const data = await db.task.findMany({
    where: { ...scoped(req.workspaceId!), ...f },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    include: { assignee: { select: { id: true, name: true } }, _count: { select: { comments: true } } },
  });
  res.json({ data });
});

tasksRouter.post("/", async (req, res) => {
  const input = create.parse(req.body);
  const project = await db.project.findFirst({ where: { id: input.projectId, workspaceId: req.workspaceId! } });
  if (!project) throw notFound("Project");
  await assertAssignee(req.workspaceId!, input.assigneeId);
  const task = await db.task.create({ data: { ...input, ...completion(input.status) } });
  await logActivity(req.workspaceId!, req.userId!, "created", "task", task.id, { title: task.title });
  res.status(201).json({ data: task });
});

// Also used by the Kanban board: PATCH { status, position } when a card is dropped.
tasksRouter.patch("/:id", async (req, res) => {
  const input = update.parse(req.body);
  await assertAssignee(req.workspaceId!, input.assigneeId);
  const { count } = await db.task.updateMany({
    where: { id: req.params.id, ...scoped(req.workspaceId!) },
    data: { ...input, ...completion(input.status) },
  });
  if (!count) throw notFound("Task");
  await logActivity(req.workspaceId!, req.userId!, input.status ? "moved" : "updated", "task", req.params.id, input);
  res.json({ data: await db.task.findUnique({ where: { id: req.params.id } }) });
});

tasksRouter.delete("/:id", async (req, res) => {
  const { count } = await db.task.deleteMany({ where: { id: req.params.id, ...scoped(req.workspaceId!) } });
  if (!count) throw notFound("Task");
  await logActivity(req.workspaceId!, req.userId!, "deleted", "task", req.params.id);
  res.status(204).end();
});

tasksRouter.get("/:id/comments", async (req, res) => {
  await findTask(req.workspaceId!, req.params.id);
  const data = await db.comment.findMany({
    where: { taskId: req.params.id }, orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true } } },
  });
  res.json({ data });
});

tasksRouter.post("/:id/comments", async (req, res) => {
  const { body } = z.object({ body: z.string().trim().min(1).max(2000) }).parse(req.body);
  await findTask(req.workspaceId!, req.params.id);
  const comment = await db.comment.create({
    data: { body, taskId: req.params.id, authorId: req.userId! },
    include: { author: { select: { id: true, name: true } } },
  });
  await logActivity(req.workspaceId!, req.userId!, "commented", "task", req.params.id);
  res.status(201).json({ data: comment });
});
