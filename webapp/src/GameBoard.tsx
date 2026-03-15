import { useState, useCallback } from "react";
import "./GameBoard.css";

const GAME_BOARD_SIZE = 7;
const API_GATEWAY_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const BOT_IDENTIFIER = "random_bot";
const GAMEY_API_VERSION = "v1";
const HEX_RADIUS = 30;
const HEX_HORIZONTAL_SPACING = HEX_RADIUS * Math.sqrt(3);
const HEX_VERTICAL_SPACING = HEX_RADIUS * 1.5;
const BOARD_MARGIN = HEX_RADIUS * 3;

type Player = 0 | 1;
type BoardMap = Record<string, Player>;
type GameStatus = "ongoing" | "player_won" | "bot_won";

interface YEN {
  size: number;
  turn: number;
  players: string[];
  layout: string;
}

interface BotResponse {
  api_version: string;
  bot_id: string;
  coords: { x: number; y: number; z: number };
}

function coordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Converts a board key ("x,y,z") back into numeric coordinates.
 */
function parseKey(key: string): [number, number, number] {
  const [x, y, z] = key.split(",").map(Number);
  return [x, y, z];
}

function getNeighbors(
  x: number,
  y: number,
  z: number,
): [number, number, number][] {
  const neighbors: [number, number, number][] = [];

  if (x > 0) {
    neighbors.push([x - 1, y + 1, z]);
    neighbors.push([x - 1, y, z + 1]);
  }

  if (y > 0) {
    neighbors.push([x + 1, y - 1, z]);
    neighbors.push([x, y - 1, z + 1]);
  }

  if (z > 0) {
    neighbors.push([x + 1, y, z - 1]);
    neighbors.push([x, y + 1, z - 1]);
  }

  return neighbors;
}

/**
 * BFS win check: a player wins if they have a connected group
 * that simultaneously touches all three sides (A: x=0, B: y=0, C: z=0).
 */
function checkWin(boardMap: BoardMap, player: Player): boolean {
  const visited = new Set<string>();

  for (const key of Object.keys(boardMap)) {
    if (boardMap[key] !== player || visited.has(key)) continue;

    let touchA = false,
      touchB = false,
      touchC = false;
    const queue: string[] = [key];

    while (queue.length > 0) {
      const cur = queue.pop()!;
      if (visited.has(cur)) continue;

      visited.add(cur);

      const [x, y, z] = parseKey(cur);

      if (x === 0) touchA = true;
      if (y === 0) touchB = true;
      if (z === 0) touchC = true;

      if (touchA && touchB && touchC) return true;

      for (const [nx, ny, nz] of getNeighbors(x, y, z)) {
        const nkey = coordKey(nx, ny, nz);
        if (!visited.has(nkey) && boardMap[nkey] === player) {
          queue.push(nkey);
        }
      }
    }
  }

  return false;
}

/**
 * Build YEN (Y-game Exchange Notation) from current board state.
 * Layout rows are separated by '/', row 0 is the apex (1 cell).
 */
function buildYEN(boardMap: BoardMap, nextTurn: Player, size: number): YEN {
  let layout = "";

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= r; c++) {
      const x = size - 1 - r;
      const y = c;
      const z = r - c;

      const key = coordKey(x, y, z);

      if (boardMap[key] === 0) layout += "B";
      else if (boardMap[key] === 1) layout += "R";
      else layout += ".";
    }

    if (r < size - 1) layout += "/";
  }

  return {
    size,
    turn: nextTurn,
    players: ["B", "R"],
    layout,
  };
}

/**
 * Compute SVG polygon points for a flat-top hexagon centered at (cx, cy).
 */
