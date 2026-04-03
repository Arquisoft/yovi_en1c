import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../RegisterForm";
import { describe, expect, vi } from "vitest";
import "@testing-library/jest-dom";

<<<<<<< HEAD
describe("RegisterForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows validation error when username or password is empty", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
=======
describe("LoginForm", () => {
  it("shows an error if username and password are empty", async () => {
>>>>>>> 8e6b29864178a7153f280883293477034189e13a
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

    render(
<<<<<<< HEAD
      <RegisterForm
=======
      <LoginForm
>>>>>>> 8e6b29864178a7153f280883293477034189e13a
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );
<<<<<<< HEAD

    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    expect(
      screen.getByText(/please enter both username and password/i)
    ).toBeInTheDocument();
  });

  test("submits credentials and calls onLoggedIn", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
=======

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
>>>>>>> 8e6b29864178a7153f280883293477034189e13a
    const user = userEvent.setup();
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();

<<<<<<< HEAD
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: "fake-token",
        user: { username: "Pablo" },
      }),
    } as Response);

    render(
      <RegisterForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "abc123");
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
      json: async () => ({ error: "Invalid credentials" }),
    } as Response);

    render(
      <RegisterForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "wrongpass");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      expect(onLoggedIn).not.toHaveBeenCalled();
    });
  });

  test("shows network error message when fetch fails", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Connection timed out"));

    render(
      <RegisterForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.type(screen.getByLabelText(/what's your username\?/i), "Pablo");
    await user.type(screen.getByLabelText(/and password\?/i), "abc123");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/connection timed out/i)).toBeInTheDocument();
    });
  });

  test("calls onGoToSignUp when sign up button is clicked", async () => {
    const onLoggedIn = vi.fn();
    const onGoToSignUp = vi.fn();
    const user = userEvent.setup();

    render(
      <RegisterForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.click(screen.getByRole("button", { name: /sign up here/i }));

    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
=======
    render(
      <LoginForm
        onLoggedIn={onLoggedIn}
        onGoToSignUp={onGoToSignUp}
      />
    );

    await user.click(screen.getByRole("button", { name: /sign up here/i }));

    expect(onGoToSignUp).toHaveBeenCalledTimes(1);
  });
>>>>>>> 8e6b29864178a7153f280883293477034189e13a
});