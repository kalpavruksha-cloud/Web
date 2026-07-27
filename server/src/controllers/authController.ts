import type { Request, Response } from "express";
import { appsScriptService } from "../services/appsScriptService.js";
import { ok, fail } from "../utils/apiResponse.js";
import { sessionCookieOptions, signSession } from "../middleware/auth.js";

export async function login(req: Request, res: Response) {
  const { identifier, password, remember, expectedRole } = req.body as { identifier: string; password: string; remember?: boolean; expectedRole?: "client" | "admin" };
  res.clearCookie("session", { path: "/" });
  const upstream = await appsScriptService.login(identifier, password, req.requestId, expectedRole);

  if (!upstream.success || !upstream.data?.user) {
    res.status(401).json(fail(upstream.error?.code ?? "LOGIN_FAILED", upstream.error?.details ?? "Invalid credentials", "Login failed", req.requestId));
    return;
  }

  const user = upstream.data.user;
  if (expectedRole && user.role !== expectedRole) {
    res.status(403).json(fail("WRONG_PORTAL_ROLE", expectedRole === "admin" ? "Use an admin account with Role = admin." : "Use a client account. Admin users must sign in from Admin Login.", "Login failed", req.requestId));
    return;
  }

  if (user.status !== "active") {
    res.status(403).json(fail("ACCOUNT_INACTIVE", "Your account is not active. Please contact support.", "Account inactive", req.requestId));
    return;
  }

  const token = signSession(user, remember);
  res.cookie("session", token, sessionCookieOptions(remember));
  res.json(ok({ user }, "Login successful", req.requestId));
}

export async function register(req: Request, res: Response) {
  const upstream = await appsScriptService.action<{ clientId: string; status: string }>("registerClient", req.body, req.requestId);

  if (!upstream.success || !upstream.data) {
    res.status(400).json(fail(upstream.error?.code ?? "REGISTRATION_FAILED", upstream.error?.details ?? "Registration could not be completed", "Registration failed", req.requestId));
    return;
  }

  res.status(201).json(ok(upstream.data, "Registration submitted", req.requestId));
}

export async function logout(req: Request, res: Response) {
  res.clearCookie("session", { path: "/" });
  res.json(ok({ loggedOut: true }, "Logged out", req.requestId));
}

export async function session(req: Request, res: Response) {
  res.json(ok({ user: req.user }, "Session active", req.requestId));
}
