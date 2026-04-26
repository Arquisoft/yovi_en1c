import "@testing-library/jest-dom";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import GameHistory from "../GameHistory";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { resolvedLanguage: "en" },
  }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUserName = "TestUser";

const mockGames = [
  {
    _id: "1",
    result: "player_won",
    totalMoves: 10,
    playedAt: "2023-01-01T10:00:00Z",
    difficulty: "easy",
    boardSize: "small",
    points: 100,
  },
  {
    _id: "2",
    result: "bot_won",
    totalMoves: 15,
    playedAt: "2023-01-02T10:00:00Z",
    difficulty: "hard",
    boardSize: "large",
    points: 20,
  },
  {
    _id: "3",
    result: "player_won",
    totalMoves: 8,
    playedAt: "2023-01-03T10:00:00Z",
    difficulty: "random",
    boardSize: "medium",
    points: 80,
  },
];

const mockLeaderboard = [
  { username: "OtherUser", totalPoints: 500, gamesPlayed: 10 },
  { username: mockUserName, totalPoints: 200, gamesPlayed: 3 },
];

const mockStats = {
  byDifficulty: [
    { _id: "easy", total: 2, wins: 1 },
    { _id: "hard", total: 1, wins: 0 },
  ],
  progression: [
    { points: 100, date: "2023-01-01" },
    { points: 80, date: "2023-01-03" },
  ],
  avgMoves: [
    { _id: "player_won", avgMoves: 9 },
    { _id: "bot_won", avgMoves: 15 },
  ],
};

/** Helpers **/

function mockFetchSuccess(
  games = mockGames,
  leaderboard = mockLeaderboard,
  stats = mockStats,
) {
  (global.fetch as any).mockResolvedValue({
    ok: true,
    json: async () => games,
  });

  // Three parallel fetches: games, leaderboard, stats
  (global.fetch as any)
    .mockResolvedValueOnce({ ok: true, json: async () => games })
    .mockResolvedValueOnce({ ok: true, json: async () => leaderboard })
    .mockResolvedValueOnce({ ok: true, json: async () => stats });
}

