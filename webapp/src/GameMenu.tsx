import { useState } from 'react';
import './GameMenu.css';

export type BoardSize = 'medium';
export type GameMode = 'standard';
export type LayoutStyle = 'classic';

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
};

const boardSizes = [
    { value: 'medium' as BoardSize, title: 'Medium', description: 'Balanced board' },
];

const gameModes = [
    { value: 'standard' as GameMode, title: 'Standard', description: 'Classic Y rules' },
];

const layouts = [
    { value: 'classic' as LayoutStyle, title: 'Classic', description: 'Clean tournament look' },
];

export default function GameMenu({ userName, onStartGame, onLogOut }: Props) {
    const [boardIndex, setBoardIndex] = useState(0);
    const [modeIndex, setModeIndex] = useState(0);
    const [layoutIndex, setLayoutIndex] = useState(0);

    const config: GameConfig = {
        boardSize: boardSizes[boardIndex].value,
        mode: gameModes[modeIndex].value,
        layout: layouts[layoutIndex].value,
    };

    const goPrev = (index: number, length: number) => {
        return (index - 1 + length) % length;
    };

    const goNext = (index: number, length: number) => {
        return (index + 1) % length;
    };

    return (
        <div className="menu">
            <div className="menuCard">
                <div className="menuHeader">
                    <h2 className="menuTitle">Game Lobby</h2>
                    <p className="menuSubtitle">Welcome, {userName}. Choose your setup for Y.</p>
                </div>

                <section className="menuSection">
                    <h3 className="sectionTitle">Board size</h3>
                    <div className="carousel">
                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setBoardIndex(goPrev(boardIndex, boardSizes.length))}
                            aria-label="Previous board size"
                        >
                            ‹
                        </button>

                        <div className="carouselCard">
                            <span className="optionTitle">{boardSizes[boardIndex].title}</span>
                            <span className="optionDescription">{boardSizes[boardIndex].description}</span>
                        </div>

                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setBoardIndex(goNext(boardIndex, boardSizes.length))}
                            aria-label="Next board size"
                        >
                            ›
                        </button>
                    </div>
                </section>

                <section className="menuSection">
                    <h3 className="sectionTitle">Game mode</h3>
                    <div className="carousel">
                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setModeIndex(goPrev(modeIndex, gameModes.length))}
                            aria-label="Previous game mode"
                        >
                            ‹
                        </button>

                        <div className="carouselCard">
                            <span className="optionTitle">{gameModes[modeIndex].title}</span>
                            <span className="optionDescription">{gameModes[modeIndex].description}</span>
                        </div>

                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setModeIndex(goNext(modeIndex, gameModes.length))}
                            aria-label="Next game mode"
                        >
                            ›
                        </button>
                    </div>
                </section>

                <section className="menuSection">
                    <h3 className="sectionTitle">Layout style</h3>
                    <div className="carousel">
                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setLayoutIndex(goPrev(layoutIndex, layouts.length))}
                            aria-label="Previous layout"
                        >
                            ‹
                        </button>

                        <div className="carouselCard">
                            <span className="optionTitle">{layouts[layoutIndex].title}</span>
                            <span className="optionDescription">{layouts[layoutIndex].description}</span>
                        </div>

                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setLayoutIndex(goNext(layoutIndex, layouts.length))}
                            aria-label="Next layout"
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