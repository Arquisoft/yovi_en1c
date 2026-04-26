import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation();
  const [view, setView] = useState<"history" | "leaderboard" | "stats">(
    "history",
  );
  const [games, setGames] = useState<GameRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>("playedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | GameResult>("all");

  const difficultyLabel: Record<Difficulty, string> = {
    random: t("history.difficulty_label.random"),
    easy: t("history.difficulty_label.easy"),
    hard: t("history.difficulty_label.hard"),
  };

  const boardSizeLabel: Record<BoardSize, string> = {
    small: t("history.board_size.small"),
    medium: t("history.board_size.medium"),
    large: t("history.board_size.large"),
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(i18n.resolvedLanguage, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [gamesRes, leaderRes, statsRes] = await Promise.all([
          fetch(`${API_GATEWAY_URL}/api/users/games/list?username=${userName}`),
          fetch(`${API_GATEWAY_URL}/api/users/games/leaderboard`),
          fetch(
            `${API_GATEWAY_URL}/api/users/games/stats?username=${userName}`,
          ),
        ]);

        if (!gamesRes.ok || !leaderRes.ok || !statsRes.ok) {
          throw new Error("Failed to fetch data from one or more services");
        }

        const gamesData = await gamesRes.json();
        const leaderData = await leaderRes.json();
        const statsData = await statsRes.json();

        setGames(gamesData);
        setLeaderboard(leaderData);
        setStats(statsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userName]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = games.filter((g) =>
    filter === "all" ? true : g.result === filter,
  );

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
    } else if (sortField === "difficulty") {
      cmp = (a.difficulty ?? "").localeCompare(b.difficulty ?? "");
    } else if (sortField === "boardSize") {
      cmp = (a.boardSize ?? "").localeCompare(b.boardSize ?? "");
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const wins = games.filter((g) => g.result === "player_won").length;
  const losses = games.filter((g) => g.result === "bot_won").length;
  const winRate =
    games.length > 0 ? Math.round((wins / games.length) * 100) : 0;

  const sortIcon = (field: SortField) => {
    if (sortField !== field)
      return <span className="sortIcon inactive">↕</span>;
    return (
      <span className="sortIcon active">{sortDir === "asc" ? "↑" : "↓"}</span>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="historyCenter">
          <div className="spinner" />
          <p className="loadingText">{t("history.loading")}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="historyCenter">
          <p className="errorText">⚠️ {error}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            {t("common.retry")}
          </button>
        </div>
      );
    }

    switch (view) {
      case "history":
        return (
          <>
            {games.length > 0 && (
              <div className="statsBar">
                <div className="statItem">
                  <span className="statValue">{games.length}</span>
                  <span className="statLabel">{t("history.stats.total")}</span>
                </div>
                <div className="statDivider" />
                <div className="statItem">
                  <span className="statValue statWin">{wins}</span>
                  <span className="statLabel">{t("history.stats.wins")}</span>
                </div>
                <div className="statDivider" />
                <div className="statItem">
                  <span className="statValue statLoss">{losses}</span>
                  <span className="statLabel">
                    {t("history.stats.losses")}
                  </span>
                </div>
                <div className="statDivider" />
                <div className="statItem">
                  <span className="statValue">{winRate}%</span>
                  <span className="statLabel">
                    {t("history.stats.win_rate")}
                  </span>
                </div>
              </div>
            )}

            {games.length === 0 ? (
              <div className="historyCenter">
                <p className="emptyText">{t("history.empty")}</p>
              </div>
            ) : (
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
                        ? t("history.filter.all")
                        : f === "player_won"
                          ? t("history.filter.wins")
                          : t("history.filter.losses")}
                    </button>
                  ))}
                </div>

                <div className="tableWrapper">
                  <table className="historyTable">
                    <thead>
                      <tr>
                        <th>{t("history.table.number")}</th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("result")}
                        >
                          {t("history.table.result")} {sortIcon("result")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("difficulty")}
                        >
                          {t("history.table.difficulty")}{" "}
                          {sortIcon("difficulty")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("boardSize")}
                        >
                          {t("history.table.size")} {sortIcon("boardSize")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("points")}
                        >
                          {t("history.table.points")} {sortIcon("points")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("totalMoves")}
                        >
                          {t("history.table.moves")} {sortIcon("totalMoves")}
                        </th>
                        <th
                          className="sortable"
                          onClick={() => handleSort("playedAt")}
                        >
                          {t("history.table.date")} {sortIcon("playedAt")}
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
                              className={`resultBadge ${
                                game.result === "player_won"
                                  ? "badgeWin"
                                  : "badgeLoss"
                              }`}
                            >
                              {game.result === "player_won"
                                ? t("history.result.win")
                                : t("history.result.loss")}
                            </span>
                          </td>
                          <td className="tdDifficulty">
                            {game.difficulty
                              ? difficultyLabel[game.difficulty]
                              : "—"}
                          </td>
                          <td className="tdBoardSize">
                            {game.boardSize
                              ? boardSizeLabel[game.boardSize]
                              : "—"}
                          </td>
                          <td className="tdPoints">{game.points ?? 0}</td>
                          <td className="tdMoves">{game.totalMoves ?? "—"}</td>
                          <td className="tdDate">{formatDate(game.playedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        );

      case "leaderboard":
        return (
          <div className="tableWrapper">
            <table className="historyTable">
              <thead>
                <tr>
                  <th>{t("history.leaderboard.rank")}</th>
                  <th>{t("history.leaderboard.username")}</th>
                  <th>{t("history.leaderboard.total_points")}</th>
                  <th>{t("history.leaderboard.games")}</th>
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
                      {entry.username}{" "}
                      {entry.username === userName && `(${t("history.leaderboard.you")})`}
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
        );

      case "stats":
        return (
          <div className="statsDashboard">
            {stats && (
              <>
                <div className="chartCard">
                  <h3>{t("history.stats_view.progression")}</h3>
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
                          labelFormatter={() => t("history.stats_view.game_session")}
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
                    <h3>{t("history.stats_view.win_rate_by_difficulty")}</h3>
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
                    <h3>{t("history.stats_view.avg_moves")}</h3>
                    <div className="avgMovesList">
                      {stats.avgMoves.map((m) => (
                        <div key={m._id} className="avgMoveItem">
                          <span className="label">
                            {m._id === "player_won"
                              ? t("history.stats_view.win_avg")
                              : t("history.stats_view.loss_avg")}
                          </span>
                          <span className="value">
                            {Math.round(m.avgMoves)} {t("history.stats_view.moves_unit")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="history">
      <div className="historyCard">
        <div className="historyHeader">
          <button className="btn" type="button" onClick={onBack}>
            {t("common.back")}
          </button>
          <div className="viewToggle">
            <button
              className={`toggleBtn ${view === "history" ? "active" : ""}`}
              onClick={() => setView("history")}
            >
              {t("history.title")}
            </button>
            <button
              className={`toggleBtn ${view === "stats" ? "active" : ""}`}
              onClick={() => setView("stats")}
            >
              {t("history.view.stats")}
            </button>
            <button
              className={`toggleBtn ${view === "leaderboard" ? "active" : ""}`}
              onClick={() => setView("leaderboard")}
            >
              {t("history.view.leaderboard")}
            </button>
          </div>
          <div style={{ width: "80px" }} />
        </div>

        {renderContent()}
      </div>
    </div>
  );
}