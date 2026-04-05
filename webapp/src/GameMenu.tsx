import { useState } from "react";
import "./GameMenu.css";

export type BoardSize = "small" | "medium" | "large";
export type GameMode = "standard" | "standard_pie" | "master_y";
export type LayoutStyle = "classic" | "futuristic" | "wooden";
export type Difficulty = "random" | "easy" | "hard";

export interface GameConfig {
  boardSize: BoardSize;
  mode: GameMode;
  layout: LayoutStyle;
  difficulty: Difficulty;
}

type Props = {
  userName: string;
  onStartGame: (config: GameConfig) => void;
  onLogOut: () => void;
  onViewHistory: () => void;
};

const boardSizes: { value: BoardSize; title: string; description: string }[] = [
  { value: "small", title: "Small", description: "5×5 — quick match" },
  { value: "medium", title: "Medium", description: "7×7 — balanced" },
  { value: "large", title: "Large", description: "9×9 — 55 nodes" },
];

const gameModes: { value: GameMode; title: string; description: string }[] = [
  { value: "standard", title: "Standard", description: "Classic Y rules" },
  {
    value: "standard_pie",
    title: "Standard Pie",
    description: "Includes pie rule",
  },
  { value: "master_y", title: "Master Y", description: "Advanced variant" },
];

const layouts: { value: LayoutStyle; title: string; description: string }[] = [
  { value: "classic", title: "Classic", description: "Clean tournament look" },
  {
    value: "futuristic",
    title: "Futuristic",
    description: "Neon sci-fi style",
  },
  { value: "wooden", title: "Wooden", description: "Board-game table feel" },
];

const difficulties: {
  value: Difficulty;
  title: string;
  description: string;
}[] = [
  { value: "random", title: "Random", description: "Purely random moves" },
  { value: "easy", title: "Easy", description: "20 % smart, 80 % random" },
  { value: "hard", title: "Hard", description: "Always best move" },
];

export default function GameMenu({
  userName,
  onStartGame,
  onLogOut,
  onViewHistory,
}: Props) {
  const [config, setConfig] = useState<GameConfig>({
    boardSize: "medium",
    mode: "standard",
    layout: "classic",
    difficulty: "hard",
  });

  // Función auxiliar para actualizar el estado limpiamente
  const set = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) =>
    setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="menu">
      <div className="menuCard">
        {/* Cabecera con Log out e History para conservar tu diseño */}
        <div className="menuHeader">
          <button className="btn" type="button" onClick={onLogOut}>
            Log out
          </button>
          <h2 className="menuTitle">Game Lobby</h2>
          <button className="btn" type="button" onClick={onViewHistory}>
            History
          </button>
        </div>

        <p
          className="menuSubtitle"
          style={{ textAlign: "center", marginBottom: "15px" }}
        >
          Welcome, <strong>{userName}</strong>. Choose your setup for Y.
        </p>

        {/* 1. Board Size */}
        <section className="menuSection">
          <h3 className="sectionTitle">Board size</h3>
          <div className="optionGrid">
            {boardSizes.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`optionCard ${config.boardSize === o.value ? "selected" : ""}`}
                onClick={() => set("boardSize", o.value)}
              >
                <span className="optionTitle">{o.title}</span>
                <span className="optionDescription">{o.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 2. Game Mode */}
        <section className="menuSection">
          <h3 className="sectionTitle">Game mode</h3>
          <div className="optionGrid">
            {gameModes.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`optionCard ${config.mode === o.value ? "selected" : ""}`}
                onClick={() => set("mode", o.value)}
              >
                <span className="optionTitle">{o.title}</span>
                <span className="optionDescription">{o.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 3. Layout Style */}
        <section className="menuSection">
          <h3 className="sectionTitle">Layout style</h3>
          <div className="optionGrid">
            {layouts.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`optionCard ${config.layout === o.value ? "selected" : ""}`}
                onClick={() => set("layout", o.value)}
              >
                <span className="optionTitle">{o.title}</span>
                <span className="optionDescription">{o.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 4. Bot Difficulty */}
        <section className="menuSection">
          <h3 className="sectionTitle">Bot difficulty</h3>
          <div className="optionGrid">
            {difficulties.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`optionCard ${config.difficulty === o.value ? "selected" : ""}`}
                onClick={() => set("difficulty", o.value)}
              >
                <span className="optionTitle">{o.title}</span>
                <span className="optionDescription">{o.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Botón de acción principal al fondo */}
        <div
          className="actions"
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <button
            className="btn btnPrimary btnLarge"
            type="button"
            onClick={() => onStartGame(config)}
          >
            Start game
          </button>
        </div>
      </div>
    </div>
  );
}
