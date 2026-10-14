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
