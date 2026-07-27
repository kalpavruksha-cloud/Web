import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../.env" });
dotenv.config();

const normalizedProcessEnv = {
  ...process.env,
  NODE_ENV: normalizeNodeEnv(process.env.NODE_ENV),
  CLIENT_URL: process.env.CLIENT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173"),
  SUPPORT_WHATSAPP_URL: emptyToUndefined(process.env.SUPPORT_WHATSAPP_URL)
};

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

const parsed = envSchema.safeParse(normalizedProcessEnv);
const configError = parsed.success
  ? null
  : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");

const data = parsed.success ? parsed.data : fallbackEnv();

export const env = {
  ...data,
  isConfigValid: parsed.success,
  configError,
  isProduction: data.NODE_ENV === "production",
  corsOrigins: [
    ...data.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
    data.CLIENT_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  ].filter((origin, index, origins): origin is string => Boolean(origin) && origins.indexOf(origin) === index)
};

function normalizeNodeEnv(value?: string) {
  const normalized = String(value || (process.env.VERCEL ? "production" : "development")).toLowerCase();
  return ["development", "test", "production"].includes(normalized) ? normalized : "production";
}

function emptyToUndefined(value?: string) {
  return value && value.trim() ? value.trim() : undefined;
}

function fallbackEnv(): z.infer<typeof envSchema> {
  return {
    NODE_ENV: normalizeNodeEnv(process.env.NODE_ENV) as "development" | "test" | "production",
    PORT: Number(process.env.PORT || 8080),
    CLIENT_URL: process.env.CLIENT_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173"),
    APPS_SCRIPT_URL: process.env.APPS_SCRIPT_URL || "",
    SPREADSHEET_ID: process.env.SPREADSHEET_ID || "",
    JWT_SECRET: process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32 ? process.env.JWT_SECRET : "invalid_environment_jwt_secret_placeholder_value",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS || process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000",
    APPS_SCRIPT_TIMEOUT_MS: Number(process.env.APPS_SCRIPT_TIMEOUT_MS || 15000),
    LOG_LEVEL: process.env.LOG_LEVEL || "info",
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "support@kalpavrukshawealth.com",
    SUPPORT_PHONE: process.env.SUPPORT_PHONE || "+91 00000 00000",
    SUPPORT_WHATSAPP_URL: emptyToUndefined(process.env.SUPPORT_WHATSAPP_URL)
  };
}
