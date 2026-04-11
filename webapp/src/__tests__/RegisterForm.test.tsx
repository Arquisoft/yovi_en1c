import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../RegisterForm";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

describe("LoginForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows validation error when username is empty", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(<LoginForm
      onLoggedIn={onLoggedIn}
      onGoToSignUp={onGoToSignUp}
    />
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    expect(screen.getByText(/please enter both username and password/i)).toBeInTheDocument();
    expect(onLoggedIn).not.toHaveBeenCalled();
  });

  test("shows validation error when password is missing", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    expect(
      screen.getByText(/please enter both username and password/i)
    ).toBeInTheDocument();
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

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "secret123");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledWith("Pablo");
    });

    expect(localStorage.getItem("token")).toBe("mock-token");
  });


  test("calls onLoggedIn with trimmed username when API user is missing", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "mock-token",
      }),
    } as Response);

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "  Pablo  ");
    await user.type(screen.getByLabelText(/and password\?/i), "secret123");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(onLoggedIn).toHaveBeenCalledWith("Pablo");
    });
  });

  test("shows server error message when API returns an error", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid username or password" }),
    } as Response);

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/invalid username or password/i)
      ).toBeInTheDocument();
      expect(onLoggedIn).not.toHaveBeenCalled();
    });
  });

  test("shows fallback error message when API returns an error without error text", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/problems with the login/i)).toBeInTheDocument();
    });
  });

  test("shows network error message when fetch fails entirely", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    // Mock a network error by making fetch reject with an error
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection timed out"));

    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "secret123");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/connection timed out/i)).toBeInTheDocument();
    });
  });

  test("calls onGoToSignUp when the sign up button is clicked", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

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
