import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";
import { db } from "../lib/db.js";
import type { Role } from "@prisma/client";

export const COOKIE = "lb_session";

declare module "express-serve-static-core" {
  interface Request { userId?: string; role?: Role; workspaceId?: string }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new AppError(401, "Not authenticated", "UNAUTHENTICATED");
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    throw new AppError(401, "Session expired", "UNAUTHENTICATED");
  }
}

const rank: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

/** Workspace isolation: membership is looked up server-side, never trusted from the client. */
export function requireMember(min: Role = "MEMBER") {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const workspaceId = String(req.params.workspaceId);
    const m = await db.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: req.userId!, workspaceId } },
    });
    if (!m) throw new AppError(404, "Workspace not found", "NOT_FOUND");
    if (rank[m.role] < rank[min]) throw new AppError(403, "Insufficient permissions", "FORBIDDEN");
    req.role = m.role;
    req.workspaceId = workspaceId;
    next();
  };
}
