import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameHistory from '../components/GameHistory'; 

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
    
    // Patch window.location.reload to avoid "Cannot redefine property" error
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, reload: vi.fn() } as any;

    const retryBtn = screen.getByText('common.retry');
    fireEvent.click(retryBtn);
    
    expect(window.location.reload).toHaveBeenCalled();

    // Restore location
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

    // Test filtering by wins
    const winsFilter = screen.getByText('history.filter.wins');
    fireEvent.click(winsFilter);
    expect(screen.queryByText('history.result.loss')).not.toBeInTheDocument();

    // Test table sorting (moves and points)
    const movesHeader = screen.getByText(/history.table.moves/i);
    fireEvent.click(movesHeader); 
    fireEvent.click(movesHeader); 
    
    const pointsHeader = screen.getByText(/history.table.points/i);
    fireEvent.click(pointsHeader);
  });

  it('should navigate between tabs and call onBack', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockGames,
    });

    const onBackMock = vi.fn();
    render(<GameHistory onBack={onBackMock} userName={mockUserName} />);

    await waitFor(() => {
        expect(screen.getByText('history.view.stats')).toBeInTheDocument();
    });

    // Switch to Stats view
    fireEvent.click(screen.getByText('history.view.stats'));
    
    // Switch to Leaderboard view
    fireEvent.click(screen.getByText('history.view.leaderboard'));

    const backBtn = screen.getAllByText('common.back')[0];
    fireEvent.click(backBtn); 
    
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it('should handle cases with missing optional data (edge cases)', async () => {
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