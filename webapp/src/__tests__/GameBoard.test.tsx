import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import "@testing-library/jest-dom";
import GameBoard from "../GameBoard";
import type { GameConfig } from "../GameMenu";

// ─── Default config ───────────────────────────────────────────────────────────
// medium = 7×7 board (28 cells), random_bot matches the existing API URL tests

const defaultConfig: GameConfig = {
  boardSize: "medium",
  mode: "standard",
  layout: "classic",
  difficulty: "random",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Builds a minimal successful bot response for a given cell. */
function botResponse(x: number, y: number, z: number) {
  return {
    ok: true,
    json: async () => ({
      api_version: "v1",
      bot_id: "random_bot",
      coords: { x, y, z },
    }),
  } as Response;
}

/** Returns all SVG polygon elements — a size-7 board has 28 cells. */
function getPolygons() {
  return document.querySelectorAll("polygon");
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe("GameBoard – rendering", () => {
  afterEach(() => vi.restoreAllMocks());

  test("renders the game title", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.getByText(/yovi/i)).toBeInTheDocument();
  });

  test("renders the back button", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  test("renders size info tag", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    // Usamos medium en el defaultConfig, por lo que debe buscar "medium"
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });

  test("renders the legend with player entries", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.getByText(/you \(blue\)/i)).toBeInTheDocument();
    expect(screen.getByText(/bot \(red\)/i)).toBeInTheDocument();
  });

  test("renders the rules hint", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.getByText(/connect all three sides/i)).toBeInTheDocument();
  });

  test("renders 28 hexagonal cells for a size-7 board", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(getPolygons()).toHaveLength(28);
  });

  test("shows 'Your turn' status badge at the start", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.getByText(/your turn/i)).toBeInTheDocument();
  });

  test("does not show 'New game' button while game is ongoing", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(
      screen.queryByRole("button", { name: /new game/i }),
    ).not.toBeInTheDocument();
  });

  test("does not show error banner on initial render", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(document.querySelector(".errorBanner")).not.toBeInTheDocument();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe("GameBoard – navigation", () => {
  afterEach(() => vi.restoreAllMocks());

  test("calls onBack when the back button is clicked", async () => {
    const onBack = vi.fn();
    render(
      <GameBoard config={defaultConfig} onBack={onBack} userName="testUser" />,
    );
    await userEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});

// ─── Turn flow ────────────────────────────────────────────────────────────────

describe("GameBoard – turn flow", () => {
  afterEach(() => vi.restoreAllMocks());

  test("calls the bot API after the player clicks a cell", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(botResponse(0, 1, 0));
    global.fetch = fetchMock;

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/gamey/v1/ybot/choose/random_bot"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  test("sends a valid YEN body to the bot API", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(botResponse(0, 1, 0));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      const body = JSON.parse(
        (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
      );
      expect(body).toHaveProperty("size", 7);
      expect(body).toHaveProperty("turn", 1);
      expect(body).toHaveProperty("players", ["B", "R"]);
      expect(body).toHaveProperty("layout");
      // A size-7 layout has exactly 6 row separators
      expect((body.layout.match(/\//g) || []).length).toBe(6);
      expect(body.layout).toContain("B");
    });
  });

  test("shows 'Bot thinking' status while waiting for the API response", async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    expect(screen.getByText(/bot thinking/i)).toBeInTheDocument();
  });

  test("returns turn to player after bot responds", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(botResponse(0, 1, 0));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });
  });

  test("does not call the API again when clicking while bot is thinking", async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);
    await userEvent.click(getPolygons()[1]);

    expect(global.fetch).toHaveBeenCalledOnce();
  });

  test("does not call the API when clicking an already occupied cell", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(botResponse(0, 1, 0));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);
    await waitFor(() => screen.getByText(/your turn/i));

    global.fetch = vi.fn();
    await userEvent.click(getPolygons()[0]);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("GameBoard – error handling", () => {
  afterEach(() => vi.restoreAllMocks());

  test("shows error banner when the bot API returns a non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Bot not found" }),
    } as Response);

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/bot error/i)).toBeInTheDocument();
      expect(screen.getByText(/bot not found/i)).toBeInTheDocument();
    });
  });

  test("shows error banner when the network call fails", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/bot error/i)).toBeInTheDocument();
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  test("shows 'Unknown error' when fetch rejects with a non-Error value", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce("plain string error");

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/unknown error/i)).toBeInTheDocument();
    });
  });

  test("gives the turn back to the player after a failed API call", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);

    await waitFor(() => {
      expect(screen.getByText(/your turn/i)).toBeInTheDocument();
    });
  });

  test("clears the error banner on the next player move", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(botResponse(0, 1, 0));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );

    await userEvent.click(getPolygons()[0]);
    await waitFor(() => screen.getByText(/bot error/i));

    await userEvent.click(getPolygons()[1]);
    await waitFor(() => {
      expect(screen.queryByText(/bot error/i)).not.toBeInTheDocument();
    });
  });
});

// ─── Win / lose ───────────────────────────────────────────────────────────────

describe("GameBoard – win / lose state", () => {
  afterEach(() => vi.restoreAllMocks());

  test("does not show win/lose state on initial render", () => {
    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    expect(screen.queryByText(/you win/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bot wins/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /new game/i }),
    ).not.toBeInTheDocument();
  });

  test("board still has 28 cells after a move", async () => {
    global.fetch = vi.fn().mockResolvedValue(botResponse(0, 6, 0));

    render(
      <GameBoard
        config={defaultConfig}
        onBack={() => {}}
        userName="testUser"
      />,
    );
    await userEvent.click(getPolygons()[0]);
    await waitFor(() => screen.getByText(/your turn/i));

    expect(getPolygons()).toHaveLength(28);
  });
});
