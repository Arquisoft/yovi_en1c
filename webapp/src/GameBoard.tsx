import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "./GameBoard.css";
import type { GameConfig, Difficulty } from "./GameMenu";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_GATEWAY_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const GAMEY_API_VERSION = "v1";
const HEX_RADIUS = 30;
const HEX_HORIZONTAL_SPACING = HEX_RADIUS * Math.sqrt(3);
const HEX_VERTICAL_SPACING = HEX_RADIUS * 1.5;
const BOARD_MARGIN = HEX_RADIUS * 3;

const BOARD_SIZE_MAP: Record<GameConfig["boardSize"], number> = {
  small: 5,
  medium: 7,
  large: 9,
};

const BOT_ID_MAP: Record<Difficulty, string> = {
  random: "random_bot",
  easy: "easy_bot",
  hard: "heuristic_bot",
};
const ROB_BOT_ID_MAP: Record<Difficulty, string> = {
  random: "rob_bot_random",
  easy: "rob_bot_easy",
  hard: "rob_bot_hard",
};

const LAYOUT_CLASS_MAP: Record<GameConfig["layout"], string> = {
  classic: "layout-classic",
};

// ─── Types ────────────────────────────────────────────────────────────────────

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
  is_steal: boolean;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function coordKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

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
        if (!visited.has(nkey) && boardMap[nkey] === player) queue.push(nkey);
      }
    }
  }
  return false;
}

async function saveGame(
  result: GameStatus,
  board: BoardMap,
  username: string,
  difficulty: Difficulty,
  boardSize: GameConfig["boardSize"],
  mode: "standard" | "rob",
) {
  const totalMoves = Object.keys(board).length;
  await fetch(`${API_GATEWAY_URL}/api/users/savegame`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      result,
      board,
      totalMoves,
      username,
      difficulty,
      boardSize,
      mode,
    }),
  }).catch(console.error);
}

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
  return { size, turn: nextTurn, players: ["B", "R"], layout };
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i + 30);
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  readonly config: GameConfig;
  readonly onBack: () => void;
  readonly userName: string;
}