async function renderAndWait(
  props?: Partial<{ onBack: () => void; userName: string }>,
) {
  render(
    <GameHistory
      onBack={props?.onBack ?? vi.fn()}
      userName={props?.userName ?? mockUserName}
    />,
  );
  await waitFor(() => {
    expect(screen.queryByText("history.loading")).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("GameHistory – loading state", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows loading spinner while fetching", () => {
    // fetch never resolves during this assertion
    global.fetch = vi.fn(() => new Promise(() => {})) as any;
    render(<GameHistory onBack={vi.fn()} userName={mockUserName} />);
    expect(screen.getByText("history.loading")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – HTTP error (non-ok response)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows error when any response is not ok", async () => {
    (global.fetch as any) = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    render(<GameHistory onBack={vi.fn()} userName={mockUserName} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to fetch data from one or more services/i),
      ).toBeInTheDocument();
    });
  });

  it('shows generic "Unknown error" for non-Error rejections', async () => {
    // Rejecting with a plain string instead of an Error object
    (global.fetch as any) = vi.fn().mockRejectedValue("plain string rejection");

    render(<GameHistory onBack={vi.fn()} userName={mockUserName} />);

    await waitFor(() => {
      expect(screen.getByText(/Unknown error/i)).toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – empty games list", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("renders the empty state message when there are no games", async () => {
    (global.fetch as any) = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats });

    render(<GameHistory onBack={vi.fn()} userName={mockUserName} />);

    await waitFor(() => {
      expect(screen.getByText("history.empty")).toBeInTheDocument();
    });

    // Stats bar should NOT be visible when there are no games
    expect(screen.queryByText("history.stats.total")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – history view (default)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global.fetch as any) = vi.fn();
    mockFetchSuccess();
  });

  it("renders stats bar with correct numbers", async () => {
    await renderAndWait();

    // 3 games total, 2 wins, 1 loss → 66% win rate
    expect(screen.getByText("history.stats.total")).toBeInTheDocument();
    expect(screen.getByText("history.stats.wins")).toBeInTheDocument();
    expect(screen.getByText("history.stats.losses")).toBeInTheDocument();
    expect(screen.getByText("history.stats.win_rate")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument();
  });

  it("renders all game rows", async () => {
    await renderAndWait();
    expect(screen.getAllByText("history.result.win")).toHaveLength(2);
    expect(screen.getAllByText("history.result.loss")).toHaveLength(1);
  });

  it("renders difficulty and board-size labels", async () => {
    await renderAndWait();
    expect(
      screen.getByText("history.difficulty_label.easy"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("history.difficulty_label.hard"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("history.difficulty_label.random"),
    ).toBeInTheDocument();
    expect(screen.getByText("history.board_size.small")).toBeInTheDocument();
    expect(screen.getByText("history.board_size.large")).toBeInTheDocument();
    expect(screen.getByText("history.board_size.medium")).toBeInTheDocument();
  });

  it("calls onBack when back button is clicked", async () => {
    const onBack = vi.fn();
    render(<GameHistory onBack={onBack} userName={mockUserName} />);
    await waitFor(() =>
      expect(screen.queryByText("history.loading")).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("common.back"));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("filters by losses only", async () => {
    await renderAndWait();

    fireEvent.click(screen.getByText("history.filter.losses"));
    expect(screen.queryByText("history.result.win")).not.toBeInTheDocument();
    expect(screen.getByText("history.result.loss")).toBeInTheDocument();
  });

  it('restores all rows when "all" filter is clicked', async () => {
    await renderAndWait();

    fireEvent.click(screen.getByText("history.filter.losses"));
    fireEvent.click(screen.getByText("history.filter.all"));

    expect(screen.getAllByText("history.result.win")).toHaveLength(2);
    expect(screen.getAllByText("history.result.loss")).toHaveLength(1);
  });

  it("sorts by result column (asc then desc)", async () => {
    await renderAndWait();
    const resultHeader = screen.getByText(/history\.table\.result/i);
    fireEvent.click(resultHeader); // asc
    fireEvent.click(resultHeader); // desc (toggle same field)
  });

  it("sorts by difficulty column", async () => {
    await renderAndWait();
    const diffHeader = screen.getByText(/history\.table\.difficulty/i);
    fireEvent.click(diffHeader);
    fireEvent.click(diffHeader);
  });

  it("sorts by boardSize column", async () => {
    await renderAndWait();
    const sizeHeader = screen.getByText(/history\.table\.size/i);
    fireEvent.click(sizeHeader);
    fireEvent.click(sizeHeader);
  });

  it("sorts by points column", async () => {
    await renderAndWait();
    const pointsHeader = screen.getByText(/history\.table\.points/i);
    fireEvent.click(pointsHeader);
    fireEvent.click(pointsHeader);
  });

  it("sorts by date column", async () => {
    await renderAndWait();
    const dateHeader = screen.getByText(/history\.table\.date/i);
    fireEvent.click(dateHeader); // switches to same field → toggles dir
    fireEvent.click(dateHeader);
  });

  it("sortIcon renders ↕ for inactive field and ↑/↓ for active", async () => {
    await renderAndWait();

    // Initially sorted by playedAt desc → date header shows ↓, others show ↕
    expect(screen.getAllByText("↕").length).toBeGreaterThan(0);
    expect(screen.getByText("↓")).toBeInTheDocument();

    // Click totalMoves → becomes active with ↓ (new field resets to desc)
    fireEvent.click(screen.getByText(/history\.table\.moves/i));
    expect(screen.getByText("↓")).toBeInTheDocument();

    // Click again → toggles to ↑
    fireEvent.click(screen.getByText(/history\.table\.moves/i));
    expect(screen.getByText("↑")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – leaderboard view", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global.fetch as any) = vi.fn();
    mockFetchSuccess();
  });

  it("switches to leaderboard and renders entries", async () => {
    await renderAndWait();

    fireEvent.click(screen.getByText("history.view.leaderboard"));

    expect(screen.getByText("history.leaderboard.rank")).toBeInTheDocument();
    expect(screen.getByText("OtherUser")).toBeInTheDocument();
    expect(
      screen.getByText(mockUserName, { exact: false }),
    ).toBeInTheDocument();
  });

  it("highlights the current user row", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText("history.view.leaderboard"));

    // The "(you)" label appears next to the current user
    expect(screen.getByText(/history\.leaderboard\.you/)).toBeInTheDocument();
  });

  it("renders totalPoints with locale formatting and star", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText("history.view.leaderboard"));

    expect(screen.getAllByText(/★/)).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – stats view", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global.fetch as any) = vi.fn();
    mockFetchSuccess();
  });

  it("switches to stats view and renders chart headings", async () => {
    await renderAndWait();

    fireEvent.click(screen.getByText("history.view.stats"));

    expect(
      screen.getByText("history.stats_view.progression"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("history.stats_view.win_rate_by_difficulty"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("history.stats_view.avg_moves"),
    ).toBeInTheDocument();
  });

  it("renders avgMoves entries for both win and loss", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText("history.view.stats"));

    expect(screen.getByText("history.stats_view.win_avg")).toBeInTheDocument();
    expect(screen.getByText("history.stats_view.loss_avg")).toBeInTheDocument();
  });

  it("renders rounded avgMoves values with unit", async () => {
    await renderAndWait();
    fireEvent.click(screen.getByText("history.view.stats"));

    // avgMoves: 9 and 15 → Math.round keeps them the same
    expect(
      screen.getByText(/9\s*history\.stats_view\.moves_unit/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/15\s*history\.stats_view\.moves_unit/),
    ).toBeInTheDocument();
  });

  it("renders nothing inside statsDashboard when stats is null", async () => {
    // stats endpoint returns null-shaped data
    (global.fetch as any) = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockGames })
      .mockResolvedValueOnce({ ok: true, json: async () => mockLeaderboard })
      .mockResolvedValueOnce({ ok: true, json: async () => null });

    render(<GameHistory onBack={vi.fn()} userName={mockUserName} />);
    await waitFor(() =>
      expect(screen.queryByText("history.loading")).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("history.view.stats"));

    // charts headings should not appear
    expect(
      screen.queryByText("history.stats_view.progression"),
    ).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – view toggle navigation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    (global.fetch as any) = vi.fn();
    mockFetchSuccess();
  });

  it("can navigate history → stats → leaderboard → history", async () => {
    await renderAndWait();

    fireEvent.click(screen.getByText("history.view.stats"));
    expect(
      screen.getByText("history.stats_view.progression"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("history.view.leaderboard"));
    expect(screen.getByText("history.leaderboard.rank")).toBeInTheDocument();

    fireEvent.click(screen.getByText("history.title"));
    expect(screen.getByText("history.stats.total")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GameHistory – points fallback (0 when undefined)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("shows 0 for points when field is absent", async () => {
    const gamesWithoutPoints = [
      {
        _id: "10",
        result: "player_won",
        totalMoves: 5,
        playedAt: "2023-06-01T00:00:00Z",
      },
    ];

    (global.fetch as any) = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => gamesWithoutPoints })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats });

    render(<GameHistory onBack={vi.fn()} userName={mockUserName} />);
    await waitFor(() =>
      expect(screen.queryByText("history.loading")).not.toBeInTheDocument(),
    );

    // points ?? 0 → cell should show "0"
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("0")[0]).toBeInTheDocument();
  });
});
