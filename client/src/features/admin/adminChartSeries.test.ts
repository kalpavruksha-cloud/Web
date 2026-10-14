import { describe, expect, it } from "vitest";
import { dailyChartSeries, monthlyChartSeries } from "./adminChartSeries";

describe("admin financial chart periods", () => {
  it("shows January through the current month with genuine zero-activity months", () => {
    const points = monthlyChartSeries([{ month: "2025-01", amount: 9000 }, { month: "2026-02", amount: 2000 }, { month: "2026-10", amount: 5000 }], 2026, 2026, 10);
    expect(points).toHaveLength(10);
    expect(points[0]).toEqual({ label: "Jan", amount: 0 });
    expect(points[1]).toEqual({ label: "Feb", amount: 2000 });
    expect(points[9]).toEqual({ label: "Oct", amount: 5000 });
    expect(points.reduce((sum, point) => sum + point.amount, 0)).toBe(7000);
  });

  it("shows all twelve months for a previous year", () => {
    expect(monthlyChartSeries([], 2025, 2026, 10)).toHaveLength(12);
  });

  it("filters withdrawals by month and stops at today's India date", () => {
    const points = dailyChartSeries([{ date: "2026-09-08", amount: 1000 }, { date: "2026-10-08", amount: 5000 }], 2026, 10, "2026-10-14T08:00:00Z");
    expect(points).toHaveLength(14);
    expect(points[7]).toEqual({ label: "8", amount: 5000 });
    expect(points.reduce((sum, point) => sum + point.amount, 0)).toBe(5000);
  });

  it("keeps leap-year February and UTC/India month boundaries correct", () => {
    expect(dailyChartSeries([], 2024, 2, "2026-10-14T08:00:00Z")).toHaveLength(29);
    expect(dailyChartSeries([], 2026, 10, "2026-09-30T20:00:00Z")).toHaveLength(1);
  });
});
