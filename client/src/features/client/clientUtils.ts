import type { Profile } from "../../types/domain";

export function maskLastFour(value?: string | number) {
  const text = String(value ?? "").replace(/\s+/g, "");
  if (!text) return "Not available";
  if (text.length <= 4) return text;
  return `${"•".repeat(Math.max(text.length - 4, 4))}${text.slice(-4)}`;
}

export function profileCompletion(profile?: Profile) {
  const fields = [
    profile?.fullName,
    profile?.email,
    profile?.mobile,
    profile?.dateOfBirth,
    profile?.address,
    profile?.pan,
    profile?.aadhaar,
    profile?.bankAccount,
    profile?.ifsc,
    profile?.nomineeName,
    profile?.nomineeRelationship,
    profile?.riskProfile
  ];
  const complete = fields.filter(Boolean).length;
  return Math.round((complete / fields.length) * 100);
}

export function statusText(value?: string | boolean) {
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (!value) return "Not available";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function exportCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

export function fileCategoryFolder(category: string) {
  const normalized = category.toLowerCase();
  if (normalized.includes("agreement")) return "Agreements";
  if (normalized.includes("bank") || normalized.includes("cheque")) return "Bank";
  if (normalized.includes("payment") || normalized.includes("receipt")) return "Investment Proofs";
  if (normalized.includes("support")) return "Support";
  if (normalized.includes("pan") || normalized.includes("aadhaar") || normalized.includes("kyc") || normalized.includes("address")) return "KYC";
  return "Other";
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}
