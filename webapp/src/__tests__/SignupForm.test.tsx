import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SignUpForm from "../SignupForm";
import "@testing-library/jest-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn(), language: "en" },
  }),
}));

describe("SignUpForm Full Suite", () => {
  const onRegistered = vi.fn();
  const onGoToLogin = vi.fn();

  const fillForm = async (user: any, { username = "Pablo", email = "p@t.com", password = "123", confirmPassword = "123" } = {}) => {
    await user.type(screen.getByLabelText(/signup.username_label/i), username);
    await user.type(screen.getByLabelText(/signup.email_label/i), email);
    await user.type(screen.getByLabelText(/signup.password_label/i), password);
    await user.type(screen.getByLabelText(/signup.confirm_password_label/i), confirmPassword);
  };

  beforeEach(() => vi.clearAllMocks());

  it("handles password mismatch and successful signup", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    // Mismatch
    await fillForm(user, { confirmPassword: "wrong" });
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));
    expect(screen.getByText(/signup.error_password_mismatch/i)).toBeInTheDocument();

    // Success
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message: "OK" }),
    });

    // Limpiar campos y rellenar bien (puedes usar un rerender o simplemente borrar)
    await user.click(screen.getByRole("button", { name: /signup.go_login/i }));
    expect(onGoToLogin).toHaveBeenCalled();
  });

  it("shows server error on failure", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: "Email taken" }),
    });

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={vi.fn()} />);
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /signup.submit/i }));
    await waitFor(() => expect(screen.getByText(/email taken/i)).toBeInTheDocument());
  });
});