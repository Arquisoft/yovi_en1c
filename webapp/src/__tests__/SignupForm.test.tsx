import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import SignUpForm from "../SignupForm";
import "@testing-library/jest-dom";

// Mock i18next to return translation keys as text
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
}));

describe("SignUpForm", () => {
  const onRegistered = vi.fn();
  const onGoToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to populate form fields
  const fillForm = async (
    user: ReturnType<typeof userEvent.setup>,
    {
      username = "Pablo",
      email = "pablo@test.com",
      password = "abc123",
      confirmPassword = "abc123",
    } = {}
  ) => {
    await user.type(screen.getByLabelText(/signup.username_label/i), username);
    await user.type(screen.getByLabelText(/signup.email_label/i), email);
    await user.type(screen.getByLabelText(/signup.password_label/i), password);
    await user.type(screen.getByLabelText(/signup.confirm_password_label/i), confirmPassword);
  };

  it("renders all form fields and buttons", () => {
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    expect(screen.getByLabelText(/signup.username_label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/signup.email_label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/signup.password_label/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/signup.confirm_password_label/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /signup.submit/i })).toBeInTheDocument();
  });

  it("calls onGoToLogin when the login link is clicked", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await user.click(screen.getByRole("button", { name: /signup.go_login/i }));
    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });

  it("shows error if passwords do not match", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user, { confirmPassword: "wrongpassword" });
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    expect(screen.getByText(/signup.error_password_mismatch/i)).toBeInTheDocument();
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("calls onRegistered on successful signup", async () => {
    const user = userEvent.setup();
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message: "OK" }),
    } as Response);

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith("Pablo");
    });
  });

  it("shows server error when signup fails", async () => {
    const user = userEvent.setup();
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: "Email already taken" }),
    } as Response);

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already taken/i)).toBeInTheDocument();
    });
  });
});