export default function GameBoard({ config, onBack, userName }: Props) {
  const { t } = useTranslation();
  const isRobMode = config.mode === "rob";
  const boardSize = BOARD_SIZE_MAP[config.boardSize];
  const botId =
    config.mode === "rob"
      ? ROB_BOT_ID_MAP[config.difficulty]
      : BOT_ID_MAP[config.difficulty];
  const layoutClass = LAYOUT_CLASS_MAP[config.layout];

  const svgWidth =
    BOARD_MARGIN * 2 +
    (boardSize - 1) * HEX_HORIZONTAL_SPACING +
    HEX_HORIZONTAL_SPACING;
  const svgHeight =
    BOARD_MARGIN * 2 + (boardSize - 1) * HEX_VERTICAL_SPACING + HEX_RADIUS * 2;

  const [boardMap, setBoardMap] = useState<BoardMap>({});
  const [currentTurn, setCurrentTurn] = useState<Player>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("ongoing");
  const [loading, setLoading] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [lastBotMove, setLastBotMove] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerBonusTurn, setPlayerBonusTurn] = useState(false);
  // Rob-mode UI state
  // When true, the player has activated rob mode and must click a bot cell.
  const [robModeActive, setRobModeActive] = useState(false);
  // Tracks the last cell stolen (player or bot) for visual highlight.
  const [lastRobbedKey, setLastRobbedKey] = useState<string | null>(null);

  const resetGame = () => {
    setBoardMap({});
    setCurrentTurn(0);
    setGameStatus("ongoing");
    setLoading(false);
    setLastBotMove(null);
    setLastRobbedKey(null);
    setErrorMsg(null);
    setRobModeActive(false);
    setPlayerBonusTurn(false);
  };

  async function fetchBotMove(botId: string, yen: YEN): Promise<BotResponse> {
    const res = await fetch(
      `${API_GATEWAY_URL}/api/gamey/${GAMEY_API_VERSION}/ybot/choose/${botId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(yen),
      },
    );
    const data = await res.json();
    console.log("Bot response:", JSON.stringify(data));
    if (!res.ok) {
      throw new Error(data.message ?? `HTTP ${res.status}`);
    }
    return data;
  }

  /**
   * Runs a single bot turn. Returns the updated board after the bot plays.
   * In rob mode, the bot has BOT_ROB_PROBABILITY chance of robbing a player cell
   * instead of placing a new piece.
   */
  async function runBotTurn(
    currentBoard: BoardMap,
  ): Promise<{ board: BoardMap; wasSteal: boolean }> {
    const data = await fetchBotMove(
      botId,
      buildYEN(currentBoard, 1, boardSize),
    );
    const botKey = coordKey(data.coords.x, data.coords.y, data.coords.z);

    if (data.is_steal) {
      setLastRobbedKey(botKey);
      setLastBotMove(null);
    } else {
      setLastBotMove(botKey);
      setLastRobbedKey(null);
    }

    return { board: { ...currentBoard, [botKey]: 1 }, wasSteal: data.is_steal };
  }

  // ─── Player robs a bot cell ───────────────────────────────────────────────

  const handleRobCell = useCallback(
    async (key: string) => {
      if (!robModeActive || gameStatus !== "ongoing" || loading) return;

      setRobModeActive(false);
      setErrorMsg(null);

      const afterRob: BoardMap = { ...boardMap, [key]: 0 };
      setLastRobbedKey(key);
      setBoardMap(afterRob);

      if (checkWin(afterRob, 0)) {
        setGameStatus("player_won");
        saveGame(
          "player_won",
          afterRob,
          userName,
          config.difficulty,
          config.boardSize,
          config.mode,
        );
        return;
      }

      setCurrentTurn(1);
      setLoading(true);

      try {
        const { board: afterBot1 } = await runBotTurn(afterRob);
        setBoardMap(afterBot1);

        if (checkWin(afterBot1, 1)) {
          setGameStatus("bot_won");
          saveGame(
            "bot_won",
            afterBot1,
            userName,
            config.difficulty,
            config.boardSize,
            config.mode,
          );
          return;
        }

        await new Promise((r) => setTimeout(r, 600));

        const { board: afterBot2 } = await runBotTurn(afterBot1);
        setBoardMap(afterBot2);

        if (checkWin(afterBot2, 1)) {
          setGameStatus("bot_won");
          saveGame(
            "bot_won",
            afterBot2,
            userName,
            config.difficulty,
            config.boardSize,
            config.mode,
          );
        } else {
          setCurrentTurn(0);
        }
      } catch (err) {
        setErrorMsg(
          t("board.bot_error", {
            message: err instanceof Error ? err.message : "Unknown error",
          }),
        );
        setCurrentTurn(0);
      } finally {
        setLoading(false);
      }
    },
    [
      robModeActive,
      boardMap,
      gameStatus,
      loading,
      boardSize,
      userName,
      botId,
      t,
    ],
  );
  // ─── Player places a normal cell ─────────────────────────────────────────

  const handleCellClick = useCallback(
    async (x: number, y: number, z: number) => {
      const key = coordKey(x, y, z);

      if (robModeActive) {
        if (boardMap[key] === 1) handleRobCell(key);
        return;
      }

      if (gameStatus !== "ongoing" || currentTurn !== 0 || loading) return;
      if (boardMap[key] !== undefined) return;

      setErrorMsg(null);
      const afterPlayer: BoardMap = { ...boardMap, [key]: 0 };
      setBoardMap(afterPlayer);
      setLastRobbedKey(null);

      if (checkWin(afterPlayer, 0)) {
        setGameStatus("player_won");
        saveGame(
          "player_won",
          afterPlayer,
          userName,
          config.difficulty,
          config.boardSize,
          config.mode,
        );
        return;
      }

      if (playerBonusTurn) {
        setPlayerBonusTurn(false);
        return;
      }

      setCurrentTurn(1);
      setLoading(true);

      try {
        const { board: afterBot, wasSteal } = await runBotTurn(afterPlayer);
        setBoardMap(afterBot);

        if (checkWin(afterBot, 1)) {
          setGameStatus("bot_won");
          saveGame(
            "bot_won",
            afterBot,
            userName,
            config.difficulty,
            config.boardSize,
            config.mode,
          );
          return;
        }

        if (wasSteal) {
          setPlayerBonusTurn(true);
        }

        setCurrentTurn(0);
      } catch (err) {
        setErrorMsg(
          t("board.bot_error", {
            message: err instanceof Error ? err.message : "Unknown error",
          }),
        );
        setCurrentTurn(0);
      } finally {
        setLoading(false);
      }
    },
    [
      boardMap,
      currentTurn,
      gameStatus,
      loading,
      boardSize,
      userName,
      botId,
      robModeActive,
      playerBonusTurn,
      t,
    ],
  );

  // ─── Labels ───────────────────────────────────────────────────────────────

  const statusLabel = robModeActive
    ? t("board.status.rob_active")
    : gameStatus === "player_won"
      ? t("board.status.you_win")
      : gameStatus === "bot_won"
        ? t("board.status.bot_wins")
        : loading
          ? t("board.status.thinking")
          : currentTurn === 0
            ? t("board.status.your_turn")
            : t("board.status.bot_turn");

  const statusClass = robModeActive
    ? "status-rob"
    : gameStatus === "player_won"
      ? "status-win"
      : gameStatus === "bot_won"
        ? "status-lose"
        : loading
          ? "status-wait"
          : currentTurn === 0
            ? "status-player"
            : "status-bot";

  const modeLabel =
    config.mode === "standard" ? t("board.info.standard") : t("board.info.rob");

  // ─── Per-cell visual logic ────────────────────────────────────────────────

  function getCellStyle(
    key: string,
    occupied: Player | undefined,
    isHovered: boolean,
  ) {
    const isLastBot = lastBotMove === key;
    const isRobbed = lastRobbedKey === key;
    const isRobTarget = robModeActive && occupied === 1; // bot cell highlightable for rob

    let fill: string;
    let stroke: string;
    let strokeW = 1;
    let filter: string | undefined;

    if (occupied === 0) {
      fill = isRobbed ? "rgba(56, 189, 248, 1)" : "rgba(56, 189, 248, 0.9)";
      stroke = "#7dd3fc";
      strokeW = 2;
    } else if (occupied === 1) {
      if (isRobTarget && isHovered) {
        // Bot cell being hovered in rob mode — preview as stealable
        fill = "rgba(250, 204, 21, 0.75)";
        stroke = "#fbbf24";
        strokeW = 3;
        filter = "drop-shadow(0 0 6px rgba(251,191,36,0.8))";
      } else if (isRobTarget) {
        // Bot cell available to rob — pulsing amber tint
        fill = "rgba(251, 113, 133, 0.85)";
        stroke = "#fbbf24";
        strokeW = 2.5;
        filter = "drop-shadow(0 0 4px rgba(251,191,36,0.5))";
      } else if (isRobbed) {
        fill = "rgba(251, 113, 133, 1)";
        stroke = "#f87171";
        strokeW = 3;
      } else {
        fill = isLastBot
          ? "rgba(251, 113, 133, 1)"
          : "rgba(251, 113, 133, 0.85)";
        stroke = "#fda4af";
        strokeW = isLastBot ? 2 : 1;
      }
    } else if (isHovered) {
      fill = "rgba(56, 189, 248, 0.18)";
      stroke = "rgba(56, 189, 248, 0.6)";
      strokeW = 2;
    } else {
      fill = "rgba(59, 48, 48, 0.04)";
      stroke = "rgba(0, 0, 0, 0.08)";
    }

    return { fill, stroke, strokeW, filter };
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const canPlayerAct =
    gameStatus === "ongoing" && currentTurn === 0 && !loading;
  const canRob =
    isRobMode &&
    canPlayerAct &&
    !robModeActive &&
    Object.values(boardMap).some((v) => v === 1);

  return (
    <div className="board">
      <div className="boardCard">
        <div className="boardHeader">
          <button className="btn" type="button" onClick={onBack}>
            {t("common.back")}
          </button>
          <h2>{t("board.title")}</h2>
          <div style={{ width: 80 }} />
        </div>

        <div className="boardMeta">
          <span className="infoTag">
            {config.boardSize.charAt(0).toUpperCase() +
              config.boardSize.slice(1)}{" "}
            ({boardSize}×{boardSize})
          </span>
          <span className="infoTag">{modeLabel}</span>
          <span className="infoTag">
            {t(`board.difficulty_label.${config.difficulty}`)}
          </span>
          <span className={`statusTag ${statusClass}`}>{statusLabel}</span>
          {gameStatus !== "ongoing" && (
            <button className="btn resetBtn" onClick={resetGame}>
              {t("board.new_game")}
            </button>
          )}
        </div>

        {/* Rob-mode action bar */}
        {isRobMode && gameStatus === "ongoing" && (
          <div className="robBar">
            {robModeActive ? (
              <>
                <span className="robHint">{t("board.rob.select_hint")}</span>
                <button
                  className="btn btnRobCancel"
                  type="button"
                  onClick={() => setRobModeActive(false)}
                >
                  {t("board.rob.cancel")}
                </button>
              </>
            ) : (
              <>
                <span className="robHint">{t("board.rob.cost_hint")}</span>
                <button
                  className="btn btnRob"
                  type="button"
                  disabled={!canRob}
                  onClick={() => setRobModeActive(true)}
                >
                  🗡 {t("board.rob.action")}
                </button>
              </>
            )}
          </div>
        )}

        {errorMsg && <div className="errorBanner">{errorMsg}</div>}

        <div className={`svgWrapper ${layoutClass}`}>
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

                const cx =
                  BOARD_MARGIN +
                  ((boardSize - 1 - row) * HEX_HORIZONTAL_SPACING) / 2 +
                  col * HEX_HORIZONTAL_SPACING +
                  HEX_HORIZONTAL_SPACING / 2;
                const cy =
                  BOARD_MARGIN + row * HEX_VERTICAL_SPACING + HEX_RADIUS;

                const { fill, stroke, strokeW, filter } = getCellStyle(
                  key,
                  occupied,
                  isHovered,
                );

                const isClickable =
                  canPlayerAct &&
                  (robModeActive
                    ? occupied === 1
                    : occupied === undefined && !robModeActive);

                return (
                  <polygon
                    key={key}
                    points={hexPoints(cx, cy, HEX_RADIUS - 1)}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={strokeW}
                    filter={filter}
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
            <span className="dot dotBlue" /> {t("board.legend.you")}
          </span>
          <span className="legendItem">
            <span className="dot dotRed" /> {t("board.legend.bot")}
          </span>
          {isRobMode && (
            <span className="legendItem">
              <span className="dot dotRob" /> {t("board.legend.rob")}
            </span>
          )}
        </div>
        <p className="rulesHint">
          {isRobMode ? t("board.rules_hint_rob") : t("board.rules_hint")}
        </p>
      </div>
    </div>
  );
}
