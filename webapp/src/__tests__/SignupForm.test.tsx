import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import SignUpForm from "../SignupForm";
import "@testing-library/jest-dom";

describe("SignUpForm", () => {
            const onRegistered = vi.fn();
        const onGoToLogin = vi.fn();

        beforeEach(() => {
        vi.clearAllMocks();

        global.fetch = vi.fn();
  });

  const fillForm = async (
    user: ReturnType<typeof userEvent.setup>,
    {
      username = "Pablo",
      email = "pablo@test.com",
      password = "abc123",
      confirmPassword = "abc123",
    } = {}
  ) => {
        await user.type(screen.getByLabelText(/username/i), username);
        await user.type(screen.getByLabelText(/email/i), email);
    await user.type(screen.getByLabelText(/^password$/i), password);
        await user.type(screen.getByLabelText(/confirm password/i), confirmPassword);
  };

  it("renders all form fields and buttons", () => {
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /log in here/i })).toBeInTheDocument();
  });

  it("calls onGoToLogin when 'Log in here' is clicked", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await user.click(screen.getByRole("button", { name: /log in here/i }));

    expect(onGoToLogin).toHaveBeenCalledTimes(1);
  });

  it("shows error if all fields are empty on submit", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

        await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("shows error if username is only whitespace", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user, { username: "   " });
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("shows error if passwords do not match", async () => {
    const user = userEvent.setup();
    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user, { confirmPassword: "xyz999" });
    await user.click(screen.getByRole("button", { name: /sign up/i }));

        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
        expect(onRegistered).not.toHaveBeenCalled();
    });

    it("calls onRegistered with username on successful signup", async () => {
    const user = userEvent.setup();

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

   const mockResponse = JSON.stringify({ 
            token: "abc.def.ghi", 
            user: { username: "Pablo" } 
        });

        (global.fetch as any).mockResolvedValue({
            ok: true,
            text: async () => mockResponse,
        });

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith("Pablo");
      expect(setItemSpy).toHaveBeenCalledWith("token", expect.any(String));
      expect(setItemSpy).toHaveBeenCalledWith("username", "Pablo");
    });
    setItemSpy.mockRestore();
  });

  it("shows server error message when signup fails", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: "Username already exists" }),
    });

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/username already exists/i)).toBeInTheDocument();
    });
    expect(onRegistered).not.toHaveBeenCalled();
  });

  it("shows fallback error when server returns non-JSON", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => "Internal Server Error",
    });

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/unexpected server response/i)).toBeInTheDocument();
    });
  });

  it("shows network error when fetch throws", async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it("clears previous error on new submit attempt", async () => {
        const user = userEvent.setup();
        global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message: "ok" }),
    });

        render(            <SignUpForm                 onRegistered={onRegistered}                 onGoToLogin={onGoToLogin} />);

    // Trigger error first
    await fillForm(user, { confirmPassword: "wrong" });
        await user.click(screen.getByRole("button", { name: /sign up/i }));
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();

    // Fix and resubmit
    await user.clear(screen.getByLabelText(/confirm password/i));
    await user.type(screen.getByLabelText(/confirm password/i), "abc123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });
    });

    it("covers the sanitization logic (else block) when data is unsafe", async () => {
  const user = userEvent.setup();
  const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

 const mockDirtyResponse = JSON.stringify({ 
            token: "valid.token.format", 
            user: { username: "pablo<script>" } 
        });

        global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => mockDirtyResponse,
  });

  render(<SignUpForm onRegistered={onRegistered} onGoToLogin={onGoToLogin} />);

  await user.type(screen.getByLabelText(/username/i), "pablo");
  await user.type(screen.getByLabelText(/email/i), "pablo@test.com");
  await user.type(screen.getByLabelText(/^password$/i), "123456");
  await user.type(screen.getByLabelText(/confirm password/i), "123456");
  await user.click(screen.getByRole("button", { name: /sign up/i }));

  await waitFor(() => {
    expect(setItemSpy).toHaveBeenCalledWith("token", "valid.token.format"); 
    expect(setItemSpy).toHaveBeenCalledWith("username", "pabloscript");
  });
setItemSpy.mockRestore();
});

});
