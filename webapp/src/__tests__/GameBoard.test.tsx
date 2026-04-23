import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import GameBoard from "../GameBoard";
import type { GameConfig } from "../GameMenu";

// --- i18n Mock Configuration ---
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "common.back": "Back",
        "board.title": "Yovi",
        "board.status.your_turn": "Your turn",
        "board.status.thinking": "Bot thinking",
        "board.status.you_win": "You win",
        "board.status.bot_wins": "Bot wins",
        "board.legend.you": "You (Blue)",
        "board.legend.bot": "Bot (Red)",
        "board.rules_hint": "Connect all three sides",
        "board.new_game": "New Game",
        "board.info.standard": "Standard",
        "board.difficulty_label.random": "Random",
      };
      if (key === "board.bot_error") return `Error: ${options?.message}`;
      return translations[key] || key;
    },
  }),
}));

// --- Test Data & Helpers ---
const defaultConfig: GameConfig = {
  boardSize: "medium", // 7x7 logic (28 cells)
  mode: "standard",
  layout: "classic",
  difficulty: "random",
};

const mockBotResponse = (x: number, y: number, z: number) => ({
  ok: true,
  json: async () => ({
    api_version: "v1",
    bot_id: "random_bot",
    coords: { x, y, z },
  }),
} as Response);

const getPolygons = () => document.querySelectorAll("polygon");

// --- Main Test Suite ---
describe("GameBoard Component", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // Rendering Tests
  test("renders initial board layout and labels", () => {
    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    
    expect(screen.getByText(/yovi/i)).toBeInTheDocument();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    expect(getPolygons()).toHaveLength(28);
  });

  // Turn Logic Tests
  test("completes a full turn cycle: player click to bot response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(mockBotResponse(0, 1, 0));
    global.fetch = fetchMock;

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    
    // Player clicks first cell
    await userEvent.click(getPolygons()[0]);

    // Verify thinking state
    expect(screen.getByText(/bot thinking/i)).toBeInTheDocument();

    // Wait for bot to finish and turn to return to player
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });
  });

  test("prevents interaction while bot is thinking", async () => {
    // API that never resolves to keep it in loading state
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    
    const cells = getPolygons();
    await userEvent.click(cells[0]); // First click triggers bot
    await userEvent.click(cells[1]); // Second click should be ignored

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  // Error Handling Tests
  test("displays error banner on network failure", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Timeout"));

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/error: timeout/i)).toBeInTheDocument();
      // Player should be able to try moving again
      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });
  });

  test("clears error banner when player makes a new move", async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("First Fail"))
      .mockResolvedValueOnce(mockBotResponse(0, 1, 0));

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);

    // Trigger error
    await userEvent.click(getPolygons()[0]);
    await waitFor(() => expect(screen.getByText(/error: first fail/i)).toBeInTheDocument());

    // Make new move
    await userEvent.click(getPolygons()[1]);
    expect(screen.queryByText(/error: first fail/i)).not.toBeInTheDocument();
  });

  // Navigation Tests
  test("executes onBack callback when back button is clicked", async () => {
    const onBack = vi.fn();
    render(<GameBoard config={defaultConfig} onBack={onBack} userName="testUser" />);
    
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});