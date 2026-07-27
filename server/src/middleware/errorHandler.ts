import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger.js";
import { fail } from "../utils/apiResponse.js";

export function notFound(req: Request, res: Response) {
  res.status(404).json(fail("NOT_FOUND", `${req.method} ${req.originalUrl} was not found`, "Not found", req.requestId));
}

export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction) {
  void next;
  if (error.name === "ValidationError") {
    res.status(400).json(fail("VALIDATION_ERROR", error.message, "Invalid request", req.requestId));
    return;
  }

  logger.error({ err: error, requestId: req.requestId }, "Unhandled request error");
  res.status(500).json(fail("SERVER_ERROR", "An unexpected server error occurred", "Operation failed", req.requestId));
}
