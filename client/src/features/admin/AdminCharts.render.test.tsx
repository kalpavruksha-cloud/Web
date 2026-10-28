import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminFinancialAnalytics } from "../../types/domain";
import { AdminMoneyCharts, AdminPayoutChart, AdminTransactionFlowChart } from "./AdminMoneyCharts";
import { AdminChartSources, AdminOverviewCharts } from "./AdminOverviewCharts";

let measuredWidth = 420;

beforeEach(() => {
  measuredWidth = 420;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width: measuredWidth, height: 288, top: 0, left: 0, right: measuredWidth, bottom: 288, x: 0, y: 0, toJSON: () => ({}) }));
  vi.stubGlobal("ResizeObserver", class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: { width: measuredWidth, height: 288 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  });
});

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const analytics: AdminFinancialAnalytics = {
  asOf: "2026-10-15T08:00:00Z", currentYear: 2026, currentMonth: 10,
  investmentSource: "transaction_ledger", withdrawalSource: "transaction_ledger",
  investmentMonths: [{ month: "2026-09", amount: 100000 }],
  withdrawalMonths: [{ month: "2026-10", amount: 5000 }],
  withdrawalDays: [{ date: "2026-10-10", amount: 5000 }], payoutMonths: [], warnings: [],
  portfolioMonths: [{ month: "2026-09", amount: 100000 }], portfolioGrowthSource: "transaction_ledger",
  portfolioDistribution: [{ name: "Wealth", amount: 100000 }], portfolioDistributionSource: "investment_records",
  registrationMonths: [{ month: "2026-09", count: 2 }]
};

describe("real Recharts rendering", () => {
  it("renders a single payout month as a visible bar and switches its year", async () => {
    const view = render(<AdminPayoutChart analytics={{ ...analytics, payoutMonths: [{ month: "2025-02", amount: 1500 }] }} />);
    await waitFor(() => expect(view.container.querySelectorAll(".recharts-bar-rectangle path").length).toBeGreaterThan(0));
    expect(screen.getByLabelText("Payout Year")).toHaveValue("2025");
    expect(screen.getByText("\u20b91,500")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payout Year"), { target: { value: "2026" } });
    expect(screen.getByRole("status")).toHaveTextContent("No completed activity");
  });

  it("renders both transaction bars when credit and debit exactly balance", async () => {
    measuredWidth = 320;
    const view = render(<AdminTransactionFlowChart analytics={{ ...analytics, transactionFlowMonths: [{ month: "2025-06", credit: 5000, debit: 5000, net: 0, count: 2 }] }} />);
    await waitFor(() => expect(view.container.querySelectorAll(".recharts-bar-rectangle path").length).toBeGreaterThanOrEqual(2));
    expect(screen.getByLabelText("Transaction Year")).toHaveValue("2025");
    expect(screen.getByText("Credit")).toBeInTheDocument();
    expect(screen.getByText("Debit")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(Number(view.container.querySelector(".recharts-wrapper > svg")?.getAttribute("width"))).toBe(320);
  });

  it("renders a previous debit-only net series on an older Apps Script without inventing a breakdown", async () => {
    const view = render(<AdminTransactionFlowChart analytics={{ ...analytics, transactionMonths: [{ month: "2025-04", amount: -1000 }] }} />);
    await waitFor(() => expect(view.container.querySelectorAll(".recharts-bar-rectangle path").length).toBeGreaterThan(0));
    expect(screen.getByLabelText("Transaction Year")).toHaveValue("2025");
    expect(screen.getByRole("status")).toHaveTextContent("Only net flow is available");
    expect(screen.queryByText("Credit")).not.toBeInTheDocument();
  });

  it("keeps each withdrawal and payout canvas visible at mobile and desktop widths", async () => {
    for (const width of [320, 1080]) {
      measuredWidth = width;
      const view = render(<><AdminMoneyCharts analytics={analytics} /><AdminPayoutChart analytics={{ ...analytics, payoutMonths: [{ month: "2026-10", amount: 1000 }] }} /></>);
      const card = screen.getByRole("heading", { name: "Monthly Withdrawals" }).closest("section")!;
      expect(within(card).getByText("\u20b95,000")).toBeInTheDocument();
      await waitFor(() => expect(card.querySelectorAll(".recharts-bar-rectangle path").length).toBeGreaterThan(0));
      for (const chart of view.container.querySelectorAll(".recharts-wrapper > svg")) {
        expect(Number(chart.getAttribute("width"))).toBe(width);
        expect(Number(chart.getAttribute("height"))).toBe(288);
      }
      view.unmount();
    }
  });

  it("renders nonzero SVG bars from the supplied backend series", async () => {
    const view = render(<AdminMoneyCharts analytics={analytics} />);
    await waitFor(() => expect(view.container.querySelectorAll(".recharts-bar-rectangle path").length).toBeGreaterThan(0));
    const paths = [...view.container.querySelectorAll(".recharts-bar-rectangle path")];
    expect(paths.some((path) => Number(path.getAttribute("height")) > 0 || (path.getAttribute("d")?.length ?? 0) > 20)).toBe(true);
    expect(screen.getByText("₹1,00,000")).toBeInTheDocument();
  });

  it("renders one expanded portfolio chart without distribution or registration panels", async () => {
    measuredWidth = 1280;
    const view = render(<AdminOverviewCharts analytics={analytics} currentValue={100000} />);
    await waitFor(() => expect(view.container.querySelector(".recharts-area")).not.toBeNull());
    expect(view.container.querySelector(".recharts-area")).not.toBeNull();
    expect(view.container.querySelector(".recharts-bar-rectangle")).toBeNull();
    expect(view.container.querySelector(".recharts-pie-sector")).toBeNull();
    expect(view.container.querySelectorAll("div.recharts-wrapper").length).toBe(1);
    expect(screen.getByRole("heading", { name: "Current Portfolio" })).toBeInTheDocument();
    expect(screen.queryByText("Client Registration Trend")).not.toBeInTheDocument();
    expect(screen.queryByText("Portfolio Distribution")).not.toBeInTheDocument();
    expect(Number(view.container.querySelector(".recharts-wrapper > svg")?.getAttribute("height"))).toBe(420);
  });

  it("keeps the real chart canvas within a mobile-width container", async () => {
    measuredWidth = 320;
    const view = render(<AdminMoneyCharts analytics={analytics} />);
    await waitFor(() => expect(view.container.querySelectorAll(".recharts-bar-rectangle path").length).toBeGreaterThan(0));
    for (const chart of view.container.querySelectorAll(".recharts-wrapper > svg.recharts-surface")) {
      expect(Number(chart.getAttribute("width"))).toBe(320);
      expect(Number(chart.getAttribute("height"))).toBe(288);
    }
  });

  it("displays source tabs, record counts and mapping warnings to the admin", () => {
    render(<AdminChartSources analytics={{ ...analytics, sources: [{ module: "transactions", sheet: "Transaction_Register", recordCount: 23, headers: ["Txn Date", "Txn Type", "Amount"], warnings: ["Missing posting status."] }] }} />);
    expect(screen.getByText("transactions: Transaction_Register (23 records)")).toBeInTheDocument();
    expect(screen.getByText("Missing posting status.")).toBeInTheDocument();
  });
});
