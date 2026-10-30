import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getData, sendData } from "../../api/client";
import type { KycRecord } from "../../types/kyc";
import { KycPanel } from "./KycPanel";

vi.mock("../../api/client", () => ({ getData: vi.fn(), sendData: vi.fn() }));
const clients: QueryClient[] = [];
const base: KycRecord = {
  clientId: "C001", pan: "ABCDE1234F", aadhaarLast4: "0123", aadhaarConfigured: true, status: "under_review", remarks: "", verificationDate: "", verifiedBy: "", revision: "revision-one", panDocumentId: "", aadhaarDocumentId: "",
  documents: [
    { id: "PAN1", name: "PAN file", kind: "pan", status: "under_verification", uploadDate: "2026-10-01", driveUrl: "https://drive.google.com/file/d/test-pan/view" },
    { id: "AAD1", name: "Aadhaar file", kind: "aadhaar", status: "under_verification", uploadDate: "2026-10-01", driveUrl: "https://drive.google.com/file/d/test-aadhaar/view" }
  ]
};
beforeEach(() => {
  vi.mocked(getData).mockImplementation(async (path) => ({ ...base, ...(path.startsWith("/clients/") ? { aadhaar: "234567890123" } : {}) }));
  vi.mocked(sendData).mockImplementation(async (_method, path, body) => ({ ...base, revision: "revision-two", status: path.endsWith("/review") ? body?.decision : "under_review", verifiedBy: path.endsWith("/review") ? "ADMIN" : "", ...body }));
});
afterEach(() => { cleanup(); clients.forEach((client) => client.clear()); clients.length = 0; vi.resetAllMocks(); });

function view(admin = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  return { client, ...render(<QueryClientProvider client={client}><KycPanel clientId="C001" admin={admin} /></QueryClientProvider>) };
}

