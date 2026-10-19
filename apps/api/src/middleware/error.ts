import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: "VALIDATION", message: "Invalid request", details: err.flatten().fieldErrors } });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  // body-parser throws this for malformed JSON; that is a client error, not a 500.
  if (typeof err === "object" && err !== null && (err as { type?: string }).type === "entity.parse.failed") {
    return res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
}
