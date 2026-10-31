import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]', "password", "*.password", "currentPassword", "newPassword", "confirmPassword", "*.currentPassword", "*.newPassword", "*.confirmPassword", "req.body.currentPassword", "req.body.newPassword", "req.body.confirmPassword", "req.query.currentPassword", "req.query.newPassword", "req.query.confirmPassword", "pan", "aadhaar", "*.pan", "*.aadhaar", "req.body.pan", "req.body.aadhaar", "req.query.pan", "req.query.aadhaar", "kycProof", "*.kycProof"],
    censor: "[redacted]"
  },
  transport: env.NODE_ENV === "development" ? { target: "pino-pretty", options: { colorize: true } } : undefined
});
