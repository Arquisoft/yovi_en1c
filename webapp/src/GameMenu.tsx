import { useState } from 'react';
import './GameMenu.css';

export type BoardSize = 'small' | 'medium' | 'large';
export type GameMode = 'standard' | 'standard_pie' | 'master_y';
export type LayoutStyle = 'classic' | 'futuristic' | 'wooden';

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

const boardSizeLabels: Record<BoardSize, string> = {
    small: 'Small (--)',
    medium: 'Medium (**)',
    large: 'Large (93 nodes)'
};

const modeLabels: Record<GameMode, string> = {
    standard: 'Standard',
    standard_pie: 'Standard (Pie)',
    master_y: 'Master Y',
};

const layoutLabels: Record<LayoutStyle, string> = {
    classic: 'Classic',
    futuristic: 'Futuristic',
    wooden: 'Wooden'
};

export default function GameMenu({ userName, onStartGame, onLogOut }: Props) {
    const [config, setConfig] = useState<GameConfig>({
        boardSize: 'large',
        mode: 'standard',
        layout: 'classic',
    });

    return (
        <div className="menu">
            <div className="menuCard">
                <h2 className="menuTitle">Hello, {userName} 👋</h2>
                <p className="menuSubtitle">Choose how you want to play Y.</p>

                <div className="menuGrid">
                    <div className="field">
                        <span className="fieldLabel">Board size</span>
                        <select
                            className="select"
                            value={config.boardSize}
                            onChange={(e) =>
                                setConfig((c) => ({ ...c, boardSize: e.target.value as BoardSize }))
                            }
                        >
                            {Object.entries(boardSizeLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <span className="fieldLabel">Game mode</span>
                        <select
                            className="select"
                            value={config.mode}
                            onChange={(e) =>
                                setConfig((c) => ({ ...c, mode: e.target.value as GameMode }))
                            }
                        >
                            {Object.entries(modeLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="field">
                        <span className="fieldLabel">Layout style</span>
                        <select
                            className="select"
                            value={config.layout}
                            onChange={(e) =>
                                setConfig((c) => ({ ...c, layout: e.target.value as LayoutStyle }))
                            }
                        >
                            {Object.entries(layoutLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="actions">
                    <button className="btn btnPrimary" type="button" onClick={() => onStartGame(config)}>
                        Start game
                    </button>
                    <button className="btn" type="button" onClick={onLogOut}>
                        Log out
                    </button>
                </div>

                <div className="preview">
                    <div className="previewTitle">Config preview</div>
                    <pre style={{ margin: 0 }}>{JSON.stringify(config, null, 2)}</pre>
                </div>
            </div>
        </div>
    );
}