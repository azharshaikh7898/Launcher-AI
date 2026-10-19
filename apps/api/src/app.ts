import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./lib/env.js";
import { requireAuth } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./routes/auth.js";
import { workspacesRouter } from "./routes/workspaces.js";
import { projectsRouter } from "./routes/projects.js";
import { tasksRouter } from "./routes/tasks.js";
import { dashboardRouter } from "./routes/dashboard.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1); // Render sits behind a proxy
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 50, standardHeaders: true }), authRouter);

  app.use("/api/workspaces", requireAuth, workspacesRouter);
  const ws = "/api/workspaces/:workspaceId";
  app.use(`${ws}/projects`, requireAuth, projectsRouter);
  app.use(`${ws}/tasks`, requireAuth, tasksRouter);
  app.use(`${ws}/dashboard`, requireAuth, dashboardRouter);

  app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));
  app.use(errorHandler);
  return app;
}
