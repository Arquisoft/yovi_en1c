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
    expect(screen.getByText(/welcome, pablo/i)).toBeInTheDocument();
  });

  it("renders the game history button", () => {
    render(<GameMenu {...mockProps} />);
    expect(
      screen.getByRole("button", { name: /game history/i })
    ).toBeInTheDocument();
  });

  it("calls onOpenHistory when the game history button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const historyBtn = screen.getByRole("button", { name: /game history/i });
    await user.click(historyBtn);

    expect(mockProps.onViewHistory).toHaveBeenCalledTimes(1);
  });

  it("calls onLogOut when the log out button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const logOutBtn = screen.getByRole("button", { name: /log out/i });
    await user.click(logOutBtn);

    expect(mockProps.onLogOut).toHaveBeenCalledTimes(1);
  });

  it("calls onStartGame with the default configuration when start game is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const startBtn = screen.getByRole("button", { name: /start game/i });
    await user.click(startBtn);

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "small",
      mode: "standard",
      difficulty: "easy",
    });
  });

  it("updates board size and difficulty through carousel buttons before starting the game", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextBoardBtn = screen.getByRole("button", {
      name: /next board size/i,
    });

    const nextDifficultyBtn = screen.getByRole("button", {
      name: /next difficulty/i,
    });

    // small -> medium -> large
    await user.click(nextBoardBtn);
    await user.click(nextBoardBtn);

    // easy -> medium -> hard
    await user.click(nextDifficultyBtn);
    await user.click(nextDifficultyBtn);

    const startBtn = screen.getByRole("button", { name: /start game/i });
    await user.click(startBtn);

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "large",
      mode: "standard",
      difficulty: "hard",
    });
  });

  it("cycles through board size options in the UI", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    expect(screen.getByText("Small")).toBeInTheDocument();

    const nextBoardBtn = screen.getByRole("button", {
      name: /next board size/i,
    });

    await user.click(nextBoardBtn);
    expect(screen.getByText("Medium")).toBeInTheDocument();

    await user.click(nextBoardBtn);
    expect(screen.getByText("Large")).toBeInTheDocument();
  });
});