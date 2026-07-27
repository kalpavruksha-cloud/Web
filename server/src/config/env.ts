import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../.env" });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  APPS_SCRIPT_URL: z.string().url(),
  SPREADSHEET_ID: z.string().min(10),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ALLOWED_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3000"),
  APPS_SCRIPT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  LOG_LEVEL: z.string().default("info"),
  SUPPORT_EMAIL: z.string().default("support@kalpavrukshawealth.com"),
  SUPPORT_PHONE: z.string().default("+91 00000 00000"),
  SUPPORT_WHATSAPP_URL: z.string().url().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = {
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === "production",
  corsOrigins: [
    ...parsed.data.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    parsed.data.CLIENT_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  ].filter((origin, index, origins): origin is string => Boolean(origin) && origins.indexOf(origin) === index)
};
