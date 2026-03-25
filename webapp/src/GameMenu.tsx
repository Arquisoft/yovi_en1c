import { useState } from "react";
import "./GameMenu.css";

export type BoardSize = "small" | "medium" | "large";
export type GameMode = "standard" | "standard_pie" | "master_y";
export type LayoutStyle = "classic" | "futuristic" | "wooden";

// This interface defines the configuration options for starting a game of Y.
export interface GameConfig {
  boardSize: BoardSize;
  mode: GameMode;
  layout: LayoutStyle;
}

type Props = {
  userName: string;
  onStartGame: (config: GameConfig) => void;
  onLogOut: () => void;
  onViewHistory: () => void;
};

const boardSizes: { value: BoardSize; title: string; description: string }[] = [
  { value: "small", title: "Small", description: "Quick match" },
  { value: "medium", title: "Medium", description: "Balanced board" },
  { value: "large", title: "Large", description: "93 playable nodes" },
];

const gameModes: { value: GameMode; title: string; description: string }[] = [
  { value: "standard", title: "Standard", description: "Classic Y rules" },
  {
    value: "standard_pie",
    title: "Standard Pie",
    description: "Includes pie rule",
  },
  {
    value: "master_y",
    title: "Master Y",
    description: "More advanced variant",
  },
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

export default function GameMenu({
  userName,
  onStartGame,
  onLogOut,
  onViewHistory,
}: Props) {
  const [config, setConfig] = useState<GameConfig>({
    boardSize: "large",
    mode: "standard",
    layout: "classic",
  });

  return (
    <div className="menu">
      <div className="menuCard">
        <div className="menuHeader">
          <h2 className="menuTitle">Game Lobby</h2>
          <p className="menuSubtitle">
            Welcome, {userName}. Choose your setup for Y.
          </p>
        </div>

        <section className="menuSection">
          <h3 className="sectionTitle">Board size</h3>
          <div className="optionGrid">
            {boardSizes.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`optionCard ${config.boardSize === option.value ? "selected" : ""}`}
                onClick={() =>
                  setConfig((current) => ({
                    ...current,
                    boardSize: option.value,
                  }))
                }
              >
                <span className="optionTitle">{option.title}</span>
                <span className="optionDescription">{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="menuSection">
          <h3 className="sectionTitle">Game mode</h3>
          <div className="optionGrid">
            {gameModes.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`optionCard ${config.mode === option.value ? "selected" : ""}`}
                onClick={() =>
                  setConfig((current) => ({ ...current, mode: option.value }))
                }
              >
                <span className="optionTitle">{option.title}</span>
                <span className="optionDescription">{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="menuSection">
          <h3 className="sectionTitle">Layout style</h3>
          <div className="optionGrid">
            {layouts.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`optionCard ${config.layout === option.value ? "selected" : ""}`}
                onClick={() =>
                  setConfig((current) => ({ ...current, layout: option.value }))
                }
              >
                <span className="optionTitle">{option.title}</span>
                <span className="optionDescription">{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="actions">
          <button
            className="btn btnPrimary btnLarge"
            type="button"
            onClick={() => onStartGame(config)}
          >
            Start game
          </button>

          <button
            className="btn btnSecondary"
            type="button"
            onClick={onViewHistory}
          >
            Game history
          </button>

          <button className="btn btnSecondary" type="button" onClick={onLogOut}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
