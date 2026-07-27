export function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "").replace(/[^a-z0-9]/g, "");
}

export function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return 0;
  const cleaned = value.replace(/[₹,\s%]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  return ["true", "yes", "y", "1", "read", "active"].includes(value.trim().toLowerCase());
}

export function toDateString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString();
}

export function normalizeStatus(value: unknown, fallback = "pending"): string {
  if (!value) return fallback;
  return String(value).trim().toLowerCase().replace(/\s+/g, "_");
}

export function normalizeClientId(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}
