import type { AdminFinancialAnalytics } from "../../types/domain";

const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2000, index, 1))));

export function monthlyChartSeries(points: AdminFinancialAnalytics["investmentMonths"], year: number, currentYear: number, currentMonth: number) {
  const count = year === currentYear ? currentMonth : 12;
  const amounts = new Map(points.map((point) => [point.month, point.amount]));
  return Array.from({ length: count }, (_, index) => ({
    label: months[index], amount: amounts.get(`${year}-${String(index + 1).padStart(2, "0")}`) ?? 0
  }));
}

export function dailyChartSeries(points: AdminFinancialAnalytics["withdrawalDays"], year: number, month: number, asOf: string) {
  const indiaDay = new Date(new Date(asOf).getTime() + 19800000).toISOString().slice(0, 10);
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const count = prefix === indiaDay.slice(0, 7) ? Number(indiaDay.slice(8, 10)) : new Date(Date.UTC(year, month, 0)).getUTCDate();
  const amounts = new Map(points.map((point) => [point.date, point.amount]));
  return Array.from({ length: count }, (_, index) => ({ label: String(index + 1), amount: amounts.get(`${prefix}-${String(index + 1).padStart(2, "0")}`) ?? 0 }));
}

export const monthOptions = months;

export function chartYears(points: Array<{ month: string; amount: number }>, currentYear: number) {
  return [...new Set([currentYear, ...points.map((row) => Number(row.month.slice(0, 4))).filter((year) => Number.isInteger(year) && year >= 1900 && year <= currentYear)])].sort((a, b) => b - a);
}

export function latestActivityYear(points: Array<{ month: string; amount: number }>, currentYear: number) {
  return chartYears(points, currentYear).find((year) => points.some((row) => Number(row.month.slice(0, 4)) === year && row.amount > 0)) ?? currentYear;
}

export function portfolioChartSeries(analytics: AdminFinancialAnalytics) {
  const values = new Map((analytics.portfolioHistoryMonths ?? analytics.portfolioMonths ?? []).map((point) => [point.month, point.amount]));
  return Array.from({ length: 24 }, (_, index) => {
    const date = new Date(Date.UTC(analytics.currentYear, analytics.currentMonth - 24 + index, 1));
    const month = date.toISOString().slice(0, 7);
    return { month, label: new Intl.DateTimeFormat("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }).format(date), amount: values.get(month) ?? null };
  });
}
