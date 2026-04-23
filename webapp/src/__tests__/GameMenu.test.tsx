import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import GameMenu from "../GameMenu";
import "@testing-library/jest-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === "menu.subtitle") return `welcome, ${options.name}`;
      return key;
    },
  }),
}));

describe("GameMenu", () => {
  const mockProps = {
    userName: "Pablo",
    onStartGame: vi.fn(),
    onLogOut: vi.fn(),
    onViewHistory: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("renders welcome message and basic UI labels", () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByText(/welcome, pablo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /menu.view_history/i })).toBeInTheDocument();
  });

  it("triggers callbacks for history and logout", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    
    await user.click(screen.getByRole("button", { name: /menu.view_history/i }));
    expect(mockProps.onViewHistory).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /common.logout/i }));
    expect(mockProps.onLogOut).toHaveBeenCalled();
  });

  it("cycles through carousels and updates config", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextButtons = screen.getAllByRole("button", { name: /menu.next_aria/i });
    
    // Board Size: Small -> Medium
    await user.click(nextButtons[0]);
    // Difficulty: Random -> Easy
    await user.click(nextButtons[2]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "medium",
      mode: "standard",
      difficulty: "easy",
      layout: "classic",
    });
  });

  it("cycles backward through board sizes", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    const prev = screen.getAllByRole("button", { name: /menu.prev_aria/i })[0];
    await user.click(prev);
    expect(screen.getByText("menu.board.large_title")).toBeInTheDocument();
  });
});