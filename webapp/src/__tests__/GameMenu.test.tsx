import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import GameMenu from "../GameMenu";
import "@testing-library/jest-dom";

describe("GameMenu", () => {
  const mockProps = {
    userName: "Pablo",
    onStartGame: vi.fn(),
    onLogOut: vi.fn(),
    onViewHistory: vi.fn(),
  };

  it("renders the welcome message with the correct username", () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByText(/welcome, pablo/i)).toBeInTheDocument();
  });

  it("updates state and calls onStartGame with selected configuration", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    // 1. Select 'Small' board size
    const smallBoardBtn = screen.getByRole("button", {
      name: /small/i,
    });
    await user.click(smallBoardBtn);
    expect(smallBoardBtn).toHaveClass("selected");

    // 2. Select 'Master Y' game mode
    const masterYBtn = screen.getByRole("button", {
      name: /master y.*advanced variant/i,
    });
    await user.click(masterYBtn);
    expect(masterYBtn).toHaveClass("selected");

    // 3. Select 'Wooden' layout style
    const woodenLayoutBtn = screen.getByRole("button", {
      name: /wooden.*board-game table feel/i,
    });
    await user.click(woodenLayoutBtn);
    expect(woodenLayoutBtn).toHaveClass("selected");

    // 4. Click 'Start game'
    const startBtn = screen.getByRole("button", { name: /start game/i });
    await user.click(startBtn);

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "small",
      mode: "master_y",
      layout: "wooden",
      difficulty: "hard",
    });
  });

  it("calls onLogOut when the log out button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const logOutBtn = screen.getByRole("button", { name: /log out/i });
    await user.click(logOutBtn);

    expect(mockProps.onLogOut).toHaveBeenCalledTimes(1);
  });

  it("verifies that only one option per section can be selected at a time", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const smallBtn = screen.getByRole("button", { name: /small/i });
    const mediumBtn = screen.getByRole("button", { name: /medium/i });

    // Click Small
    await user.click(smallBtn);
    expect(smallBtn).toHaveClass("selected");
    expect(mediumBtn).not.toHaveClass("selected");

    // Click Medium
    await user.click(mediumBtn);
    expect(mediumBtn).toHaveClass("selected");
    expect(smallBtn).not.toHaveClass("selected");
  });
});