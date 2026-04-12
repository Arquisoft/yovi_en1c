import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GameMenu from "../GameMenu";
import "@testing-library/jest-dom";

describe("GameMenu", () => {
  const mockProps = {
    userName: "Pablo",
    onStartGame: vi.fn(),
    onLogOut: vi.fn(),
    onViewHistory: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the welcome message with the correct username", () => {
    render(<GameMenu {...mockProps} />);

    expect(
      screen.getByText((_content, element) => {
        const hasText =
          element?.textContent?.toLowerCase().includes("welcome, pablo") || false;
        const hasNoChildrenWithText = Array.from(element?.children || []).every(
          (child) => !child.textContent?.toLowerCase().includes("welcome, pablo"),
        );
        return hasText && hasNoChildrenWithText;
      }),
    ).toBeInTheDocument();
  });

  it("renders the Game Lobby title", () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByText("Game Lobby")).toBeInTheDocument();
  });

  it("renders the game history button", () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByRole("button", { name: /game history/i })).toBeInTheDocument();
  });

  it("calls onViewHistory when game history button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    await user.click(screen.getByRole("button", { name: /game history/i }));

    expect(mockProps.onViewHistory).toHaveBeenCalledTimes(1);
  });

  it("calls onLogOut when log out button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(mockProps.onLogOut).toHaveBeenCalledTimes(1);
  });

  it("calls onStartGame with default configuration (small, standard, random, classic)", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    await user.click(screen.getByRole("button", { name: /start game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "small",
      mode: "standard",
      difficulty: "random",
      layout: "classic",
    });
  });

  // ─── Board size carousel ───────────────────────────────────────────────────

  it("cycles forward through board sizes: small -> medium -> large -> small", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const next = screen.getByRole("button", { name: /next board size/i });

    expect(screen.getByText("Small")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("Large")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("Small")).toBeInTheDocument(); // wraps around
  });

  it("cycles backward through board sizes: small -> large (wraps)", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prev = screen.getByRole("button", { name: /previous board size/i });

    expect(screen.getByText("Small")).toBeInTheDocument();
    await user.click(prev);
    expect(screen.getByText("Large")).toBeInTheDocument(); // wraps to end
  });

  it("starts game with large board after navigating carousel", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const next = screen.getByRole("button", { name: /next board size/i });
    await user.click(next); // medium
    await user.click(next); // large

    await user.click(screen.getByRole("button", { name: /start game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ boardSize: "large" })
    );
  });

  // ─── Difficulty carousel ───────────────────────────────────────────────────

  it("cycles forward through difficulties: random -> easy -> hard -> random", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const next = screen.getByRole("button", { name: /next difficulty/i });

    expect(screen.getByText("Random")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("Easy")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("Hard")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("Random")).toBeInTheDocument(); // wraps around
  });

  it("cycles backward through difficulties: random -> hard (wraps)", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prev = screen.getByRole("button", { name: /previous difficulty/i });

    expect(screen.getByText("Random")).toBeInTheDocument();
    await user.click(prev);
    expect(screen.getByText("Hard")).toBeInTheDocument();
  });

  it("starts game with hard difficulty after navigating carousel", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const next = screen.getByRole("button", { name: /next difficulty/i });
    await user.click(next); // easy
    await user.click(next); // hard

    await user.click(screen.getByRole("button", { name: /start game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty: "hard" })
    );
  });

  // ─── Combined config ───────────────────────────────────────────────────────

  it("starts game with large board and hard difficulty after navigating both carousels", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextBoard = screen.getByRole("button", { name: /next board size/i });
    const nextDifficulty = screen.getByRole("button", { name: /next difficulty/i });

    await user.click(nextBoard);     // medium
    await user.click(nextBoard);     // large
    await user.click(nextDifficulty); // easy
    await user.click(nextDifficulty); // hard

    await user.click(screen.getByRole("button", { name: /start game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "large",
      mode: "standard",
      difficulty: "hard",
      layout: "classic",
    });
  });

  // ─── Game mode carousel (only 1 option, stays on standard) ────────────────

  it("game mode stays on standard when navigating (only one option)", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextMode = screen.getByRole("button", { name: /next game mode/i });
    await user.click(nextMode);

    expect(screen.getByText("Standard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /start game/i }));
    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "standard" })
    );
  });
});