import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../RegisterForm";
import { describe, expect, vi } from "vitest";
import "@testing-library/jest-dom";

describe("LoginForm", () => {
  it("shows an error if username and password are empty", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(
      screen.getByText(/please enter both username and password/i)
    ).toBeInTheDocument();

    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  it("calls onLoggedIn when valid data is entered", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/username/i), "Pablo");
    await user.type(screen.getByLabelText(/password/i), "secret123");
    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(onLoggedIn).toHaveBeenCalledWith("Pablo");
  });

  it("calls onGoToSignUp when the sign up button is clicked", async () => {
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.click(screen.getByRole("button", { name: /sign up here/i }));

    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
});