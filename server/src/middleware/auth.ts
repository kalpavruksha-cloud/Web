import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role, User } from "../types/domain.js";
import { fail } from "../utils/apiResponse.js";

type JwtPayload = User & { iat: number; exp: number };

export function signSession(user: User, remember = false): string {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: (remember ? "30d" : env.JWT_EXPIRES_IN) as SignOptions["expiresIn"] });
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session || parseBearer(req.header("authorization"));
  if (!token) {
    res.status(401).json(fail("UNAUTHORIZED", "Please sign in to continue. Admin diagnostics require an admin session cookie.", "Unauthorized", req.requestId));
    return;
  }

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json(fail("SESSION_EXPIRED", "Your session has expired. Please sign in again.", "Unauthorized", req.requestId));
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json(fail("FORBIDDEN", "You do not have permission to perform this action", "Permission denied", req.requestId));
      return;
    }
    next();
  };
}

export function clientScope(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role === "admin") {
    next();
    return;
  }
  const targetClientId = req.params.clientId || req.query.clientId || req.body?.clientId;
  if (targetClientId && String(targetClientId).toUpperCase() !== String(req.user?.clientId).toUpperCase()) {
    res.status(403).json(fail("CLIENT_SCOPE_VIOLATION", "Clients can only access their own records", "Permission denied", req.requestId));
    return;
  }
  next();
}

export function sessionCookieOptions(remember = false) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" as const : "lax" as const,
    maxAge: remember ? 1000 * 60 * 60 * 24 * 30 : 1000 * 60 * 60 * 8,
    path: "/"
  };
}

function parseBearer(value?: string): string | undefined {
  if (!value?.startsWith("Bearer ")) return undefined;
  return value.slice("Bearer ".length);
}
