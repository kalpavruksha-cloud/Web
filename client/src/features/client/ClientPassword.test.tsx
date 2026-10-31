import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAction, useResource } from "../../api/queries";
import { ClientSettingsPage } from "./pages/ClientPages";

const { change, toast } = vi.hoisted(() => ({ change: vi.fn(), toast: vi.fn() }));
vi.mock("../../api/queries", () => ({ useAction: vi.fn(), useResource: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock("../../context/ThemeContext", () => ({ useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }) }));
vi.mock("../../context/ToastContext", () => ({ useToast: () => ({ toast }) }));

beforeEach(() => {
  vi.mocked(useResource).mockReturnValue({ data: {}, isLoading: false, error: null } as unknown as ReturnType<typeof useResource>);
  vi.mocked(useAction).mockReturnValue({ mutateAsync: change, isPending: false } as unknown as ReturnType<typeof useAction>);
  change.mockResolvedValue({ updated: true, verified: true });
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

function fill(confirm = "new-test-password") {
  fireEvent.change(screen.getByLabelText("Current Password"), { target: { value: "old-test-password" } });
  fireEvent.change(screen.getByLabelText("New Password"), { target: { value: "new-test-password" } });
  fireEvent.change(screen.getByLabelText("Confirm New Password"), { target: { value: confirm } });
  fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
}

describe("client password change confirmation", () => {
  it("shows success only after the backend confirms the spreadsheet write and clears password fields", async () => {
    render(<ClientSettingsPage />);
    fill();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Password changed", type: "success" })));
    expect(change).toHaveBeenCalledWith({ method: "put", url: "/client/password", body: { currentPassword: "old-test-password", newPassword: "new-test-password", confirmPassword: "new-test-password" } });
    expect(screen.getByLabelText("Current Password")).toHaveValue("");
    expect(screen.getByLabelText("New Password")).toHaveValue("");
    expect(screen.getByLabelText("Confirm New Password")).toHaveValue("");
  });

  it("does not show success for older unconfirmed Apps Script responses", async () => {
    change.mockResolvedValue({ updated: true });
    render(<ClientSettingsPage />);
    fill();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Password change failed", type: "error" })));
    expect(toast).not.toHaveBeenCalledWith(expect.objectContaining({ type: "success" }));
  });

  it("shows a failed-save error without clearing fields or an unhandled rejection", async () => {
    change.mockRejectedValue(new Error("Current password is incorrect"));
    render(<ClientSettingsPage />);
    fill();
    await waitFor(() => expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Current password is incorrect", type: "error" })));
    expect(screen.getByLabelText("New Password")).toHaveValue("new-test-password");
  });

  it("blocks mismatched confirmation before making an API request", () => {
    render(<ClientSettingsPage />);
    fill("different-password");
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Passwords do not match", type: "error" }));
    expect(change).not.toHaveBeenCalled();
  });
});
