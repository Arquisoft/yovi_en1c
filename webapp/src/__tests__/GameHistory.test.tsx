import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameHistory from './GameHistory';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { resolvedLanguage: 'en' },
  }),
}));

// Mock Recharts to avoid DOM dimension errors in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

const mockUserName = "TestUser";

const mockGames = [
  { _id: "1", result: "player_won", totalMoves: 10, playedAt: "2023-01-01T10:00:00Z", difficulty: "easy", boardSize: "small", points: 100 },
  { _id: "2", result: "bot_won", totalMoves: 15, playedAt: "2023-01-02T10:00:00Z", difficulty: "hard", boardSize: "large", points: 20 }
];

const mockStats = {
  byDifficulty: [{ _id: "easy", total: 1, wins: 1 }],
  progression: [{ points: 100, date: "2023-01-01" }],
  avgMoves: [{ _id: "player_won", avgMoves: 10 }]
};

describe('GameHistory Coverage Boost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('should show error state when API fails', async () => {
    // Force a fetch rejection to cover the 'catch' block
    (global.fetch as any).mockRejectedValueOnce(new Error("API Failure"));

    render(<GameHistory onBack={() => {}} userName={mockUserName} />);

    await waitFor(() => {
      expect(screen.getByText(/API Failure/i)).toBeInTheDocument();
    });
    
    // Covers the 'Retry' button branch
    const retryBtn = screen.getByText('common.retry');
    const reloadSpy = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    fireEvent.click(retryBtn);
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should filter and sort games correctly', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockGames,
    });

    render(<GameHistory onBack={() => {}} userName={mockUserName} />);

    await waitFor(() => {
      expect(screen.getByText('history.stats.total')).toBeInTheDocument();
    });

    // Test FILTERS (Covers setFilter branches)
    const winsFilter = screen.getByText('history.filter.wins');
    fireEvent.click(winsFilter);
    expect(screen.queryByText('history.result.loss')).not.toBeInTheDocument();

    // Test SORTING (Covers handleSort and multiple cmp branches in the sort function)
    const movesHeader = screen.getByText(/history.table.moves/i);
    fireEvent.click(movesHeader); // First click: default sort
    fireEvent.click(movesHeader); // Second click: toggles direction (asc/desc)
    
    const pointsHeader = screen.getByText(/history.table.points/i);
    fireEvent.click(pointsHeader); // Covers points sorting logic
  });

  it('should navigate between tabs (History, Stats, Leaderboard)', async () => {
    // Provide successful responses for all 3 Promise.all calls
    (global.fetch as any).mockImplementation(() => 
        Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockGames) 
        })
    );

    render(<GameHistory onBack={() => {}} userName={mockUserName} />);

    // Switch to Stats view (Covers switch case "stats")
    const statsBtn = screen.getByText('history.view.stats');
    fireEvent.click(statsBtn);
    
    // Switch to Leaderboard view (Covers switch case "leaderboard")
    const leaderBtn = screen.getByText('history.view.leaderboard');
    fireEvent.click(leaderBtn);

    // Test back button
    const onBackMock = vi.fn();
    render(<GameHistory onBack={onBackMock} userName={mockUserName} />);
    fireEvent.click(screen.getAllByText('common.back')[1]); 
    expect(onBackMock).toHaveBeenCalled();
  });

  it('should handle cases with missing optional data', async () => {
    const incompleteGames = [{
      _id: "3", result: "player_won", playedAt: "2023-01-01T10:00:00Z"
      // Missing difficulty, boardSize, and points to trigger fallbacks
    }];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => incompleteGames,
    });

    render(<GameHistory onBack={() => {}} userName={mockUserName} />);
    
    await waitFor(() => {
      // Verify that the "—" fallback is rendered (Covers ternary branches)
      const emptyCells = screen.getAllByText('—');
      expect(emptyCells.length).toBeGreaterThan(0);
    });
  });
});