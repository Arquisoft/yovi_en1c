import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SignUpForm from "../SignupForm";
import "@testing-library/jest-dom";

// Mocking i18next
const mockChangeLanguage = vi.fn();
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: mockChangeLanguage,
      language: "en",
    },
  }),
}));

// Mocking the sanitize helpers (assuming they return the input for simplicity)
vi.mock("./sanitize", () => ({
  sanitizeToken: (t: string) => t,
  sanitizeUsername: (u: string) => u,
}));

describe("SignUpForm Full Coverage Suite", () => {
  const onRegistered = vi.fn();
  const onGoToLogin = vi.fn();

  const fillForm = async (
    user: any,
    {
      username = "Pablo",
      email = "p@t.com",
      password = "123",
      confirmPassword = "123",
    } = {},
  ) => {
    if (username)
      await user.type(
        screen.getByLabelText(/signup.username_label/i),
        username,
      );
    if (email)
      await user.type(screen.getByLabelText(/signup.email_label/i), email);
    if (password)
      await user.type(
        screen.getByLabelText(/signup.password_label/i),
        password,
      );
    if (confirmPassword)
      await user.type(
        screen.getByLabelText(/signup.confirm_password_label/i),
        confirmPassword,
      );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it("shows error when fields are empty", async () => {
    const user = userEvent.setup();
    render(
      <SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />,
    );

    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    expect(screen.getByText(/signup.error_empty_fields/i)).toBeInTheDocument();
  });

  it("saves token and username to localStorage on success", async () => {
    const user = userEvent.setup();
    const fakeData = {
      token: "mock.token.val",
      user: { username: "pablo_user" },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(fakeData),
    });

    render(
      <SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />,
    );

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    await waitFor(() => {
      expect(localStorage.getItem("token")).toBe("mock.token.val");
      expect(localStorage.getItem("username")).toBe("pablo_user");
      expect(onRegistered).toHaveBeenCalledWith("Pablo");
    });
  });

  it("handles SyntaxError when server returns invalid JSON", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      text: async () => "not-a-json", 
    });

    render(
      <SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />,
    );
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/signup.error_server_response/i),
      ).toBeInTheDocument();
    });
  });

  it("handles generic network errors", async () => {
    const user = userEvent.setup();
    (global.fetch as any).mockRejectedValue(new Error("Network Fail"));

    render(
      <SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />,
    );
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/network fail/i)).toBeInTheDocument();
    });
  });

  it("handles password mismatch", async () => {
    const user = userEvent.setup();
    render(
      <SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />,
    );

    await fillForm(user, { confirmPassword: "wrong" });
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));

    expect(
      screen.getByText(/signup.error_password_mismatch/i),
    ).toBeInTheDocument();
  });
});
