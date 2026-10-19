import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../lib/db.js";
import { AppError } from "../lib/errors.js";

export const accountRouter = Router();

accountRouter.patch("/profile", async (req, res) => {
  const { name } = z.object({ name: z.string().trim().min(2).max(60) }).parse(req.body);
  const user = await db.user.update({
    where: { id: req.userId! }, data: { name }, select: { id: true, name: true, email: true },
  });
  res.json({ data: { user } });
});

accountRouter.post("/password", async (req, res) => {
  const { currentPassword, newPassword } = z
    .object({ currentPassword: z.string().min(1), newPassword: z.string().min(8).max(100) })
    .parse(req.body);
  const user = await db.user.findUnique({ where: { id: req.userId! } });
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(400, "Current password is incorrect", "VALIDATION");
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  res.status(204).end();
});
