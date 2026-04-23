import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../RegisterForm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
}));

describe("LoginForm Full Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test("validates empty username and submits successfully", async () => {
    const onLoggedIn = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onLoggedIn={onLoggedIn} onGoToSignUp={vi.fn()} />);

    // Validation
    await user.click(screen.getByRole("button", { name: /login.submit/i }));
    expect(screen.getByText(/login.error_empty/i)).toBeInTheDocument();

    // Success Mock
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "mock-token", user: { username: "Pablo" } }),
    } as Response);

    await user.type(screen.getByLabelText(/login.username_label/i), "Pablo");
    await user.type(screen.getByLabelText(/login.password_label/i), "1234");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => expect(onLoggedIn).toHaveBeenCalledWith("Pablo"));
    expect(localStorage.getItem("token")).toBe("mock-token");
  });

  test("handles API errors (specific and generic)", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid Credentials" }),
    } as Response);

    render(<LoginForm onLoggedIn={vi.fn()} onGoToSignUp={vi.fn()} />);
    await user.type(screen.getByLabelText(/login.username_label/i), "User");
    await user.click(screen.getByRole("button", { name: /login.submit/i }));

    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument());
  });

  test("navigates to signup", async () => {
    const onGoToSignUp = vi.fn();
    render(<LoginForm onLoggedIn={vi.fn()} onGoToSignUp={onGoToSignUp} />);
    await userEvent.click(screen.getByRole("button", { name: /login.go_signup/i }));
    expect(onGoToSignUp).toHaveBeenCalled();
  });
});