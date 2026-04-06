import { useState } from 'react';
import './GameMenu.css';

export type BoardSize = 'small' | 'medium' | 'large';
export type GameMode = 'standard';
export type Difficulty = 'random' | 'easy' | 'hard';
export type LayoutStyle = 'classic';

// This interface defines the configuration options for starting a game of Y.
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

const boardSizes = [
    {
        value: 'small' as BoardSize, title: 'Small', description: '5x5 board, suitable for quick games'
    },
    {
        value: 'medium' as BoardSize, title: 'Medium', description: '7x7 board, classic Y experience'
    },
    {
        value: 'large' as BoardSize, title: 'Large', description: '9x9 board, extensive Y gameplay'
    }
];

const gameModes = [
    { value: 'standard' as GameMode, title: 'Standard', description: 'Classic Y rules' },
];

const difficulties = [
    { value: 'random' as Difficulty, title: 'Random', description: 'Random difficulty' },
    { value: 'easy' as Difficulty, title: 'Easy', description: 'Bit more difficult' },
    { value: 'hard' as Difficulty, title: 'Hard', description: 'Clean tournament look' },
];

export default function GameMenu({ userName, onStartGame, onLogOut, onViewHistory }: Props) {
    const [boardIndex, setBoardIndex] = useState(0);
    const [modeIndex, setModeIndex] = useState(0);
    const [difficultyIndex, setDifficultyIndex] = useState(0);

    const config: GameConfig = {
        boardSize: boardSizes[boardIndex].value,
        mode: gameModes[modeIndex].value,
        difficulty: difficulties[difficultyIndex].value,
        layout: 'classic',
    };

    const goPrev = (index: number, length: number) => {
        return (index - 1 + length) % length;
    };

    const goNext = (index: number, length: number) => {
        return (index + 1) % length;
    };

    return (
        <div className="menu">
            <div className="historyButtonWrapper">
                <button
                    className="btn btnSecondary"
                    type="button"
                    onClick={onViewHistory}
                >
                    Game history
                </button>
            </div>


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
                            onClick={() => setDifficultyIndex(goPrev(difficultyIndex, difficulties.length))}
                            aria-label="Previous difficulty"
                        >
                            ‹
                        </button>

                        <div className="carouselCard">
                            <span className="optionTitle">{difficulties[difficultyIndex].title}</span>
                            <span className="optionDescription">{difficulties[difficultyIndex].description}</span>
                        </div>

                        <button
                            type="button"
                            className="carouselButton"
                            onClick={() => setDifficultyIndex(goNext(difficultyIndex, difficulties.length))}
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