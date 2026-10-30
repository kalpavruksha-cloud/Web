import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminFinancialAnalytics } from "../../types/domain";
import type { AdminCollections } from "./adminUtils";
import { AdminPendingPayouts } from "./AdminPendingPayouts";
import { AdminOverviewCards } from "./AdminOverviewCards";
import { exportCsv } from "./adminUtils";

vi.mock("./adminUtils", async (original) => ({ ...await original<typeof import("./adminUtils")>(), exportCsv: vi.fn() }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const analytics = { payoutCalendarReady:true, pendingPayouts: [
  { clientId:"C001",clientName:"First client",period:"2026-10",scheduledAmount:1500,recordedAmount:600,remainingAmount:900,dueDate:"2026-10-05",nextScheduledDate:null,note:"",dueStatus:"overdue" }
], upcomingPayouts: [
  { clientId:"C002",clientName:"Second client",period:"2026-11",scheduledAmount:5000,recordedAmount:0,remainingAmount:5000,dueDate:"2026-11-05",nextScheduledDate:null,note:"",dueStatus:"upcoming" }
], pendingPayoutWarnings: [] } as unknown as AdminFinancialAnalytics;

describe("pending payout drill-down", () => {
  it("shows upcoming dates separately without a false overdue deadline", () => {
    render(<MemoryRouter><AdminPendingPayouts analytics={analytics} mode="upcoming" /></MemoryRouter>);
    expect(screen.getByRole("heading", {name:"Upcoming Client Payouts"})).toBeInTheDocument();
    expect(screen.getAllByText(/05 Nov 2026/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Confirm bank settlement/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Payout due status"), {target:{value:"upcoming"}});
    fireEvent.click(screen.getByRole("button", {name:"Export upcoming"}));
    expect(vi.mocked(exportCsv).mock.calls[0][1]).toHaveLength(1);
    expect(vi.mocked(exportCsv).mock.calls[0][1][0]).toMatchObject({"Client ID":"C002","Due date":"2026-11-05"});
  });

  it("does not report unavailable old deployments or missing source data as paid", () => {
    const view=render(<MemoryRouter><AdminPendingPayouts /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Apps Script V27");
    view.rerender(<MemoryRouter><AdminPendingPayouts analytics={{...analytics,pendingPayouts:null}} /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("incomplete");
    view.rerender(<MemoryRouter><AdminPendingPayouts analytics={{...analytics,pendingPayouts:[]}} /></MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("No client payout balance remains");
  });

  it("makes the existing payout card action clickable and announces its expanded state", () => {
    const clicked=vi.fn();
    render(<AdminOverviewCards data={{clients:[],investments:[],transactions:[],withdrawals:[],documents:[],referrals:[],notifications:[]}} onPendingPayoutClick={clicked} pendingPayoutsOpen />);
    const button=screen.getByRole("button", {name:"Hide pending clients"});
    expect(button).toHaveAttribute("aria-expanded","true");
    fireEvent.click(button);
    expect(clicked).toHaveBeenCalledOnce();
  });

  it("keeps current-month and upcoming cards separate and makes upcoming clients clickable", () => {
    const clicked=vi.fn();
    const data={clients:[],investments:[],transactions:[],withdrawals:[],documents:[],referrals:[],notifications:[],dashboard:{
      admin:{payoutCalendarReady:true,remainingMonthlyPayout:0,scheduledMonthlyPayout:2500,paidMonthlyPayout:2500,upcomingPayoutAmount:3000,upcomingPayoutPeriod:"2026-11"},
      adminAnalytics:{asOf:"2026-10-29T08:00:00Z"}
    }} as unknown as AdminCollections;
    render(<AdminOverviewCards data={data} onUpcomingPayoutClick={clicked} />);
    expect(screen.getByText("Pending This Month")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Payouts")).toBeInTheDocument();
    expect(screen.getByText("November 2026")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"View upcoming clients"}));
    expect(clicked).toHaveBeenCalledOnce();
  });
});
