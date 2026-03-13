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
    render(<RegisterForm onSuccess={() => {}} />);
    const user = userEvent.setup();

    await waitFor(async () => {
      await user.click(screen.getByRole("button", { name: /lets go!/i }));
      expect(screen.getByText(/please enter a username/i)).toBeInTheDocument();
    });
  });

  test("submits username and displays response", async () => {
    const user = userEvent.setup();

    // Mock fetch to resolve automatically
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Hello Pablo! Welcome to the course!" }),
    } as Response);

    render(<RegisterForm onSuccess={() => {}} />);

    // Wrap interaction + assertion inside waitFor
    await waitFor(async () => {
      await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
      await user.click(screen.getByRole("button", { name: /lets go!/i }));

      // Response message should appear
      expect(
        screen.getByText(/hello pablo! welcome to the course!/i),
      ).toBeInTheDocument();
    });
  });

  test("shows server error message when API fails", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "User already exists" }),
    } as Response);

    render(<RegisterForm onSuccess={() => {}} />);

    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
    });
  });

  test("shows network error message when fetch fails", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Connection lost"));

    render(<RegisterForm onSuccess={() => {}} />);

    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
    });
  });

  test('shows default "Server error" when API fails without error message', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<RegisterForm onSuccess={() => {}} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText("Server error")).toBeInTheDocument();
    });
  });

  test('shows default "Network error" when fetch fails without message', async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValueOnce({});

    render(<RegisterForm onSuccess={() => {}} />);
    await user.type(screen.getByLabelText(/whats your name\?/i), "Pablo");
    await user.click(screen.getByRole("button", { name: /lets go!/i }));

    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeInTheDocument();
    });
  });
});