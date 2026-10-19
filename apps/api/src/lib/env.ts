import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
});

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test",
  JWT_SECRET: process.env.JWT_SECRET ?? (process.env.NODE_ENV === "test" ? "test-secret-test-secret-test-secret-123" : undefined),
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});
