import { Router } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { requireMember } from "../middleware/auth.js";
import { logActivity } from "../services/activity.js";

export const workspaceSettingsRouter = Router();

// Renaming a workspace is an Admin/Owner action, enforced here on the server.
workspaceSettingsRouter.patch("/:workspaceId", requireMember("ADMIN"), async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(60) }).parse(req.body);
  const workspace = await db.workspace.update({ where: { id: req.workspaceId! }, data: { name } });
  await logActivity(req.workspaceId!, req.userId!, "renamed workspace to", "workspace", workspace.id, { name });
  res.json({ data: workspace });
});
