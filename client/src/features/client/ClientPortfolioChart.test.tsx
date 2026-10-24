import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardSummary } from "../../types/domain";
import { ClientPortfolioChart } from "./ClientPortfolioChart";

let width = 960;
beforeEach(() => {
  width = 960;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width, height: 288, top: 0, left: 0, right: width, bottom: 288, x: 0, y: 0, toJSON: () => ({}) }));
  vi.stubGlobal("ResizeObserver", class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) { this.callback([{ target, contentRect: { width, height: 288 } } as ResizeObserverEntry], this as unknown as ResizeObserver); }
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const history: NonNullable<DashboardSummary["portfolioHistory"]> = {
  asOf: "2026-10-24T08:00:00Z", source: "recorded_cash_flow", matchesCurrentPortfolio: true,
  months: Array.from({ length: 12 }, (_, index) => ({ month: new Date(Date.UTC(2025, 10 + index, 1)).toISOString().slice(0, 7), amount: 10000 + index * 1000 }))
};

describe("client portfolio chart rendering", () => {
  it("renders all 12 recorded monthly points with a nonblank real SVG", async () => {
    const result = render(<ClientPortfolioChart history={history} />);
    await waitFor(() => expect(result.container.querySelectorAll(".recharts-area-dot")).toHaveLength(12));
    expect(screen.getByRole("img", { name: "Portfolio growth over the last 12 months" })).toBeInTheDocument();
    expect(result.container.querySelector(".recharts-area-area")?.getAttribute("d")?.length).toBeGreaterThan(20);
  });

  it("shows a single current zero-valued snapshot visibly on mobile without fabricating earlier months", async () => {
    width = 320;
    const result = render(<ClientPortfolioChart history={{ ...history, source: "current_snapshot", months: history.months.map((row, index) => ({ ...row, amount: index === 11 ? 0 : null })) }} />);
    await waitFor(() => expect(result.container.querySelectorAll(".recharts-area-dot")).toHaveLength(1));
    expect(Number(result.container.querySelector("svg.recharts-surface")?.getAttribute("width"))).toBe(320);
    expect(Number(result.container.querySelector("svg.recharts-surface")?.getAttribute("height"))).toBe(288);
    expect(screen.getByText(/Only the current portfolio snapshot/)).toBeInTheDocument();
  });

  it("shows an explicit readiness state instead of calculating history from recent transactions", () => {
    render(<ClientPortfolioChart />);
    expect(screen.getByRole("status")).toHaveTextContent("Apps Script V23");
  });
});
