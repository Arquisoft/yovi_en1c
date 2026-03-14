import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterForm from "../RegisterForm";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

describe("RegisterForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("shows validation error when username is empty", async () => {
    const onRegistered = vi.fn();
    render(<RegisterForm onRegistered={onRegistered} />);
    const user = userEvent.setup();

    await waitFor(async () => {
      await user.click(screen.getByRole("button", { name: /lets go!/i }));
      expect(screen.getByText(/please enter a username/i)).toBeInTheDocument();
    });
  });

  test("submits username and calls onRegistered", async () => {
    const onRegistered = vi.fn();
    const user = userEvent.setup();

    // 1. Mock the fetch to return a successful "ok" response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Success" }),
    } as Response);

    render(<RegisterForm onRegistered={onRegistered} />);

    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    // 2. Now onRegistered will be called because res.ok is true
    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith("Pablo");
    });
  });

  test("submits username successfully via API", async () => {
    const onRegistered = vi.fn();
    const user = userEvent.setup();

    // Mock successful API response
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);

    render(<RegisterForm onRegistered={onRegistered} />);

    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(onRegistered).toHaveBeenCalledWith("Pablo");
    });
  });

  test("shows server error message when API returns an error", async () => {
    const onRegistered = vi.fn();
    const user = userEvent.setup();

    // Mock API error (e.g., 400 Bad Request)
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "User already exists" }),
    } as Response);

    render(<RegisterForm onRegistered={onRegistered} />);

    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
      expect(onRegistered).not.toHaveBeenCalled();
    });
  });

  test("shows network error message when fetch fails entirely", async () => {
    const onRegistered = vi.fn();
    const user = userEvent.setup();

    // Mock a network crash/timeout
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection timed out"));

    render(<RegisterForm onRegistered={onRegistered} />);

    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/connection timed out/i)).toBeInTheDocument();
    });
  });
});
