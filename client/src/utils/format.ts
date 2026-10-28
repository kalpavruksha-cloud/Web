export const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function formatCurrency(value?: number) {
  return currency.format(value ?? 0);
}

export function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatPayoutDate(value?: string | null) {
  if (value === "") return "Not set";
  if (value === undefined || value === null) return "Not available";
  if (/^\d{1,2}$/.test(value)) {
    const day = Number(value);
    if (day < 1 || day > 31) return "Not available";
    const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[day % 10] ?? "th");
    return `${day}${suffix} of each month`;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDate(value) : "Not available";
}

export function titleCase(value?: string) {
  if (!value) return "Not available";
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
