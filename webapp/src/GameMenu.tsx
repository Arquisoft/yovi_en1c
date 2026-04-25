import { useState } from "react";
import "./GameMenu.css";

export type BoardSize = "small" | "medium" | "large";
export type GameMode = "standard";
export type Difficulty = "random" | "easy" | "hard";
export type LayoutStyle = "classic" | "wooden";

export interface GameConfig {
  boardSize: BoardSize;
  mode: GameMode;
  difficulty: Difficulty;
  layout: LayoutStyle;
}

const TRIVIA_SNIPPETS = [
  "Y was created by a guy named Ea Ea! Believe it or not.",
  "Corners connect two sides of the board, but the dash to the other side can feel like an eternity.",
  "Hex grids are used in strategy games because they avoid diagonal imbalance.",
  "When you are playing the bot, you are actually battling Rust!",
  "Y belongs to the same family as Hex and Havannah, but it has its own unique tactics.",
  "Random bot has the reckless wild card charm, if the more difficult bot gets too boring for you.",
];

function getRandomTrivia() {
  return TRIVIA_SNIPPETS[Math.floor(Math.random() * TRIVIA_SNIPPETS.length)];
}

export function TriviaHelp() {
  const [open, setOpen] = useState(false);
  const [trivia] = useState(getRandomTrivia);

  return (
    <div className={`triviaHelp ${open ? "isOpen" : ""}`}>
      <button
        type="button"
        className="triviaButton"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Show game trivia"
        aria-expanded={open}
      >
        ¿
      </button>

      <div className="triviaCard" aria-hidden={!open}>
        <div className="triviaCardInner">
          <div className="triviaCardFront">?</div>

          <div className="triviaCardBack" role="dialog" aria-live="polite">
            {trivia}
            <button
              className="triviaClose"
              onClick={() => setOpen(false)}
              aria-label="Close trivia"
            >
              ×
            </button>
          </div>
        </div>
      </div>
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
  },
];

export default function GameMenu({
  userName,
  onStartGame,
  onLogOut,
  onViewHistory,
}: Props) {
  const [boardIndex, setBoardIndex] = useState(0);
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
            <div className="historyButton historyButton--desktop">
              <button
                className="btn btnSecondary"
                type="button"
                onClick={onViewHistory}
              >
                Game history
              </button>
            </div>
            <h2 className="menuTitle">Welcome, {userName}.</h2>

            <TriviaHelp />
          </div>

          <p className="menuSubtitle">Choose your setup for Y.</p>

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
              <span className="optionTitle">{boardSizes[boardIndex].title}</span>
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
              onClick={() =>
                setLayoutIndex(goPrev(layoutIndex, layouts.length))
              }
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
              onClick={() =>
                setLayoutIndex(goNext(layoutIndex, layouts.length))
              }
              aria-label="Next board layout"
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


          <div className="historyButton historyButton--mobile">
            <button
              className="btn btnSecondary"
              type="button"
              onClick={onViewHistory}
            >
              Game history
            </button>
          </div>


          <button className="btn btnSecondary" type="button" onClick={onLogOut}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}