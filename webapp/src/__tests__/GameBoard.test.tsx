import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import GameBoard from "../GameBoard";
import type { GameConfig } from "../GameMenu";

// --- i18n Mock ---
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "common.back": "Back",
        "board.title": "Yovi",
        "board.status.your_turn": "Your turn",
        "board.status.thinking": "Bot thinking",
        "board.legend.you": "You (Blue)",
        "board.legend.bot": "Bot (Red)",
        "board.new_game": "New Game",
      };
      if (key === "board.bot_error") return `Error: ${options?.message}`;
      return translations[key] || key;
    },
  }),
}));

const defaultConfig: GameConfig = {
  boardSize: "medium",
  mode: "standard",
  layout: "classic",
  difficulty: "random",
};

const mockBotResponse = (x: number, y: number, z: number) => ({
  ok: true,
  json: async () => ({
    coords: { x, y, z },
  }),
} as Response);

const getPolygons = () => document.querySelectorAll("polygon");

describe("GameBoard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("renders initial board and UI labels", () => {
    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    
    expect(screen.getByText(/yovi/i)).toBeInTheDocument();
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    expect(getPolygons()).toHaveLength(28);
  });

  test("prevents additional clicks while bot is thinking", async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    
    const cells = getPolygons();
    await userEvent.click(cells[0]);
    await userEvent.click(cells[1]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("displays error banner on fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Timeout"));

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/error: timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });
  });

  test("clears error banner when a new move is made", async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error("Failed"))
      .mockResolvedValueOnce(mockBotResponse(0, 1, 0));

    render(<GameBoard config={defaultConfig} onBack={() => {}} userName="testUser" />);

    await userEvent.click(getPolygons()[0]);
    await waitFor(() => expect(screen.getByText(/error: failed/i)).toBeInTheDocument());

    await userEvent.click(getPolygons()[1]);
    expect(screen.queryByText(/error: failed/i)).not.toBeInTheDocument();
  });

  test("calls onBack when back button is clicked", async () => {
    const onBack = vi.fn();
    render(<GameBoard config={defaultConfig} onBack={onBack} userName="testUser" />);
    
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});