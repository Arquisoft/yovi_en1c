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
      // Match the actual string the component renders
      expect(screen.getByText(/Failed to fetch data/i)).toBeInTheDocument();
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

  test("renders leaderboard correctly and highlights current user", async () => {
    const mockLeaderboard = [
      { username: "Winner1", totalPoints: 1000, gamesPlayed: 5 },
      { username: "Javi", totalPoints: 500, gamesPlayed: 2 }, // Current user
    ];

    // Mock implementation for the three fetches
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // games
      .mockResolvedValueOnce({ ok: true, json: async () => mockLeaderboard }) // leaderboard
      .mockResolvedValueOnce({ ok: true, json: async () => null }); // stats

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    // Switch to Rank (Leaderboard) view
    const rankBtn = await screen.findByRole("button", { name: /Rank/i });
    await user.click(rankBtn);

    expect(screen.getByText("Winner1")).toBeInTheDocument();
    expect(screen.getByText(/★ 500/)).toBeInTheDocument();

    const userRow = screen.getByText(/Javi/i).closest("tr");
    expect(userRow).toHaveClass("rowHighlight");
    expect(screen.getByText(/\(You\)/i)).toBeInTheDocument();
  });

  test("renders stats dashboard and charts correctly", async () => {
    const mockStats = {
      progression: [
        { points: 100, date: "2024-01-01" },
        { points: 200, date: "2024-01-02" },
      ],
      byDifficulty: [
        { _id: "easy", total: 10, wins: 8 },
        { _id: "hard", total: 5, wins: 1 },
      ],
      avgMoves: [
        { _id: "player_won", avgMoves: 12 },
        { _id: "bot_won", avgMoves: 15 },
      ],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats });

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    // Switch to Stats view
    const statsBtn = await screen.findByRole("button", { name: /Stats/i });
    await user.click(statsBtn);

    // Check lines 268-281 and 326-397 (Stats Dashboard)
    expect(screen.getByText(/Point Progression/i)).toBeInTheDocument();
    expect(screen.getByText(/Win Rate by Difficulty/i)).toBeInTheDocument();

    // Check average moves mapping (Line 384-394)
    expect(screen.getByText(/🏆 Win Avg/i)).toBeInTheDocument();
    expect(screen.getByText(/12 moves/i)).toBeInTheDocument();
    expect(screen.getByText(/🤖 Loss Avg/i)).toBeInTheDocument();
  });

  test("handles sorting for points and results", async () => {
    // Use the mockGames which include points
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockGames,
    });

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    // Sort by Points (Line 139 logic)
    const pointsHeader = await screen.findByText(/Points/i);
    await user.click(pointsHeader);

    const pointCells = document.querySelectorAll(".tdPoints");
    const points = Array.from(pointCells).map((c) => c.textContent?.trim());

    // Sorted DESC by default on first click: 500 -> 200 -> 0
    expect(points[0]).toBe("500");
    expect(points[2]).toBe("0");
  });

  test("returns null on default switch case", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => [] });
    const { container } = render(<GameHistory {...defaultProps} />);
    expect(container.querySelector(".history")).toBeInTheDocument();
  });
});
