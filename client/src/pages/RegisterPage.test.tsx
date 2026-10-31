import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import { registrationGenderOptions, registerFormSchema } from "../schemas/auth";
import { RegisterPage } from "./RegisterPage";

vi.mock("../api/client", () => ({ api: { post: vi.fn() } }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

const registration = {
  fullName: "Test Investor",
  email: "investor@example.test",
  mobile: "9000000000",
  password: "Test-only!42"
};

function renderRegistration() {
  render(<MemoryRouter initialEntries={["/register"]}><RegisterPage /></MemoryRouter>);
}

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: registration.fullName } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: registration.email } });
  fireEvent.change(screen.getByLabelText("Mobile"), { target: { value: registration.mobile } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: registration.password } });
}

describe("RegisterPage", () => {
  it("reveals and hides the same editable password without submitting", () => {
    renderRegistration();
    const password = screen.getByLabelText("Password");
    fireEvent.change(password, { target: { value: registration.password } });
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "new-password");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(password).toHaveValue(registration.password);
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(password, { target: { value: "Corrected-only!42" } });
    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveValue("Corrected-only!42");
    expect(api.post).not.toHaveBeenCalled();
  });

  it("provides a gender select with a blank prompt and fixed choices", () => {
    renderRegistration();
    const gender = screen.getByRole("combobox", { name: "Gender" });
    expect(gender).toHaveValue("");
    expect(screen.queryByRole("textbox", { name: "Gender" })).not.toBeInTheDocument();
    expect(Array.from((gender as HTMLSelectElement).options, (option) => option.value)).toEqual(["", ...registrationGenderOptions]);
    fireEvent.change(gender, { target: { value: "Female" } });
    expect(gender).toHaveValue("Female");
  });

  it("replaces the form with a focused success message, Login ID and login link", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: { clientId: "TEST001" } } });
    renderRegistration();
    fillRequiredFields();
    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "Female" } });
    fireEvent.click(screen.getByRole("button", { name: "Create portal registration" }));

    const heading = await screen.findByRole("heading", { name: "Registration successful" });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(api.post).toHaveBeenCalledExactlyOnceWith("/auth/register", expect.objectContaining({ ...registration, gender: "Female", riskProfile: "Medium" }));
    expect(screen.getByRole("status")).toHaveTextContent("TEST001");
    expect(screen.getByRole("status")).toHaveTextContent("once your account is activated");
    expect(screen.getByRole("link", { name: "Go to login" })).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.queryByLabelText("Full name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create portal registration" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Register for Kalpavruksha Portal" })).not.toBeInTheDocument();
  });

  it("keeps the form and entered values after a failed registration", async () => {
    vi.mocked(api.post).mockRejectedValue(new Error("Email already registered"));
    renderRegistration();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create portal registration" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email already registered");
    expect(screen.getByLabelText("Full name")).toHaveValue(registration.fullName);
    expect(screen.getByLabelText("Password")).toHaveValue(registration.password);
    expect(screen.getByRole("button", { name: "Create portal registration" })).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Registration successful" })).not.toBeInTheDocument();
  });

  it("does not show success when the API cannot confirm the new Login ID", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true, data: {} } });
    renderRegistration();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create portal registration" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please contact support before trying again");
    expect(screen.queryByRole("heading", { name: "Registration successful" })).not.toBeInTheDocument();
  });

  it("disables submission while the existing registration request is pending", async () => {
    let complete!: () => void;
    vi.mocked(api.post).mockImplementationOnce(() => new Promise((resolve) => {
      complete = () => resolve({ data: { success: true, data: { clientId: "TEST002" } } });
    }));
    renderRegistration();
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "Create portal registration" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledOnce());
    const submitting = screen.getByRole("button", { name: "Submitting..." });
    expect(submitting).toBeDisabled();
    fireEvent.click(submitting);
    expect(api.post).toHaveBeenCalledOnce();
    await act(async () => { complete(); });
    expect(screen.getByRole("heading", { name: "Registration successful" })).toBeInTheDocument();
  });

  it("keeps the existing required-field validation without sending a request", async () => {
    renderRegistration();
    fireEvent.click(screen.getByRole("button", { name: "Create portal registration" }));
    expect(await screen.findByText("Enter your full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Full name")).toHaveAccessibleDescription("Enter your full name");
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe("registration gender validation", () => {
  it.each(registrationGenderOptions)("accepts the selectable value %s", (gender) => {
    expect(registerFormSchema.safeParse({ ...registration, gender }).success).toBe(true);
  });

  it("keeps gender optional and rejects arbitrary typed values", () => {
    expect(registerFormSchema.safeParse(registration).success).toBe(true);
    expect(registerFormSchema.safeParse({ ...registration, gender: "" }).success).toBe(true);
    expect(registerFormSchema.safeParse({ ...registration, gender: "arbitrary input" }).success).toBe(false);
  });
});
