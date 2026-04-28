import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import GameMenu from "../GameMenu";
import "@testing-library/jest-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === "menu.subtitle") return `welcome, ${options?.name}`;
      if (key === "menu.prev_aria") return `prev ${options?.section}`;
      if (key === "menu.next_aria") return `next ${options?.section}`;
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

  // Verifies that the welcome message and main buttons are rendered
  it("renders welcome message and basic UI labels", () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByText(/welcome, pablo/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /menu.view_history/i }),
    ).toBeInTheDocument();
  });

  // Verifies that history and logout callbacks are triggered correctly
  it("triggers callbacks for history and logout", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    await user.click(
      screen.getByRole("button", { name: /menu.view_history/i }),
    );
    expect(mockProps.onViewHistory).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /common.logout/i }));
    expect(mockProps.onLogOut).toHaveBeenCalled();
  });

  // Verifies that carousels advance correctly and the resulting config is correct
  it("cycles through carousels and updates config on start", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextButtons = screen.getAllByRole("button", { name: /next/i });

    // Board Size: Small → Medium
    await user.click(nextButtons[0]);
    // Difficulty: Random → Easy
    await user.click(nextButtons[2]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));

    expect(mockProps.onStartGame).toHaveBeenCalledWith({
      boardSize: "medium",
      mode: "standard",
      difficulty: "easy",
      layout: "classic",
    });
  });

  // Verifies that the trivia card is hidden by default
  it("trivia card is hidden by default", () => {
    render(<GameMenu {...mockProps} />);
    expect(document.querySelector(".triviaCard")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  // Verifies that the trivia card opens when the ¿ button is clicked
  it("opens trivia card when ¿ button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    await user.click(
      screen.getByRole("button", { name: /menu\.trivia_open_aria/i }),
    );

    expect(document.querySelector(".triviaCard")).toHaveAttribute(
      "aria-hidden",
      "false",
    );
    expect(document.querySelector(".triviaCardBack")).toBeInTheDocument();
  });

  // Verifies that the trivia card closes when the × button is clicked
  it("closes trivia card when × button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    await user.click(
      screen.getByRole("button", { name: /menu\.trivia_open_aria/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /menu\.trivia_close_aria/i }),
    );

    expect(document.querySelector(".triviaCard")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  // Verifies that clicking the ¿ button twice closes the trivia card
  it("toggles trivia card closed when ¿ button clicked again", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const toggle = screen.getByRole("button", {
      name: /menu\.trivia_open_aria/i,
    });
    await user.click(toggle);
    await user.click(toggle);

    expect(document.querySelector(".triviaCard")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  // Verifies that the mobile history button also triggers onViewHistory
  it("renders mobile history button and triggers onViewHistory", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const historyButtons = screen.getAllByRole("button", {
      name: /game history|menu\.view_history/i,
    });
    expect(historyButtons.length).toBeGreaterThanOrEqual(2);

    await user.click(historyButtons[1]);
    expect(mockProps.onViewHistory).toHaveBeenCalled();
  });

  // Verifies that the board size carousel wraps backward (Small → Large)
  it("wraps board size carousel backward from Small to Large", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prevButtons = screen.getAllByRole("button", { name: /prev/i });
    await user.click(prevButtons[0]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));
    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ boardSize: "large" }),
    );
  });

  // Verifies that the game mode carousel wraps backward (Standard → Rob)
  it("wraps game mode carousel backward from Standard to Rob", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prevButtons = screen.getAllByRole("button", { name: /prev/i });
    await user.click(prevButtons[1]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));
    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "rob" }),
    );
  });

  // Verifies that the difficulty carousel wraps backward (Random → Hard)
  it("wraps difficulty carousel backward from Random to Hard", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prevButtons = screen.getAllByRole("button", { name: /prev/i });
    await user.click(prevButtons[2]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));
    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ difficulty: "hard" }),
    );
  });

  // Verifies that the layout carousel wraps backward (Classic → Wooden)
  it("wraps layout carousel backward from Classic to Wooden", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prevButtons = screen.getAllByRole("button", { name: /prev/i });
    await user.click(prevButtons[3]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));
    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ layout: "wooden" }),
    );
  });

  // Verifies that advancing the carousel past the last option wraps back to the first
  it("wraps carousel forward past the last option back to first", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextButtons = screen.getAllByRole("button", { name: /next/i });
    // Board size: small → medium → large → small (3 clicks)
    await user.click(nextButtons[0]);
    await user.click(nextButtons[0]);
    await user.click(nextButtons[0]);

    await user.click(screen.getByRole("button", { name: /menu.start_game/i }));
    expect(mockProps.onStartGame).toHaveBeenCalledWith(
      expect.objectContaining({ boardSize: "small" }),
    );
  });

  // Verifies that cycling backward through board sizes shows the Large title
  it("cycles backward through board sizes and shows Large title", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const prev = screen.getAllByRole("button", { name: /prev/i })[0];
    await user.click(prev);

    expect(screen.getByText("menu.board.large_title")).toBeInTheDocument();
  });
});