function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, sideIndex) => {
    const angleInRadians = (Math.PI / 180) * (60 * sideIndex + 30);
    return `${(cx + r * Math.cos(angleInRadians)).toFixed(2)},${(cy + r * Math.sin(angleInRadians)).toFixed(2)}`;
  }).join(" ");
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function GameBoard({ onBack }: { onBack: () => void }) {
  const boardSize = GAME_BOARD_SIZE;

  const hexRadius = HEX_RADIUS;
  const hexHorizontalSpacing = HEX_HORIZONTAL_SPACING;
  const hexVerticalSpacing = HEX_VERTICAL_SPACING;
  const boardMargin = BOARD_MARGIN;

  const svgWidth =
    boardMargin * 2 +
    (boardSize - 1) * hexHorizontalSpacing +
    hexHorizontalSpacing;

  const svgHeight =
    boardMargin * 2 + (boardSize - 1) * hexVerticalSpacing + hexRadius * 2;

  const [boardMap, setBoardMap] = useState<BoardMap>({});
  const [currentTurn, setCurrentTurn] = useState<Player>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("ongoing");
  const [loading, setLoading] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [lastBotMove, setLastBotMove] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetGame = () => {
    setBoardMap({});
    setCurrentTurn(0);
    setGameStatus("ongoing");
    setLoading(false);
    setLastBotMove(null);
    setErrorMsg(null);
  };

  const handleCellClick = useCallback(
    async (x: number, y: number, z: number) => {
      if (gameStatus !== "ongoing") return;
      if (currentTurn !== 0 || loading) return;

      const key = coordKey(x, y, z);
      if (boardMap[key] !== undefined) return;

      setErrorMsg(null);

      const afterPlayer: BoardMap = { ...boardMap, [key]: 0 };
      setBoardMap(afterPlayer);

      if (checkWin(afterPlayer, 0)) {
        setGameStatus("player_won");
        return;
      }

      setCurrentTurn(1);
      setLoading(true);

      try {
        const yen = buildYEN(afterPlayer, 1, boardSize);

        const res = await fetch(
          `${API_GATEWAY_URL}/gamey/${GAMEY_API_VERSION}/ybot/choose/${BOT_IDENTIFIER}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(yen),
          },
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? `HTTP ${res.status}`);
        }

        const data: BotResponse = await res.json();
        const { x: bx, y: by, z: bz } = data.coords;

        const botKey = coordKey(bx, by, bz);

        const afterBot: BoardMap = { ...afterPlayer, [botKey]: 1 };
        setBoardMap(afterBot);

        setLastBotMove(botKey);

        if (checkWin(afterBot, 1)) {
          setGameStatus("bot_won");
        } else {
          setCurrentTurn(0);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setErrorMsg(`Bot error: ${msg}`);
        setCurrentTurn(0);
      } finally {
        setLoading(false);
      }
    },
    [boardMap, currentTurn, gameStatus, loading, boardSize],
  );

  const statusLabel =
    gameStatus === "player_won"
      ? "🏆 You win!"
      : gameStatus === "bot_won"
        ? "🤖 Bot wins"
        : loading
          ? "⏳ Bot thinking…"
          : currentTurn === 0
            ? "🔵 Your turn"
            : "🔴 Bot's turn";

  const statusClass =
    gameStatus === "player_won"
      ? "status-win"
      : gameStatus === "bot_won"
        ? "status-lose"
        : loading
          ? "status-wait"
          : currentTurn === 0
            ? "status-player"
            : "status-bot";

  return (
    <div className="board">
      <div className="boardCard">
        <div className="boardHeader">
          <button className="btn" type="button" onClick={onBack}>
            ← Back
          </button>
          <h2>Yovi - Y Game</h2>
          <div style={{ width: 80 }} />
        </div>

        <div className="boardMeta">
          <span className="infoTag">Size: small (7)</span>
          <span className={`statusTag ${statusClass}`}>{statusLabel}</span>

          {gameStatus !== "ongoing" && (
            <button className="btn resetBtn" onClick={resetGame}>
              New game
            </button>
          )}
        </div>

        {errorMsg && <div className="errorBanner">{errorMsg}</div>}

        <div className="svgWrapper">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ display: "block", width: "100%", height: "auto" }}
          >
            {Array.from({ length: boardSize }, (_, row) =>
              Array.from({ length: row + 1 }, (_, col) => {
                const x = boardSize - 1 - row;
                const y = col;
                const z = row - col;

                const key = coordKey(x, y, z);

                const occupied = boardMap[key];
                const isHovered = hoveredKey === key;
                const isLastBot = lastBotMove === key;

                const cx =
                  boardMargin +
                  ((boardSize - 1 - row) * hexHorizontalSpacing) / 2 +
                  col * hexHorizontalSpacing +
                  hexHorizontalSpacing / 2;

                const cy = boardMargin + row * hexVerticalSpacing + hexRadius;

                let fill: string;
                let stroke: string;
                let strokeW = 1;

                if (occupied === 0) {
                  fill = "rgba(56, 189, 248, 0.9)";
                  stroke = "#7dd3fc";
                  strokeW = 2;
                } else if (occupied === 1) {
                  fill = isLastBot
                    ? "rgba(251, 113, 133, 1)"
                    : "rgba(251, 113, 133, 0.85)";
                  stroke = "#fda4af";
                  strokeW = 2;
                } else if (isHovered) {
                  fill = "rgba(56, 189, 248, 0.18)";
                  stroke = "rgba(56, 189, 248, 0.6)";
                  strokeW = 2;
                } else {
                  fill = "rgba(59, 48, 48, 0.04)";
                  stroke = "rgba(0, 0, 0, 0.08)";
                }

                const isClickable =
                  gameStatus === "ongoing" &&
                  currentTurn === 0 &&
                  occupied === undefined &&
                  !loading;

                return (
                  <polygon
                    key={key}
                    points={hexPoints(cx, cy, hexRadius - 1)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeW}
                    style={{
                      cursor: isClickable ? "pointer" : "default",
                      transition: "fill 0.15s, stroke 0.15s",
                    }}
                    onClick={() => handleCellClick(x, y, z)}
                    onMouseEnter={() => {
                      if (isClickable) setHoveredKey(key);
                    }}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              }),
            )}
          </svg>
        </div>

        <div className="boardLegend">
          <span className="legendItem">
            <span className="dot dotBlue" /> You (Blue)
          </span>

          <span className="legendItem">
            <span className="dot dotRed" /> Bot (Red)
          </span>
        </div>

        <p className="rulesHint">
          Connect all three sides of the triangle with your pieces to win.
        </p>
      </div>
    </div>
  );
}
