import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import GameMenu from "../GameMenu";
import "@testing-library/jest-dom";

// 1. Mock de i18next para devolver las llaves de traducción
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      // Manejo especial para el saludo que incluye el nombre
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

  it("renders the welcome message with the correct username", () => {
    render(<GameMenu {...mockProps} />);
    // El mock devuelve "welcome, Pablo" para la llave menu.subtitle
    expect(screen.getByText(/welcome, pablo/i)).toBeInTheDocument();
  });

  it("renders the Game Lobby title", () => {
    render(<GameMenu {...mockProps} />);
    // Busca la llave de traducción
    expect(screen.getByText("menu.title")).toBeInTheDocument();
  });

  it("renders the game history button", () => {
    render(<GameMenu {...mockProps} />);
    expect(screen.getByRole("button", { name: /menu.view_history/i })).toBeInTheDocument();
  });

  it("calls onViewHistory when game history button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    await user.click(screen.getByRole("button", { name: /menu.view_history/i }));
    expect(mockProps.onViewHistory).toHaveBeenCalledTimes(1);
  });

  it("calls onLogOut when log out button is clicked", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);
    // En el código el logout usa "common.logout"
    await user.click(screen.getByRole("button", { name: /common.logout/i }));
    expect(mockProps.onLogOut).toHaveBeenCalledTimes(1);
  });

  it("calls onStartGame with default configuration", async () => {
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

  // ─── Carousels ────────────────────────────────────────────────────────────

  it("cycles forward through board sizes: small -> medium -> large -> small", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    // El aria-label usa "menu.next_aria" que devuelve la llave
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

    // El de dificultad es el tercer carrusel (índice 2)
    const next = screen.getAllByRole("button", { name: /menu.next_aria/i })[2];

    expect(screen.getByText("menu.difficulty.random_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.difficulty.easy_title")).toBeInTheDocument();
    await user.click(next);
    expect(screen.getByText("menu.difficulty.hard_title")).toBeInTheDocument();
  });

  it("starts game with custom config after navigating carousels", async () => {
    const user = userEvent.setup();
    render(<GameMenu {...mockProps} />);

    const nextButtons = screen.getAllByRole("button", { name: /menu.next_aria/i });
    const nextBoard = nextButtons[0];
    const nextDifficulty = nextButtons[2];

    // Seleccionar Large (2 clicks desde Small)
    await user.click(nextBoard);
    await user.click(nextBoard);

    // Seleccionar Hard (2 clicks desde Random)
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