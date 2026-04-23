import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameHistory from '../GameHistory'; 

// 1. Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (str: string) => str,
    i18n: { resolvedLanguage: 'en' },
  }),
}));

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
  avgMoves: [
    { _id: "player_won", avgMoves: 10 },
    { _id: "bot_won", avgMoves: 15 }
  ]
};

describe('GameHistory Coverage Boost', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('should show error state when API fails', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("API Failure"));

    render(<GameHistory onBack={() => {}} userName={mockUserName} />);

    await waitFor(() => {
      expect(screen.getByText(/API Failure/i)).toBeInTheDocument();
    });
    
    // Fix window.location.reload
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    const retryBtn = screen.getByText('common.retry');
    fireEvent.click(retryBtn);
    
    expect(window.location.reload).toHaveBeenCalled();
    window.location = originalLocation;
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

    const winsFilter = screen.getByText('history.filter.wins');
    fireEvent.click(winsFilter);
    expect(screen.queryByText('history.result.loss')).not.toBeInTheDocument();

    const movesHeader = screen.getByText(/history.table.moves/i);
    fireEvent.click(movesHeader); 
    fireEvent.click(movesHeader); 
  });


  it('should handle missing optional data (fallback dashes)', async () => {
    const incompleteGames = [{
      _id: "3", result: "player_won", playedAt: "2023-01-01T10:00:00Z"
    }];

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => incompleteGames,
    });

    render(<GameHistory onBack={() => {}} userName={mockUserName} />);
    
    await waitFor(() => {
      const emptyCells = screen.getAllByText('—');
      expect(emptyCells.length).toBeGreaterThan(0);
    });
  });
});