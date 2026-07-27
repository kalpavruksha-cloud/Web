import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import { ToastProvider } from "../context/ToastContext";
import { LoginPage } from "./LoginPage";

vi.mock("../api/client", () => ({
  api: {
    get: vi.fn(() => Promise.reject(new Error("No session"))),
    post: vi.fn()
  }
}));

describe("LoginPage", () => {
  it("renders credential fields and forgot password control", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider>
          <ToastProvider>
            <BrowserRouter>
              <AuthProvider>
                <LoginPage />
              </AuthProvider>
            </BrowserRouter>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
    expect(screen.getByLabelText(/login id or email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /forgot password/i })).toBeInTheDocument();
  });
});
