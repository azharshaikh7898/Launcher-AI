import { Router } from "express";
import type { Response } from "express";
import { z } from "zod";
import { db } from "../lib/db.js";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";
import { COOKIE, requireAuth } from "../middleware/auth.js";
import * as auth from "../services/auth.service.js";

const creds = z.object({ email: z.string().email(), password: z.string().min(8).max(100) });
const registerBody = creds.extend({ name: z.string().trim().min(2).max(60) });

const prod = env.NODE_ENV === "production";
// Vercel (web) and Render (api) are different sites, so prod needs SameSite=None + Secure.
const cookieOpts = { httpOnly: true, secure: prod, sameSite: (prod ? "none" : "lax") as "none" | "lax" };
const setSession = (res: Response, userId: string) =>
  res.cookie(COOKIE, auth.signToken(userId), { ...cookieOpts, maxAge: 7 * 864e5 });

const publicUser = (u: { id: string; name: string; email: string }) => ({ id: u.id, name: u.name, email: u.email });

export const authRouter = Router();

authRouter.post("/register", async (req, res) => {
  const { user, workspace } = await auth.register(registerBody.parse(req.body));
  setSession(res, user.id);
  res.status(201).json({ data: { user: publicUser(user), workspace } });
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = creds.parse(req.body);
  const user = await auth.login(email, password);
  setSession(res, user.id);
  res.json({ data: { user: publicUser(user) } });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE, cookieOpts);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await db.user.findUnique({
    where: { id: req.userId! },
    include: { memberships: { include: { workspace: true } } },
  });
  if (!user) throw new AppError(401, "Session no longer valid", "UNAUTHENTICATED");
  res.json({ data: { user: publicUser(user), workspaces: user.memberships.map((m) => ({ ...m.workspace, role: m.role })) } });
});
