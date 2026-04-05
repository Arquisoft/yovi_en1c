import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameHistory from "../GameHistory";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

const mockGames = [
  {
    _id: "1",
    result: "player_won",
    totalMoves: 10,
    playedAt: "2024-01-01T10:00:00.000Z",
    board: {},
  },
  {
    _id: "2",
    result: "bot_won",
    totalMoves: 8,
    playedAt: "2024-01-02T12:00:00.000Z",
    board: {},
  },
  {
    _id: "3",
    result: "player_won",
    totalMoves: 15,
    playedAt: "2024-01-03T09:00:00.000Z",
    board: {},
  },
];

const defaultProps = {
  onBack: vi.fn(),
  userName: "Javi",
};

describe("GameHistory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Loading & fetching ────────────────────────────────────────────────────

  test("shows spinner while loading", () => {
    global.fetch = vi.fn().mockReturnValueOnce(new Promise(() => {}));

    render(<GameHistory {...defaultProps} />);

    expect(screen.getByText(/loading history/i)).toBeInTheDocument();
  });

  test("fetches games for the correct username", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("username=Javi"),
      );
    });
  });

  // ─── Error states ──────────────────────────────────────────────────────────

  test("shows error message when API returns a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP/i)).toBeInTheDocument();
    });
  });

  test("shows error message when fetch fails entirely", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Connection timed out"));

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/connection timed out/i)).toBeInTheDocument();
    });
  });

  // ─── Empty state ───────────────────────────────────────────────────────────

  test("shows empty state message when user has no games", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/no games played yet/i)).toBeInTheDocument();
    });
  });

  // ─── Stats bar ─────────────────────────────────────────────────────────────

  test("renders stats bar with correct totals", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const { container } = render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      // FIX: We use a standard querySelectorAll on the container to safely find elements by class
      const statValues = container.querySelectorAll(".statValue");
      const valuesText = Array.from(statValues).map((el) =>
        el.textContent?.trim(),
      );

      expect(valuesText).toContain("3");
      expect(valuesText).toContain("2");
      expect(valuesText).toContain("1");
      expect(valuesText).toContain("67%");
    });
  });

  // ─── Table rendering ───────────────────────────────────────────────────────

  test("renders one row per game", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      // FIX: Filter out upper filter tab buttons to prevent false positives
      const winBadges = screen
        .getAllByText(/🏆 Win/i)
        .filter((el) => el.tagName !== "BUTTON");
      const lossBadges = screen
        .getAllByText(/🤖 Loss/i)
        .filter((el) => el.tagName !== "BUTTON");

      expect(winBadges).toHaveLength(2);
      expect(lossBadges).toHaveLength(1);
    });
  });

  test("displays the correct number of moves per game", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      // FIX: Narrow down the search to specific cells that contain the "tdMoves" class
      const moveCells = screen
        .getAllByRole("cell")
        .filter((cell) => cell.className.includes("tdMoves"));
      const moves = moveCells.map((cell) => cell.textContent);

      expect(moves).toContain("10");
      expect(moves).toContain("8");
      expect(moves).toContain("15");
    });
  });

  // ─── Filter tabs ───────────────────────────────────────────────────────────

  test("filters to show only wins when 'Wins' tab is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    await waitFor(() => screen.getByRole("button", { name: /🏆 Wins/i }));
    await user.click(screen.getByRole("button", { name: /🏆 Wins/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/🏆 Win/i).filter((el) => el.tagName !== "BUTTON"),
      ).toHaveLength(2);

      const tableCells = screen.getAllByRole("cell");
      const hasLosses = tableCells.some((cell) =>
        cell.textContent?.includes("Loss"),
      );
      expect(hasLosses).toBe(false);
    });
  });

  test("filters to show only losses when 'Losses' tab is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    await waitFor(() => screen.getByRole("button", { name: /🤖 Losses/i }));
    await user.click(screen.getByRole("button", { name: /🤖 Losses/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/🤖 Loss/i).filter((el) => el.tagName !== "BUTTON"),
      ).toHaveLength(1);

      const tableCells = screen.getAllByRole("cell");
      const hasWins = tableCells.some((cell) =>
        cell.textContent?.includes("Win"),
      );
      expect(hasWins).toBe(false);
    });
  });

  test("shows all games again when 'All' tab is clicked after filtering", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    await waitFor(() => screen.getByRole("button", { name: /🏆 Wins/i }));
    await user.click(screen.getByRole("button", { name: /🏆 Wins/i }));
    await user.click(screen.getByRole("button", { name: /^All$/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/🏆 Win/i).filter((el) => el.tagName !== "BUTTON"),
      ).toHaveLength(2);
      expect(
        screen.getAllByText(/🤖 Loss/i).filter((el) => el.tagName !== "BUTTON"),
      ).toHaveLength(1);
    });
  });

  // ─── Sorting ───────────────────────────────────────────────────────────────

  test("toggles sort direction when the same column header is clicked twice", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    // FIX: Using findByText to implicitly wait for the initial load to finish before user interaction
    const movesHeader = await screen.findByText(/Moves/i);

    await user.click(movesHeader);
    await waitFor(() => expect(screen.getByText("↓")).toBeInTheDocument());

    await user.click(movesHeader);
    await waitFor(() => expect(screen.getByText("↑")).toBeInTheDocument());
  });

  test("shows sort arrow only on the active column", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const movesHeader = await screen.findByText(/Moves/i);
    await user.click(movesHeader);

    await waitFor(() => {
      expect(screen.getAllByText("↕")).toHaveLength(4);
      expect(screen.getByText("↓")).toBeInTheDocument();
    });
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  test("calls onBack when the back button is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);

    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} onBack={onBack} />);

    const backButton = await screen.findByRole("button", { name: /← Back/i });
    await user.click(backButton);

    expect(onBack).toHaveBeenCalledOnce();
  });
});
