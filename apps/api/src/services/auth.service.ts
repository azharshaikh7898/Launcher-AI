import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../lib/db.js";
import { env } from "../lib/env.js";
import { AppError } from "../lib/errors.js";

export const signToken = (userId: string) => jwt.sign({ sub: userId }, env.JWT_SECRET, { expiresIn: "7d" });

export async function register(input: { name: string; email: string; password: string }) {
  const email = input.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new AppError(409, "Email already registered", "CONFLICT");
  const passwordHash = await bcrypt.hash(input.password, 12);
  // One transaction: a user never exists without a first workspace they own.
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { email, name: input.name, passwordHash } });
    const workspace = await tx.workspace.create({
      data: { name: `${input.name}'s Workspace`, members: { create: { userId: user.id, role: "OWNER" } } },
    });
    return { user, workspace };
  });
}

export async function login(emailRaw: string, password: string) {
  const user = await db.user.findUnique({ where: { email: emailRaw.toLowerCase() } });
  // Same message for unknown email and wrong password: no account enumeration.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, "Invalid email or password", "UNAUTHENTICATED");
  return user;
}
