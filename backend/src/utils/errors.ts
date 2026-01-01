import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({ error: "Route not found" });
};

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.errors });
    return;
  }
  const status = typeof (err as { status?: number }).status === "number" ? (err as { status?: number }).status : 500;
  const message = (err as { message?: string }).message || "Server error";
  res.status(status).json({ error: message });
};