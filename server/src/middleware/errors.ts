import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: "Not Found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Postgres 22P02 = invalid text representation (e.g. a non-uuid id in the
  // URL, typically a stale client-local id) — a caller error, not a crash.
  if ((err as any)?.code === "22P02") {
    return res.status(400).json({ error: "Invalid id — the record may not have been saved to the server yet. Refresh and try again." });
  }
  console.error("[errorHandler]", err);
  res.status(500).json({ error: "InternalServerError" });
}
