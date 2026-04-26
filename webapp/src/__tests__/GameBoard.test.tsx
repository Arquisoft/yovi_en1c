import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import GameBoard from "../GameBoard";
import type { GameConfig } from "../GameMenu";

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
        "board.status.rob_active": "Choose a bot cell to rob",
        "board.legend.you": "You (Blue)",
        "board.legend.bot": "Bot (Red)",
        "board.legend.rob": "Robbed cell",
        "board.rules_hint": "Connect all three sides",
        "board.rules_hint_rob": "Rob costs 2 bot turns",
        "board.new_game": "New Game",
        "board.info.standard": "Standard",
        "board.info.rob": "Rob Mode",
        "board.difficulty_label.random": "Random",
        "board.rob.action": "Rob",
        "board.rob.cancel": "Cancel",
        "board.rob.cost_hint": "Steal a bot cell (costs 2 turns)",
        "board.rob.select_hint": "Click a red cell to steal it",
      };
      if (key === "board.bot_error") return `Error: ${options?.message}`;
      return translations[key] || key;
    },
  }),
}));

const standardConfig: GameConfig = {
  boardSize: "medium",
  mode: "standard",
  layout: "classic",
  difficulty: "random",
};

const robConfig: GameConfig = {
  boardSize: "medium",
  mode: "rob",
  layout: "classic",
  difficulty: "random",
};

const mockBotResponse = (x: number, y: number, z: number) =>
  ({
    ok: true,
    json: async () => ({
      api_version: "v1",
      bot_id: "random_bot",
      coords: { x, y, z },
    }),
  }) as Response;

const getPolygons = () => document.querySelectorAll("polygon");

// ─── Standard mode suite (unchanged behavior) ─────────────────────────────────

describe("GameBoard — Standard mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("renders initial board layout and labels", () => {
    render(
      <GameBoard
        config={standardConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.getByText(/yovi/i)).toBeInTheDocument();
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    expect(getPolygons()).toHaveLength(28);
  });

  test("renders correct number of cells for small board", () => {
    render(
      <GameBoard
        config={{ ...standardConfig, boardSize: "small" }}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(getPolygons()).toHaveLength(15);
  });

  test("prevents interaction while bot is thinking", async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <GameBoard
        config={standardConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );

    const cells = getPolygons();
    await userEvent.click(cells[0]);
    await userEvent.click(cells[1]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("displays error banner on network failure and clears it on next move", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockResolvedValueOnce(mockBotResponse(1, 1, 1));

    render(
      <GameBoard
        config={standardConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );

    await userEvent.click(getPolygons()[0]);
    await waitFor(() =>
      expect(screen.getByText(/error: timeout/i)).toBeInTheDocument(),
    );

    await userEvent.click(getPolygons()[1]);
    expect(screen.queryByText(/error: timeout/i)).not.toBeInTheDocument();
  });

  test("executes onBack callback when back button is clicked", async () => {
    const onBack = vi.fn();
    render(
      <GameBoard config={standardConfig} onBack={onBack} userName="testUser" />,
    );

    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test("does NOT render rob bar in standard mode", () => {
    render(
      <GameBoard
        config={standardConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(
      screen.queryByRole("button", { name: /rob/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── Rob mode suite ───────────────────────────────────────────────────────────

describe("GameBoard — Rob mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  test("renders Rob Mode label and rob bar", () => {
    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );
    expect(screen.getByText(/rob mode/i)).toBeInTheDocument();
    // Rob button is rendered but disabled (no bot cells yet)
    expect(screen.getByRole("button", { name: /rob/i })).toBeDisabled();
    expect(screen.getByText(/steal a bot cell/i)).toBeInTheDocument();
  });

  test("rob button is disabled before any bot cells exist", () => {
    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );
    expect(screen.getByRole("button", { name: /rob/i })).toBeDisabled();
  });

  test("rob button becomes enabled after bot places a cell", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockBotResponse(5, 0, 1));

    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );

    // Player places a piece → bot responds
    await userEvent.click(getPolygons()[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /rob/i })).toBeEnabled(),
    );
  });

  test("activating rob mode changes status label and shows cancel button", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockBotResponse(5, 0, 1));

    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );

    await userEvent.click(getPolygons()[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /rob/i })).toBeEnabled(),
    );

    await userEvent.click(screen.getByRole("button", { name: /rob/i }));

    expect(screen.getByText(/choose a bot cell to rob/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  test("cancelling rob mode restores normal state", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockBotResponse(5, 0, 1));

    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );

    await userEvent.click(getPolygons()[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /rob/i })).toBeEnabled(),
    );

    await userEvent.click(screen.getByRole("button", { name: /rob/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cancel/i }),
    ).not.toBeInTheDocument();
  });

  test("robbing a cell triggers two bot turns (2 fetch calls)", async () => {
    // First call: player's normal move bot response
    // Second & third calls: two bot turns after the rob
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(mockBotResponse(5, 0, 1)) // after player move
      .mockResolvedValueOnce(mockBotResponse(4, 0, 2)) // bot turn 1 after rob
      .mockResolvedValueOnce(mockBotResponse(3, 0, 3)); // bot turn 2 after rob

    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );

    // Player places a piece
    await userEvent.click(getPolygons()[0]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /rob/i })).toBeEnabled(),
    );

    // Activate rob
    await userEvent.click(screen.getByRole("button", { name: /rob/i }));

    // Click a bot cell — need to find the polygon whose fill is red (bot's)
    // After the bot responded to the player's first move, one polygon is the bot's.
    // We stub Math.random so the bot doesn't try to rob back.
    vi.spyOn(Math, "random").mockReturnValue(0); // < BOT_ROB_PROBABILITY is 0.25, 0 < 0.25 but no player cells to steal in turn 1

    // Click a polygon (the board has a bot cell now)
    const allPolygons = getPolygons();
    // We need to click a polygon that is the bot's cell. Since the board is SVG,
    // we rely on the second and third fetch being called as a signal.
    // Click every polygon until rob completes (the bot-owned cell reacts).
    for (const poly of Array.from(allPolygons)) {
      poly.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }

    await waitFor(
      () =>
        // After a successful rob: 1 (player move) + 2 (rob cost) = 3 total fetch calls
        expect(global.fetch).toHaveBeenCalledTimes(3),
      { timeout: 3000 },
    );
  });

  test("rules hint shows rob-specific text in rob mode", () => {
    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );
    expect(screen.getByText(/rob costs 2 bot turns/i)).toBeInTheDocument();
  });

  test("legend shows robbed cell entry in rob mode", () => {
    render(
      <GameBoard config={robConfig} onBack={() => {}} userName="testUser" />,
    );
    expect(screen.getByText(/robbed cell/i)).toBeInTheDocument();
  });
});
