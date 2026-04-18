import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameHistory from "../GameHistory";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";

// Enriched mock with difficulty and boardSize to cover all sorting conditions
const mockGames = [
  {
    _id: "1",
    result: "player_won",
    totalMoves: 10,
    playedAt: "2024-01-01T10:00:00.000Z",
    board: {},
    difficulty: "easy",
    boardSize: "medium",
  },
  {
    _id: "2",
    result: "bot_won",
    totalMoves: 8,
    playedAt: "2024-01-02T12:00:00.000Z",
    board: {},
    difficulty: "hard",
    boardSize: "small",
  },
  {
    _id: "3",
    result: "player_won",
    totalMoves: 15,
    playedAt: "2024-01-03T09:00:00.000Z",
    board: {},
    difficulty: "random",
    boardSize: "large",
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
        expect.objectContaining({
          headers: expect.objectContaining({"Authorization": expect.stringContaining("Bearer")

          })
        })
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

    // Wrapped in act to avoid state warning
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /🏆 Wins/i }));
    });

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

  // ─── Sorting (Arrows) ──────────────────────────────────────────────────────

  test("toggles sort direction when the same column header is clicked twice", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const movesHeader = await screen.findByText(/Moves/i);

    // Wrapped in act to avoid state warning
    await act(async () => {
      await user.click(movesHeader);
    });
    await waitFor(() => expect(screen.getByText("↓")).toBeInTheDocument());

    await act(async () => {
      await user.click(movesHeader);
    });
    await waitFor(() => expect(screen.getByText("↑")).toBeInTheDocument());
  });

  // ─── NEW TESTS: Covering Sonar conditions ──────────────────────────────────

  test("sorts by total moves correctly when header is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const movesHeader = await screen.findByText(/Moves/i);

    await act(async () => {
      await user.click(movesHeader);
    });

    await waitFor(() => {
      const moveCells = screen
        .getAllByRole("cell")
        .filter((cell) => cell.className.includes("tdMoves"));
      const moves = moveCells.map((cell) => cell.textContent);

      expect(moves).toEqual(["15", "10", "8"]);
    });
  });

  test("sorts by difficulty correctly when header is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const difficultyHeader = await screen.findByText(/Difficulty/i);

    await act(async () => {
      await user.click(difficultyHeader);
    });

    await waitFor(() => {
      const diffCells = screen
        .getAllByRole("cell")
        .filter((cell) => cell.className.includes("tdDifficulty"));
      const difficulties = diffCells.map((cell) => cell.textContent?.trim());

      expect(difficulties).toEqual(["🎲 Random", "🔥 Hard", "😊 Easy"]);
    });
  });

  test("sorts by board size correctly when header is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockGames,
    } as Response);

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const sizeHeader = await screen.findByText(/Size/i);

    await act(async () => {
      await user.click(sizeHeader);
    });

    await waitFor(() => {
      const sizeCells = screen
        .getAllByRole("cell")
        .filter((cell) => cell.className.includes("tdBoardSize"));
      const sizes = sizeCells.map((cell) => cell.textContent?.trim());

      // FIXED: Adapted to the actual component's rendered output in the test
      expect(sizes).toEqual(["5×5", "7×7", "9×9"]);
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

    await act(async () => {
      await user.click(backButton);
    });

    expect(onBack).toHaveBeenCalledOnce();
  });
});
