import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./GameMenu.css";

export type BoardSize = "small" | "medium" | "large";
export type GameMode = "standard" | "rob";
export type Difficulty = "random" | "easy" | "hard";
export type LayoutStyle = "classic";

export interface GameConfig {
  boardSize: BoardSize;
  mode: GameMode;
  difficulty: Difficulty;
  layout: LayoutStyle;
}

type Props = {
  userName: string;
  onStartGame: (config: GameConfig) => void;
  onLogOut: () => void;
  onViewHistory: () => void;
};

const boardSizeValues: BoardSize[] = ["small", "medium", "large"];
const gameModeValues: GameMode[] = ["standard", "rob"];
const difficultyValues: Difficulty[] = ["random", "easy", "hard"];

export default function GameMenu({
  userName,
  onStartGame,
  onLogOut,
  onViewHistory,
}: Props) {
  const { t } = useTranslation();
  const [boardIndex, setBoardIndex] = useState(0);
  const [modeIndex, setModeIndex] = useState(0);
  const [difficultyIndex, setDifficultyIndex] = useState(0);

  const config: GameConfig = {
    boardSize: boardSizeValues[boardIndex],
    mode: gameModeValues[modeIndex],
    difficulty: difficultyValues[difficultyIndex],
    layout: "classic",
  };

  const goPrev = (index: number, length: number) => (index - 1 + length) % length;
  const goNext = (index: number, length: number) => (index + 1) % length;

  const boardLabels = boardSizeValues.map((v) => ({
    title: t(`menu.board.${v}_title`),
    description: t(`menu.board.${v}_desc`),
  }));

  const modeLabels = gameModeValues.map((v) => ({
    title: t(`menu.mode.${v}_title`),
    description: t(`menu.mode.${v}_desc`),
  }));

  const difficultyLabels = difficultyValues.map((v) => ({
    title: t(`menu.difficulty.${v}_title`),
    description: t(`menu.difficulty.${v}_desc`),
  }));

  return (
    <div className="menu">
      <div className="menuCard">
        <div className="menuHeader">
          <h2 className="menuTitle">{t("menu.title")}</h2>
          <p className="menuSubtitle">{t("menu.subtitle", { name: userName })}</p>
          <button className="btn btnSecondary" type="button" onClick={onViewHistory}>
            {t("menu.view_history")}
          </button>
        </div>

        {/* Board size */}
        <section className="menuSection">
          <h3 className="sectionTitle">{t("menu.board_size")}</h3>
          <div className="carousel">
            <button
              type="button"
              className="carouselButton"
              onClick={() => setBoardIndex(goPrev(boardIndex, boardSizeValues.length))}
              aria-label={t("menu.prev_aria", { section: t("menu.board_size_aria") })}
            >
              ‹
            </button>
            <div className="carouselCard">
              <span className="optionTitle">{boardLabels[boardIndex].title}</span>
              <span className="optionDescription">{boardLabels[boardIndex].description}</span>
            </div>
            <button
              type="button"
              className="carouselButton"
              onClick={() => setBoardIndex(goNext(boardIndex, boardSizeValues.length))}
              aria-label={t("menu.next_aria", { section: t("menu.board_size_aria") })}
            >
              ›
            </button>
          </div>
        </section>

        {/* Game mode */}
        <section className="menuSection">
          <h3 className="sectionTitle">{t("menu.game_mode")}</h3>
          <div className="carousel">
            <button
              type="button"
              className="carouselButton"
              onClick={() => setModeIndex(goPrev(modeIndex, gameModeValues.length))}
              aria-label={t("menu.prev_aria", { section: t("menu.game_mode_aria") })}
            >
              ‹
            </button>
            <div className="carouselCard">
              <span className="optionTitle">{modeLabels[modeIndex].title}</span>
              <span className="optionDescription">{modeLabels[modeIndex].description}</span>
            </div>
            <button
              type="button"
              className="carouselButton"
              onClick={() => setModeIndex(goNext(modeIndex, gameModeValues.length))}
              aria-label={t("menu.next_aria", { section: t("menu.game_mode_aria") })}
            >
              ›
            </button>
          </div>
        </section>

        {/* Difficulty */}
        <section className="menuSection">
          <h3 className="sectionTitle">{t("menu.opponent_style")}</h3>
          <div className="carousel">
            <button
              type="button"
              className="carouselButton"
              onClick={() => setDifficultyIndex(goPrev(difficultyIndex, difficultyValues.length))}
              aria-label={t("menu.prev_aria", { section: t("menu.difficulty_aria") })}
            >
              ‹
            </button>
            <div className="carouselCard">
              <span className="optionTitle">{difficultyLabels[difficultyIndex].title}</span>
              <span className="optionDescription">{difficultyLabels[difficultyIndex].description}</span>
            </div>
            <button
              type="button"
              className="carouselButton"
              onClick={() => setDifficultyIndex(goNext(difficultyIndex, difficultyValues.length))}
              aria-label={t("menu.next_aria", { section: t("menu.difficulty_aria") })}
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
            {t("menu.start_game")}
          </button>
          <button className="btn btnSecondary" type="button" onClick={onLogOut}>
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}