import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "./GameHistory.css";
import type { Difficulty, BoardSize } from "./GameMenu";

const API_GATEWAY_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type GameResult = "player_won" | "bot_won";

interface GameRecord {
  _id: string;
  result: GameResult;
  totalMoves: number;
  playedAt: string;
  board: Record<string, 0 | 1>;
  difficulty?: Difficulty;
  boardSize?: BoardSize;
  points?: number;
}

interface LeaderboardEntry {
  username: string;
  totalPoints: number;
  gamesPlayed: number;
}

// Interfaces for the new Stats data structure
interface StatsData {
  byDifficulty: Array<{ _id: string; total: number; wins: number }>;
  progression: Array<{ points: number; date: string }>;
  avgMoves: Array<{ _id: string; avgMoves: number }>;
}

type SortField =
  | "playedAt"
  | "totalMoves"
  | "result"
  | "difficulty"
  | "boardSize"
  | "points";
type SortDir = "asc" | "desc";

interface Props {
  readonly onBack: () => void;
  readonly userName: string;
}

export default function GameHistory({ onBack, userName }: Props) {
  const [view, setView] = useState<"history" | "leaderboard" | "stats">(
    "history",
  );
  const [games, setGames] = useState<GameRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // History Sort State
  const [sortField, setSortField] = useState<SortField>("playedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | GameResult>("all");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        if (view === "history") {
          const res = await fetch(
            `${API_GATEWAY_URL}/api/users/games/list?username=${encodeURIComponent(userName)}`,
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setGames(await res.json());
        } else if (view === "leaderboard") {
          const res = await fetch(
            `${API_GATEWAY_URL}/api/users/games/leaderboard`,
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setLeaderboard(await res.json());
        } else if (view === "stats") {
          const res = await fetch(
            `${API_GATEWAY_URL}/api/users/games/stats?username=${encodeURIComponent(userName)}`,
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setStats(await res.json());
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userName, view]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field)
      return <span className="sortIcon inactive">↕</span>;
    return (
      <span className="sortIcon active">{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  };

  const filtered = games.filter((g) => filter === "all" || g.result === filter);

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortField === "playedAt") {
      cmp = new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime();
    } else if (sortField === "totalMoves") {
      cmp = (a.totalMoves ?? 0) - (b.totalMoves ?? 0);
    } else if (sortField === "points") {
      cmp = (a.points ?? 0) - (b.points ?? 0);
    } else if (sortField === "result") {
      cmp = a.result.localeCompare(b.result);
    } else {
      const valA = String(a[sortField as keyof GameRecord] ?? "");
      const valB = String(b[sortField as keyof GameRecord] ?? "");
      cmp = valA.localeCompare(valB);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const difficultyLabel: Record<Difficulty, string> = {
    random: "🎲 Rand",
    easy: "😊 Easy",
    hard: "🔥 Hard",
  };

  const boardSizeLabel: Record<BoardSize, string> = {
    small: "5×5",
    medium: "7×7",
    large: "9×9",
  };

  return (
    <div className="history">
      <div className="historyCard">
        <div className="historyHeader">
          <button className="btn" type="button" onClick={onBack}>
            ← Back
          </button>
          <div className="viewToggle">
            <button
              className={`toggleBtn ${view === "history" ? "active" : ""}`}
              onClick={() => setView("history")}
            >
              History
            </button>
            <button
              className={`toggleBtn ${view === "stats" ? "active" : ""}`}
              onClick={() => setView("stats")}
            >
              Stats
            </button>
            <button
              className={`toggleBtn ${view === "leaderboard" ? "active" : ""}`}
              onClick={() => setView("leaderboard")}
            >
              Rank
            </button>
          </div>
          <div style={{ width: 80 }} />
        </div>

        {loading ? (
          <div className="historyCenter">
            <div className="spinner" />
          </div>
        ) : error ? (
          <div className="historyCenter">
            <p className="errorText">Error: {error}</p>
          </div>
        ) : view === "history" ? (
          /* --- HISTORY TABLE VIEW --- */
          <>
            <div className="filterTabs">
              {(["all", "player_won", "bot_won"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`filterTab ${filter === f ? "activeTab" : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all"
                    ? "All"
                    : f === "player_won"
                      ? "🏆 Wins"
                      : "🤖 Losses"}
                </button>
              ))}
            </div>
            <div className="tableWrapper">
              <table className="historyTable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("result")}
                    >
                      Result {sortIcon("result")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("difficulty")}
                    >
                      Difficulty {sortIcon("difficulty")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("boardSize")}
                    >
                      Size {sortIcon("boardSize")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("points")}
                    >
                      Points {sortIcon("points")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("totalMoves")}
                    >
                      Moves {sortIcon("totalMoves")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("playedAt")}
                    >
                      Date {sortIcon("playedAt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((game, i) => (
                    <tr
                      key={game._id}
                      className={
                        game.result === "player_won" ? "rowWin" : "rowLoss"
                      }
                    >
                      <td className="tdIndex">{i + 1}</td>
                      <td>
                        <span
                          className={`resultBadge ${game.result === "player_won" ? "badgeWin" : "badgeLoss"}`}
                        >
                          {game.result === "player_won" ? "🏆 Win" : "🤖 Loss"}
                        </span>
                      </td>
                      <td className="tdDifficulty">
                        {game.difficulty
                          ? difficultyLabel[game.difficulty]
                          : "—"}
                      </td>
                      <td className="tdBoardSize">
                        {game.boardSize ? boardSizeLabel[game.boardSize] : "—"}
                      </td>
                      <td className="tdPoints">{game.points ?? 0}</td>
                      <td className="tdMoves">{game.totalMoves ?? "—"}</td>
                      <td className="tdDate">
                        {new Date(game.playedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : view === "leaderboard" ? (
          /* --- LEADERBOARD VIEW --- */
          <div className="tableWrapper">
            <table className="historyTable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Total Points</th>
                  <th>Games</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr
                    key={entry.username}
                    className={
                      entry.username === userName ? "rowHighlight" : ""
                    }
                  >
                    <td className="tdIndex">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>
                      {entry.username} {entry.username === userName && "(You)"}
                    </td>
                    <td className="tdPoints" style={{ color: "#fbbf24" }}>
                      ★ {entry.totalPoints.toLocaleString()}
                    </td>
                    <td>{entry.gamesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* --- STATS DASHBOARD VIEW --- */
          <div className="statsDashboard">
            {stats && (
              <>
                <div className="chartCard">
                  <h3>Point Progression (Last 10 Games)</h3>
                  <div style={{ width: "100%", height: 250 }}>
                    <ResponsiveContainer>
                      <LineChart data={stats.progression}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#333"
                          vertical={false}
                        />
                        <XAxis dataKey="date" tick={false} stroke="#666" />
                        <YAxis stroke="#666" fontSize={12} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1a1a1f",
                            border: "1px solid #333",
                            borderRadius: "8px",
                          }}
                          itemStyle={{ color: "#818cf8" }}
                          labelFormatter={() => "Game Session"}
                        />
                        <Line
                          type="monotone"
                          dataKey="points"
                          stroke="#818cf8"
                          strokeWidth={3}
                          dot={{ r: 4, fill: "#818cf8" }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="chartGrid">
                  <div className="chartCard">
                    <h3>Win Rate by Difficulty</h3>
                    <div style={{ width: "100%", height: 200 }}>
                      <ResponsiveContainer>
                        <BarChart data={stats.byDifficulty}>
                          <XAxis
                            dataKey="_id"
                            stroke="#666"
                            fontSize={12}
                            tickFormatter={(val) =>
                              val.charAt(0).toUpperCase() + val.slice(1)
                            }
                          />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            contentStyle={{
                              backgroundColor: "#1a1a1f",
                              border: "1px solid #333",
                            }}
                          />
                          <Bar
                            dataKey="wins"
                            fill="#4ade80"
                            radius={[4, 4, 0, 0]}
                            barSize={40}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="chartCard">
                    <h3>Average Moves</h3>
                    <div className="avgMovesList">
                      {stats.avgMoves.map((m) => (
                        <div key={m._id} className="avgMoveItem">
                          <span className="label">
                            {m._id === "player_won"
                              ? "🏆 Win Avg"
                              : "🤖 Loss Avg"}
                          </span>
                          <span className="value">
                            {Math.round(m.avgMoves)} moves
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
