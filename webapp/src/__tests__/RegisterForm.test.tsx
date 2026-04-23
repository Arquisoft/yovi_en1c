import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../RegisterForm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

// Mock i18next to return translation keys
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
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    expect(screen.getByText(/login.error_empty/i)).toBeInTheDocument();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  test("submits login successfully and saves token", async () => {
    const onLoggedIn = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-token",
        user: { username: "Pablo" },
      }),
    } as Response);

    render(<LoginForm onLoggedIn={onLoggedIn} onGoToSignUp={vi.fn()} />);

    await user.type(screen.getByLabelText(/login.username_label/i), "Pablo");
    await user.type(screen.getByLabelText(/login.password_label/i), "secret123");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledWith("Pablo");
    });

    expect(localStorage.getItem("token")).toBe("mock-token");
  });

  test("shows server error message on API failure", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid Credentials" }),
    } as Response);

    render(<LoginForm onLoggedIn={vi.fn()} onGoToSignUp={vi.fn()} />);

    await user.type(screen.getByLabelText(/login.username_label/i), "Pablo");
    await user.type(screen.getByLabelText(/login.password_label/i), "wrong");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });

  test("shows fallback error message for empty error response", async () => {
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
      expect(screen.getByText(/login.error_generic/i)).toBeInTheDocument();
    });
  });

  test("calls onGoToSignUp when requested", async () => {
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onLoggedIn={vi.fn()} onGoToSignUp={onGoToSignUp} />);

    await user.click(screen.getByRole("button", { name: /login.go_signup/i }));

    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
});