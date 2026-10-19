import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { notFound } from "../lib/errors.js";
import { requireMember } from "../middleware/auth.js";
import { logActivity } from "../services/activity.js";

const statusEnum = z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"]);
const body = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().max(1000).optional(),
  status: statusEnum.optional(),
  deadline: z.coerce.date().nullable().optional(),
});
const query = z.object({
  q: z.string().optional(),
  status: statusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const projectsRouter = Router({ mergeParams: true });
projectsRouter.use(requireMember());

projectsRouter.get("/", async (req, res) => {
  const { q, status, page, pageSize } = query.parse(req.query);
  const where = {
    workspaceId: req.workspaceId!,
    ...(status && { status }),
    ...(q && { name: { contains: q, mode: "insensitive" as const } }),
  };
  const [items, total] = await Promise.all([
    db.project.findMany({
      where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize,
      include: { _count: { select: { tasks: true } } },
    }),
    db.project.count({ where }),
  ]);
  const done = await db.task.groupBy({
    by: ["projectId"], where: { projectId: { in: items.map((p) => p.id) }, status: "DONE" }, _count: true,
  });
  const doneMap = new Map(done.map((d) => [d.projectId, d._count]));
  const data = items.map((p) => ({
    ...p,
    progress: p._count.tasks ? Math.round(((doneMap.get(p.id) ?? 0) / p._count.tasks) * 100) : 0,
  }));
  res.json({ data, meta: { page, pageSize, total } });
});

projectsRouter.post("/", async (req, res) => {
  const project = await db.project.create({ data: { ...body.parse(req.body), workspaceId: req.workspaceId! } });
  await logActivity(req.workspaceId!, req.userId!, "created", "project", project.id, { name: project.name });
  res.status(201).json({ data: project });
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await db.project.findFirst({ where: { id: String(req.params.id), workspaceId: req.workspaceId! } });
  if (!project) throw notFound("Project");
  res.json({ data: project });
});

projectsRouter.patch("/:id", async (req, res) => {
  const data = body.partial().parse(req.body);
  const { count } = await db.project.updateMany({ where: { id: String(req.params.id), workspaceId: req.workspaceId! }, data });
  if (!count) throw notFound("Project");
  await logActivity(req.workspaceId!, req.userId!, "updated", "project", String(req.params.id), data);
  res.json({ data: await db.project.findUnique({ where: { id: String(req.params.id) } }) });
});

// Only Owners/Admins may delete. Tasks and comments go with it via onDelete: Cascade.
projectsRouter.delete("/:id", requireMember("ADMIN"), async (req, res) => {
  const { count } = await db.project.deleteMany({ where: { id: String(req.params.id), workspaceId: req.workspaceId! } });
  if (!count) throw notFound("Project");
  await logActivity(req.workspaceId!, req.userId!, "deleted", "project", String(req.params.id));
  res.status(204).end();
});
