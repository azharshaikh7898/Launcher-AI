import { Router } from "express";
import { db } from "../lib/db.js";
import { requireMember } from "../middleware/auth.js";

export const dashboardRouter = Router({ mergeParams: true });
dashboardRouter.use(requireMember());

// All numbers come straight from the database for the caller's workspace.
dashboardRouter.get("/", async (req, res) => {
  const scope = { project: { workspaceId: req.workspaceId! } };
  const now = new Date();
  const [activeProjects, byStatus, overdue, upcoming, activity] = await Promise.all([
    db.project.count({ where: { workspaceId: req.workspaceId!, status: "ACTIVE" } }),
    db.task.groupBy({ by: ["status"], where: scope, _count: true }),
    db.task.count({ where: { ...scope, status: { not: "DONE" }, dueDate: { lt: now } } }),
    db.task.findMany({ where: { ...scope, status: { not: "DONE" }, dueDate: { gte: now } }, orderBy: { dueDate: "asc" }, take: 5 }),
    db.activityLog.findMany({ where: { workspaceId: req.workspaceId! }, orderBy: { createdAt: "desc" }, take: 10, include: { actor: { select: { name: true } } } }),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const total = byStatus.reduce((n, s) => n + s._count, 0);
  const done = counts.DONE ?? 0;
  res.json({ data: { activeProjects, completedTasks: done, overdueTasks: overdue, completionRate: total ? Math.round((done / total) * 100) : 0, statusDistribution: counts, upcoming, activity } });
});
