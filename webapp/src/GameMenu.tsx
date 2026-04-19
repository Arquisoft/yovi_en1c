import { useState } from "react";
import "./GameMenu.css";

export type BoardSize = "small" | "medium" | "large";
export type GameMode = "standard";
export type Difficulty = "random" | "easy" | "hard";
export type LayoutStyle = "classic" | "wooden";

// This interface defines the configuration options for starting a game of Y.
export interface GameConfig {
  boardSize: BoardSize;
  mode: GameMode;
  difficulty: Difficulty;
  layout: LayoutStyle;
}

export function TriviaHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="triviaHelp">
      <button
        type="button"
        className="triviaButton"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Show game trivia"
        aria-expanded={open}
      >
        ¿
      </button>

      {open && (
        <div className="triviaPopup" role="dialog" aria-live="polite">
          Y is inspired by strategy games where small layout changes can
          completely change the opening possibilities.
        </div>
      )}
    </div>
  );
}

type Props = {
  userName: string;
  onStartGame: (config: GameConfig) => void;
  onLogOut: () => void;
  onViewHistory: () => void;
};

const boardSizes = [
  {
    value: "small" as BoardSize,
    title: "Small",
    description: "5x5 board, suitable for quick games",
  },
  {
    value: "medium" as BoardSize,
    title: "Medium",
    description: "7x7 board, classic Y experience",
  },
  {
    value: "large" as BoardSize,
    title: "Large",
    description: "9x9 board, extensive Y gameplay",
  },
];

/* const gameModes = [
  {
    value: "standard" as GameMode,
    title: "Standard",
    description: "Classic Y rules",
  },
]; */

const difficulties = [
  {
    value: "random" as Difficulty,
    title: "Random",
    description: "Random difficulty",
  },
  {
    value: "easy" as Difficulty,
    title: "Easy",
    description: "Bit more difficult",
  },
  {
    value: "hard" as Difficulty,
    title: "Hard",
    description: "Clean tournament look",
  },
];

const layouts = [
  {
    value: "classic" as LayoutStyle,
    title: "Classic",
    description: "Traditional Y board layout",
  },
  {
    value: "wooden" as LayoutStyle,
    title: "Wooden",
    description: "Wooden-themed board layout",
  }
];


export default function GameMenu({
  userName,
  onStartGame,
  onLogOut,
  onViewHistory,
}: Props) {
  const [boardIndex, setBoardIndex] = useState(0);
  /* const [modeIndex] = useState(0); */
  const [difficultyIndex, setDifficultyIndex] = useState(0);
  const [layoutIndex, setLayoutIndex] = useState(0);

  const config: GameConfig = {
    boardSize: boardSizes[boardIndex].value,
    mode: "standard",
    difficulty: difficulties[difficultyIndex].value,
    layout: layouts[layoutIndex].value,
  };

  const goPrev = (index: number, length: number) => {
    return (index - 1 + length) % length;
  };

  const goNext = (index: number, length: number) => {
    return (index + 1) % length;
  };

  return (
    <div className="menu hexBackground">
      <div className="menuCard">
        <div className="menuHeader">
          <div className="menuTitleRow">
            <h2 className="menuTitle">Game Lobby</h2>
            <TriviaHelp />
          </div>
          <p className="menuSubtitle">
            Welcome, {userName}. Choose your setup for Y.
          </p>
          <button
            className="btn btnSecondary"
            type="button"
            onClick={onViewHistory}
          >
            Game history
          </button>
        </div>

        <section className="menuSection">
          <h3 className="sectionTitle">Board size</h3>
          <div className="carousel">
            <button
              type="button"
              className="carouselButton"
              onClick={() =>
                setBoardIndex(goPrev(boardIndex, boardSizes.length))
              }
              aria-label="Previous board size"
            >
              ‹
            </button>

            <div className="carouselCard">
              <span className="optionTitle">
                {boardSizes[boardIndex].title}
              </span>
              <span className="optionDescription">
                {boardSizes[boardIndex].description}
              </span>
            </div>

            <button
              type="button"
              className="carouselButton"
              onClick={() =>
                setBoardIndex(goNext(boardIndex, boardSizes.length))
              }
              aria-label="Next board size"
            >
              ›
            </button>
          </div>
        </section>

        <section className="menuSection">
          <h3 className="sectionTitle">Board layout</h3>
          <div className="carousel">
            <button
              type="button"
              className="carouselButton"
              onClick={() => setLayoutIndex(goPrev(layoutIndex, layouts.length))}
              aria-label="Previous board layout"
            >
              ‹
            </button>

            <div className="carouselCard">
              <span className="optionTitle">{layouts[layoutIndex].title}</span>
              <span className="optionDescription">
                {layouts[layoutIndex].description}
              </span>
            </div>

            <button
              type="button"
              className="carouselButton"
              onClick={() => setLayoutIndex(goNext(layoutIndex, layouts.length))}
              aria-label="Next board layout "
            >
              ›
            </button>
          </div>
        </section>

        <section className="menuSection">
          <h3 className="sectionTitle">Opponent style</h3>
          <div className="carousel">
            <button
              type="button"
              className="carouselButton"
              onClick={() =>
                setDifficultyIndex(goPrev(difficultyIndex, difficulties.length))
              }
              aria-label="Previous difficulty"
            >
              ‹
            </button>

            <div className="carouselCard">
              <span className="optionTitle">
                {difficulties[difficultyIndex].title}
              </span>
              <span className="optionDescription">
                {difficulties[difficultyIndex].description}
              </span>
            </div>

            <button
              type="button"
              className="carouselButton"
              onClick={() =>
                setDifficultyIndex(goNext(difficultyIndex, difficulties.length))
              }
              aria-label="Next difficulty"
            >
              ›
            </button>
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

          <button className="btn btnSecondary" type="button" onClick={onLogOut}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
