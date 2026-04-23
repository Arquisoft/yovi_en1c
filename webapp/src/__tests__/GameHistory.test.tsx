import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GameHistory from "../GameHistory";
import { afterEach, describe, expect, test, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";

// 1. MOCK DE I18NEXT
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Mapeo manual para casos con interpolación o lógica específica
      if (key === "history.subtitle") return `welcome, ${options?.name}`;
      if (key === "history.board_size.small") return "5×5";
      if (key === "history.board_size.medium") return "7×7";
      if (key === "history.board_size.large") return "9×9";
      return key; // Para el resto, devuelve la clave (ej: "history.title")
    },
    i18n: { resolvedLanguage: "en" },
  }),
}));

// Mock de Recharts para evitar errores de renderizado en entorno de test (JSDOM)
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

  test("shows spinner while loading", async () => {
    // Retrasamos el fetch para ver el estado de carga
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); 
    render(<GameHistory {...defaultProps} />);
    
    expect(document.querySelector(".spinner")).toBeInTheDocument();
    expect(screen.getByText("history.loading")).toBeInTheDocument();
  });

  test("fetches games for the correct username", async () => {
    render(<GameHistory {...defaultProps} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("username=Javi"));
    });
  });

  test("renders one row per game", async () => {
    render(<GameHistory {...defaultProps} />);

    await waitFor(() => {
      const rows = document.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(3);
    });

    // Buscamos los badges por su clave de traducción
    expect(screen.getAllByText("history.result.win")).toHaveLength(2);
    expect(screen.getAllByText("history.result.loss")).toHaveLength(1);
  });

  test("filters to show only wins when Wins tab is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const winsTab = await screen.findByRole("button", { name: "history.filter.wins" });
    await user.click(winsTab);

    await waitFor(() => {
      const rows = document.querySelectorAll("tbody tr");
      expect(rows).toHaveLength(2);
      expect(screen.queryByText("history.result.loss")).not.toBeInTheDocument();
    });
  });

  test("sorts by total moves correctly when header is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const movesHeader = await screen.findByText("history.table.moves");
    
    // Primer click (descendente por defecto en tu código)
    await user.click(movesHeader);

    await waitFor(() => {
      const moveCells = document.querySelectorAll(".tdMoves");
      const moves = Array.from(moveCells).map(cell => cell.textContent);
      expect(moves).toEqual(["15", "10", "8"]);
    });

    // Segundo click (ascendente)
    await user.click(movesHeader);
    await waitFor(() => {
      const moveCells = document.querySelectorAll(".tdMoves");
      const moves = Array.from(moveCells).map(cell => cell.textContent);
      expect(moves).toEqual(["8", "10", "15"]);
    });
  });

  test("renders leaderboard correctly and highlights current user", async () => {
    const mockLeaderboard = [
      { username: "Winner1", totalPoints: 1000, gamesPlayed: 5 },
      { username: "Javi", totalPoints: 500, gamesPlayed: 2 },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/leaderboard")) return Promise.resolve({ ok: true, json: async () => mockLeaderboard });
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const rankBtn = await screen.findByRole("button", { name: "history.view.leaderboard" });
    await user.click(rankBtn);

    expect(screen.getByText("Winner1")).toBeInTheDocument();
    const userRow = screen.getByText(/Javi/i).closest("tr");
    expect(userRow).toHaveClass("rowHighlight");
    expect(screen.getByText(/history.leaderboard.you/i)).toBeInTheDocument();
  });

  test("calls onBack when the back button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const backButton = await screen.findByRole("button", { name: "common.back" });
    await user.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  test("renders stats dashboard correctly", async () => {
    const mockStats = {
      progression: [{ points: 100, date: "2024-01-01" }],
      byDifficulty: [{ _id: "easy", total: 10, wins: 8 }],
      avgMoves: [{ _id: "player_won", avgMoves: 12 }],
    };

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/stats")) return Promise.resolve({ ok: true, json: async () => mockStats });
      return Promise.resolve({ ok: true, json: async () => [] });
    });

    const user = userEvent.setup();
    render(<GameHistory {...defaultProps} />);

    const statsBtn = await screen.findByRole("button", { name: "history.view.stats" });
    await user.click(statsBtn);

    expect(screen.getByText("history.stats_view.progression")).toBeInTheDocument();
    expect(screen.getByText("history.stats_view.win_rate_by_difficulty")).toBeInTheDocument();
    expect(screen.getByText("history.stats_view.win_avg")).toBeInTheDocument();
  });
});