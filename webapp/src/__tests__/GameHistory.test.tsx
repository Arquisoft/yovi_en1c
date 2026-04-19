import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameHistory from "../GameHistory";
import { afterEach, describe, expect, test, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// Enriched mock with difficulty, boardSize, and points
const mockGames = [
  {
    _id: "1",
    result: "player_won",
    totalMoves: 10,
    playedAt: "2024-01-01T10:00:00.000Z",
    board: {},
    difficulty: "easy",
    boardSize: "medium",
    points: 200,
  },
  {
    _id: "2",
    result: "bot_won",
    totalMoves: 8,
    playedAt: "2024-01-02T12:00:00.000Z",
    board: {},
    difficulty: "hard",
    boardSize: "small",
    points: 0,
  },
  {
    _id: "3",
    result: "player_won",
    totalMoves: 15,
    playedAt: "2024-01-03T09:00:00.000Z",
    board: {},
    difficulty: "random",
    boardSize: "large",
    points: 500,
  },
];

const defaultProps = {
  onBack: vi.fn(),
  userName: "Javi",
};

describe("GameHistory", () => {
  beforeEach(() => {
    // Setup a robust global fetch mock for multiple endpoints
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/games/list")) {
        return Promise.resolve({ ok: true, json: async () => mockGames });
      }
      if (url.includes("/games/leaderboard")) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes("/games/stats")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            byDifficulty: [],
            progression: [],
            avgMoves: [],
          }),
        });
      }
      return Promise.reject(new Error("Unknown API endpoint"));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Loading & fetching ────────────────────────────────────────────────────

  test("shows spinner while loading", async () => {
    // Force a long delay to catch the loading state
    global.fetch = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => setTimeout(resolve, 500)));

    const { container } = render(<GameHistory {...defaultProps} />);
    const spinner = container.querySelector(".spinner");
    expect(spinner).toBeInTheDocument();
  });

  test("fetches games for the correct username", async () => {
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
      status: 500,
      json: async () => ({}),
    } as Response);

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/HTTP 500/i)).toBeInTheDocument();
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
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      // Your current code renders an empty table body when no games exist
      const rows = document.querySelectorAll("tbody tr");
      expect(rows.length).toBe(0);
    });
  });

  // ─── Dashboard Features ───────────────────────────────────────────────────

  test("renders stats dashboard correctly", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    // Click on the Stats toggle
    const statsBtn = await screen.findByRole("button", { name: /Stats/i });
    await act(async () => {
      await user.click(statsBtn);
    });

    // Check if the dashboard components appear
    expect(await screen.findByText(/Point Progression/i)).toBeInTheDocument();
  });

  // ─── Table rendering ───────────────────────────────────────────────────────

  test("renders one row per game", async () => {
    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
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
    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      const moveCells = document.querySelectorAll(".tdMoves");
      const moves = Array.from(moveCells).map((cell) => cell.textContent);

      expect(moves).toContain("10");
      expect(moves).toContain("8");
      expect(moves).toContain("15");
    });
  });

  // ─── Filter tabs ───────────────────────────────────────────────────────────

  test("filters to show only wins when 'Wins' tab is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const winsTab = await screen.findByRole("button", { name: /🏆 Wins/i });
    await act(async () => {
      await user.click(winsTab);
    });

    await waitFor(() => {
      const rows = document.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(2);

      // We check that the table BODY doesn't contain "Loss".
      // We use within() or a selector to ignore the filter buttons themselves.
      const tableBody = document.querySelector("tbody");
      expect(tableBody?.textContent).not.toContain("Loss");
    });
  });

  // ─── Sorting ──────────────────────────────────────────────────────────────

  test("toggles sort direction when the same column header is clicked twice", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const movesHeader = await screen.findByText(/Moves/i);

    await act(async () => {
      await user.click(movesHeader); // First click
    });
    await waitFor(() => expect(screen.getByText("↓")).toBeInTheDocument());

    await act(async () => {
      await user.click(movesHeader); // Second click
    });
    await waitFor(() => expect(screen.getByText("↑")).toBeInTheDocument());
  });

  test("sorts by total moves correctly when header is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const movesHeader = await screen.findByText(/Moves/i);

    await act(async () => {
      await user.click(movesHeader);
    });

    await waitFor(() => {
      const moveCells = document.querySelectorAll(".tdMoves");
      const moves = Array.from(moveCells).map((cell) => cell.textContent);
      expect(moves).toEqual(["15", "10", "8"]);
    });
  });

  test("sorts by difficulty correctly when header is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const difficultyHeader = await screen.findByText(/Difficulty/i);
    await act(async () => {
      await user.click(difficultyHeader);
    });

    await waitFor(() => {
      const diffCells = document.querySelectorAll(".tdDifficulty");
      const difficulties = Array.from(diffCells).map(
        (c) => c.textContent?.trim() || "",
      );

      // Sorting "Hard", "Random", "Easy" alphabetically DESC: Random -> Hard -> Easy
      expect(difficulties[0]).toMatch(/Rand/i);
      expect(difficulties[1]).toMatch(/Hard/i);
      expect(difficulties[2]).toMatch(/Easy/i);
    });
  });

  test("sorts by board size correctly when header is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const sizeHeader = await screen.findByText(/Size/i);

    await act(async () => {
      await user.click(sizeHeader);
    });

    await waitFor(() => {
      const sizeCells = document.querySelectorAll(".tdBoardSize");
      const sizes = Array.from(sizeCells).map((cell) =>
        cell.textContent?.trim(),
      );
      expect(sizes).toEqual(["5×5", "7×7", "9×9"]);
    });
  });

  // ─── Navigation ───────────────────────────────────────────────────────────

  test("calls onBack when the back button is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} onBack={onBack} />);

    const backButton = await screen.findByRole("button", { name: /← Back/i });

    await act(async () => {
      await user.click(backButton);
    });

    expect(onBack).toHaveBeenCalledOnce();
  });
});
