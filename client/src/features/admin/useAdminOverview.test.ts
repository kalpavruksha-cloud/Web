import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { getData } from "../../api/client";
import type { AdminDashboardRecords, DashboardSummary } from "../../types/domain";
import { loadAdminOverview, useAdminOverview } from "./useAdminOverview";

vi.mock("../../api/client", () => ({ getData: vi.fn() }));
const fetchData = vi.mocked(getData);
const records: AdminDashboardRecords = {
  clients: [], investments: [], transactions: [], withdrawals: [], documents: [], referrals: [], notifications: []
};
const dashboard: DashboardSummary = {
  totalInvestedAmount: 150000, currentPortfolioValue: 160000, totalReturns: 10000,
  monthlyReturn: 1500, walletBalance: 140000, activeInvestments: 0,
  pendingWithdrawals: 0, referralEarnings: 0, recentTransactions: [],
  investments: [], documents: [], notifications: [],
  admin: {
    totalClients: 2, activeClients: 1, totalInvestment: 150000, portfolioValue: 160000,
    monthlyPayoutAmount: 1500, pendingWithdrawals: 0, pendingKyc: 1, activeInvestments: 0, referralLiabilities: 0
  }
};

beforeEach(() => vi.resetAllMocks());

describe("admin overview loading", () => {
  it("uses one backend request for the complete spreadsheet snapshot", async () => {
    fetchData.mockResolvedValueOnce({ ...dashboard, adminData: records });
    const signal = new AbortController().signal;
    const result = await loadAdminOverview(signal);
    expect(result.dashboard.admin?.totalInvestment).toBe(150000);
    expect(result.clients).toEqual(records.clients);
    expect(fetchData).toHaveBeenCalledExactlyOnceWith("/dashboard", undefined, signal);
  });

  it("bounds legacy reads to two and reuses investments from the summary", async () => {
    let active = 0;
    let maximumActive = 0;
    fetchData.mockImplementation(async (path) => {
      if (path === "/dashboard") return dashboard;
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return [];
    });
    const result = await loadAdminOverview();
    expect(maximumActive).toBe(2);
    expect(fetchData).toHaveBeenCalledTimes(7);
    expect(fetchData.mock.calls.some(([path]) => path === "/investments")).toBe(false);
    expect(result.investments).toBe(dashboard.investments);
  });

  it("rejects incomplete snapshots instead of displaying fabricated empty records", async () => {
    fetchData.mockResolvedValueOnce({ ...dashboard, adminData: { ...records, clients: null } });
    await expect(loadAdminOverview()).rejects.toThrow("did not return clients records");
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("preserves spreadsheet failures", async () => {
    fetchData.mockResolvedValueOnce(dashboard).mockRejectedValue(new Error("Spreadsheet unavailable"));
    await expect(loadAdminOverview()).rejects.toThrow("Spreadsheet unavailable");
  });

  it("never treats a client dashboard as an admin snapshot", async () => {
    fetchData.mockResolvedValueOnce({ ...dashboard, admin: undefined });
    await expect(loadAdminOverview()).rejects.toThrow("unavailable for this session");
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("shares a fresh snapshot across admin pages and seeds existing record queries", async () => {
    fetchData.mockResolvedValue({ ...dashboard, adminData: records });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children);
    const firstPage = renderHook(() => useAdminOverview(), { wrapper });
    await waitFor(() => expect(firstPage.result.current.isSuccess).toBe(true));
    expect(client.getQueryData(["admin-clients", undefined])).toEqual(records.clients);
    expect(client.getQueryData(["dashboard"])).toEqual({ ...dashboard, adminData: records });
    firstPage.unmount();
    const nextPage = renderHook(() => useAdminOverview(), { wrapper });
    await waitFor(() => expect(nextPage.result.current.isSuccess).toBe(true));
    expect(fetchData).toHaveBeenCalledTimes(1);
    nextPage.unmount();
    client.clear();
  });
});
