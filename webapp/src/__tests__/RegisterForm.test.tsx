import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../RegisterForm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

// 1. Mock useTranslation so it returns the keys
// This ensures that t("login.username_label") returns "login.username_label"
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows validation error when username is empty", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(<LoginForm onLoggedIn={onLoggedIn} onGoToSignUp={onGoToSignUp} />);

    const user = userEvent.setup();
    // Using the translation key as the name
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    expect(screen.getByText(/login.error_empty/i)).toBeInTheDocument();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  test("submits login successfully and calls onLoggedIn with API username", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-token",
        user: { username: "Pablo" },
      }),
    } as Response);

    render(<LoginForm onLoggedIn={onLoggedIn} onGoToSignUp={onGoToSignUp} />);

    // Match by the translation key used in the <label>
    await user.type(screen.getByLabelText(/login.username_label/i), "Pablo");
    await user.type(screen.getByLabelText(/login.password_label/i), "secret123");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledWith("Pablo");
    });

    expect(localStorage.getItem("token")).toBe("mock-token");
  });

  test("shows server error message when API returns an error", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid Credentials" }),
    } as Response);

    render(<LoginForm onLoggedIn={onLoggedIn} onGoToSignUp={onGoToSignUp} />);

    await user.type(screen.getByLabelText(/login.username_label/i), "Pablo");
    await user.type(screen.getByLabelText(/login.password_label/i), "wrong");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test("shows fallback error message when API returns empty error object", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<LoginForm onLoggedIn={vi.fn()} onGoToSignUp={vi.fn()} />);

    await user.type(screen.getByLabelText(/login.username_label/i), "Pablo");
    await user.type(screen.getByLabelText(/login.password_label/i), "wrong");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => {
      // It should fall back to the generic error key
      expect(screen.getByText(/login.error_generic/i)).toBeInTheDocument();
    });
  });

  test("calls onGoToSignUp when the sign up button is clicked", async () => {
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onLoggedIn={vi.fn()} onGoToSignUp={onGoToSignUp} />);

    // Matches the key for the "Go to signup" button
    await user.click(screen.getByRole("button", { name: /login.go_signup/i }));

    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
});