describe("KYC details and admin review", () => {
  it("provides client number fields without any self-verification controls", async () => {
    view();
    expect(await screen.findByLabelText("PAN number")).toHaveValue(base.pan);
    expect(screen.getByLabelText("Replace Aadhaar number")).toHaveValue("");
    expect(screen.getByText("Saved Aadhaar: XXXX XXXX 0123")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify KYC" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject KYC" })).not.toBeInTheDocument();
  });

  it("submits validated numbers through the existing backend and clears typed Aadhaar", async () => {
    view();
    const pan = await screen.findByLabelText("PAN number");
    fireEvent.change(pan, { target: { value: "abcde4321f" } });
    const aadhaar = screen.getByLabelText("Replace Aadhaar number");
    fireEvent.change(aadhaar, { target: { value: "2345 6789 0123" } });
    expect(aadhaar).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show Aadhaar number" }));
    expect(aadhaar).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Submit KYC Details" }));
    expect(await screen.findByRole("status")).toHaveTextContent("submitted for admin review");
    expect(sendData).toHaveBeenCalledWith("put", "/client/kyc", { expectedRevision: "revision-one", pan: "ABCDE4321F", aadhaar: "234567890123" });
    expect(screen.getByLabelText("Replace Aadhaar number")).toHaveValue("");
    expect(screen.getByLabelText("Replace Aadhaar number")).toHaveAttribute("type", "password");
  });

  it("retains stored Aadhaar when only PAN is corrected", async () => {
    view();
    fireEvent.change(await screen.findByLabelText("PAN number"), { target: { value: "ABCDE4321F" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit KYC Details" }));
    await waitFor(() => expect(sendData).toHaveBeenCalled());
    expect(vi.mocked(sendData).mock.calls[0][2]).not.toHaveProperty("aadhaar");
  });

  it("requires valid PAN and Aadhaar format before submitting a new KYC record", async () => {
    vi.mocked(getData).mockResolvedValue({ ...base, pan: "", aadhaarConfigured: false, aadhaarLast4: "" });
    view();
    fireEvent.change(await screen.findByLabelText("PAN number"), { target: { value: "INVALID" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit KYC Details" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("valid 10-character PAN");
    expect(sendData).not.toHaveBeenCalled();
  });

  it("requires document selection and explicit confirmation before admin verification", async () => {
    view(true);
    await screen.findByRole("button", { name: "Verify KYC" });
    fireEvent.click(screen.getByRole("button", { name: "Verify KYC" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Select PAN and Aadhaar documents");
    expect(sendData).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("PAN document"), { target: { value: "PAN1" } });
    fireEvent.change(screen.getByLabelText("Aadhaar document"), { target: { value: "AAD1" } });
    expect(screen.getByRole("link", { name: "Open PAN document" })).toHaveAttribute("href", base.documents[0].driveUrl);
    fireEvent.click(screen.getByLabelText("I have reviewed the selected PAN and Aadhaar documents."));
    fireEvent.click(screen.getByRole("button", { name: "Verify KYC" }));
    expect(screen.getByText("Confirm KYC Verification")).toBeInTheDocument();
    expect(sendData).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("status")).toHaveTextContent("KYC verified and saved");
    expect(sendData).toHaveBeenCalledWith("put", "/clients/C001/kyc/review", expect.objectContaining({ decision: "verified", expectedRevision: "revision-one", panDocumentId: "PAN1", aadhaarDocumentId: "AAD1", confirmDocumentsReviewed: true }));
    expect(screen.getByLabelText("PAN number")).toBeDisabled();
  });

  it("requires a rejection reason and supports reopening verified KYC", async () => {
    view(true);
    fireEvent.click(await screen.findByRole("button", { name: "Reject KYC" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a review reason");
    fireEvent.change(screen.getByLabelText("Admin remarks / reason"), { target: { value: "Unclear PAN scan" } });
    fireEvent.click(screen.getByRole("button", { name: "Reject KYC" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("status")).toHaveTextContent("rejected");
    expect(sendData).toHaveBeenCalledWith("put", "/clients/C001/kyc/review", expect.objectContaining({ decision: "rejected", remarks: "Unclear PAN scan" }));
  });

  it("keeps verified client fields read-only and only admins can reopen them", async () => {
    vi.mocked(getData).mockResolvedValue({ ...base, status: "verified" });
    const rendered = view();
    expect(await screen.findByLabelText("PAN number")).toBeDisabled();
    expect(screen.getByLabelText("Replace Aadhaar number")).toHaveValue("XXXX XXXX 0123");
    expect(screen.queryByRole("button", { name: "Submit KYC Details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen KYC" })).not.toBeInTheDocument();
    rendered.unmount();
    view(true);
    fireEvent.change(await screen.findByLabelText("Admin remarks / reason"), { target: { value: "Client requested correction" } });
    fireEvent.click(screen.getByRole("button", { name: "Reopen KYC" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("status")).toHaveTextContent("reopened");
  });

  it("blocks stale number edits when a background refresh changes the revision", async () => {
    const { client } = view();
    fireEvent.change(await screen.findByLabelText("PAN number"), { target: { value: "ABCDE4321F" } });
    act(() => { client.setQueryData(["kyc", "client", "C001"], { ...base, revision: "new-revision" }); });
    expect(await screen.findByRole("alert")).toHaveTextContent("changed while you were editing");
    expect(screen.getByRole("button", { name: "Submit KYC Details" })).toBeDisabled();
  });

  it("blocks a stale document review when a background refresh changes evidence", async () => {
    const { client } = view(true);
    fireEvent.change(await screen.findByLabelText("PAN document"), { target: { value: "PAN1" } });
    act(() => { client.setQueryData(["kyc", "admin", "C001"], { ...base, revision: "new-evidence" }); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Verify KYC" })).toBeDisabled());
    expect(sendData).not.toHaveBeenCalled();
  });

  it("shows setup errors without a fake empty KYC record or approval controls", async () => {
    vi.mocked(getData).mockRejectedValue(new Error("Latest Apps Script deployment required"));
    view(true);
    expect(await screen.findByRole("alert")).toHaveTextContent("Latest Apps Script");
    expect(screen.queryByLabelText("PAN number")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify KYC" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry KYC" })).toBeInTheDocument();
  });

  it("does not offer untrusted document URLs for review", async () => {
    vi.mocked(getData).mockResolvedValue({ ...base, documents: [{ ...base.documents[0], driveUrl: "javascript:alert(1)" }] });
    view(true);
    const select = await screen.findByLabelText("PAN document");
    expect((select as HTMLSelectElement).options).toHaveLength(1);
    expect(screen.queryByRole("link", { name: "Open PAN document" })).not.toBeInTheDocument();
  });

  it("does not recreate private query data after logout/unmount during a write", async () => {
    let complete!: (value: KycRecord) => void;
    vi.mocked(sendData).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
    const rendered = view();
    await screen.findByLabelText("PAN number");
    fireEvent.click(screen.getByRole("button", { name: "Submit KYC Details" }));
    await waitFor(() => expect(sendData).toHaveBeenCalled());
    rendered.unmount();
    rendered.client.clear();
    await act(async () => { complete({ ...base, revision: "post-logout" }); });
    expect(rendered.client.getQueryData(["kyc", "client", "C001"])).toBeUndefined();
  });
});
