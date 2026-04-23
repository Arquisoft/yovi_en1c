import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameHistory from "../GameHistory";
import { afterEach, describe, expect, test, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// --- i18n Mock ---
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "history.subtitle": `welcome, ${options?.name}`,
        "history.board_size.small": "5×5",
        "history.board_size.medium": "7×7",
        "history.board_size.large": "9×9",
      };
      return translations[key] || key;
    },
    i18n: { resolvedLanguage: "en" },
  }),
}));

// --- Recharts Mock ---
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

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
];

const defaultProps = {
  onBack: vi.fn(),
  userName: "Javi",
};

describe("GameHistory Full Suite", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/games/list")) return Promise.resolve({ ok: true, json: async () => mockGames });
      if (url.includes("/games/leaderboard")) return Promise.resolve({ ok: true, json: async () => [
        { username: "Winner1", totalPoints: 1000, gamesPlayed: 5 },
        { username: "Javi", totalPoints: 500, gamesPlayed: 2 },
      ] });
      if (url.includes("/games/stats")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ byDifficulty: [], progression: [], avgMoves: [] }),
        });
      }
      return Promise.reject(new Error("Unknown API"));
    });
  });

  afterEach(() => vi.restoreAllMocks());

  test("renders loading state initially", async () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); 
    render(<GameHistory {...defaultProps} />);
    expect(screen.getByText("history.loading")).toBeInTheDocument();
  });

  test("fetches data using the provided username", async () => {
    render(<GameHistory {...defaultProps} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("username=Javi"));
    });
  });

  test("renders table rows for fetched games", async () => {
    render(<GameHistory {...defaultProps} />);
    await waitFor(() => {
      expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
    });
    expect(screen.getByText("history.result.win")).toBeInTheDocument();
    expect(screen.getByText("history.result.loss")).toBeInTheDocument();
  });

  test("filters results when clicking filter tabs", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);
    const winsTab = await screen.findByRole("button", { name: "history.filter.wins" });
    await user.click(winsTab);
    await waitFor(() => {
      expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
      expect(screen.queryByText("history.result.loss")).not.toBeInTheDocument();
    });
  });

  test("sorts table by moves when header is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);
    const movesHeader = await screen.findByText("history.table.moves");
    
    // Descending
    await user.click(movesHeader);
    await waitFor(() => {
      const moves = Array.from(document.querySelectorAll(".tdMoves")).map(c => c.textContent);
      expect(moves).toEqual(["10", "8"]);
    });

    // Ascending
    await user.click(movesHeader);
    await waitFor(() => {
      const moves = Array.from(document.querySelectorAll(".tdMoves")).map(c => c.textContent);
      expect(moves).toEqual(["8", "10"]);
    });
  });

  test("highlights current user in leaderboard", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);
    const rankBtn = await screen.findByRole("button", { name: "history.view.leaderboard" });
    await user.click(rankBtn);

    expect(screen.getByText("Winner1")).toBeInTheDocument();
    const userRow = screen.getByText(/Javi/i).closest("tr");
    expect(userRow).toHaveClass("rowHighlight");
  });

  test("navigates back when back button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);
    const backButton = await screen.findByRole("button", { name: "common.back" });
    await user.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  test("renders stats dashboard sections", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);
    const statsBtn = await screen.findByRole("button", { name: "history.view.stats" });
    await user.click(statsBtn);
    expect(screen.getByText("history.stats_view.progression")).toBeInTheDocument();
  });
});