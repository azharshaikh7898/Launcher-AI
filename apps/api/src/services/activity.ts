import { db } from "../lib/db.js";

export const logActivity = (workspaceId: string, actorId: string, action: string, entityType: string, entityId: string, meta?: object) =>
  db.activityLog.create({ data: { workspaceId, actorId, action, entityType, entityId, meta } });
