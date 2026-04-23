import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import GameMenu from "../GameMenu";
import "@testing-library/jest-dom";

// Mock i18next to return translation keys
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders welcome message and basic UI labels", () => {
    render(<GameMenu {...mockProps} />);
    
    expect(screen.getByText(/welcome, pablo/i)).toBeInTheDocument();
    expect(screen.getByText("menu.title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /menu.view_history/i })).toBeInTheDocument();
  });

  it("triggers callback when history button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    
    await user.click(screen.getByRole("button", { name: /menu.view_history/i }));
    expect(mockProps.onViewHistory).toHaveBeenCalledTimes(1);
  });

  it("triggers callback when logout button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    
    await user.click(screen.getByRole("button", { name: /common.logout/i }));
    expect(mockProps.onLogOut).toHaveBeenCalledTimes(1);
  });

  it("starts game with default configuration", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    
    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "small",
      mode: "standard",
      difficulty: "random",
      layout: "classic",
    });
  });

  // Carousel Navigation Tests
  it("cycles forward through board sizes", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const next = screen.getAllByRole("button", { name: /menu.next_aria/i })[0];

    expect(screen.getByText("menu.board.small_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.board.medium_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.board.large_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.board.small_title")).toBeInTheDocument();
  });

  it("cycles backward through board sizes", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prev = screen.getAllByRole("button", { name: /menu.prev_aria/i })[0];

    expect(screen.getByText("menu.board.small_title")).toBeInTheDocument();
    await user.click(prev);
    expect(screen.getByText("menu.board.large_title")).toBeInTheDocument();
  });

  it("cycles forward through difficulties", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const next = screen.getAllByRole("button", { name: /menu.next_aria/i })[2];

    expect(screen.getByText("menu.difficulty.random_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.difficulty.easy_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.difficulty.hard_title")).toBeInTheDocument();
  });

  it("starts game with updated config after carousel interaction", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextButtons = screen.getAllByRole("button", { name: /menu.next_aria/i });
    const nextBoard = nextButtons[0];
    const nextDifficulty = nextButtons[2];

    // Select Large size (2 clicks)
    await user.click(nextBoard);
    await user.click(nextBoard);

    // Select Hard difficulty (2 clicks)
    await user.click(nextDifficulty);
    await user.click(nextDifficulty);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "large",
      mode: "standard",
      difficulty: "hard",
      layout: "classic",
    });
  });
});