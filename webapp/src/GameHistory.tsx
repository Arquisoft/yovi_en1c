import { useEffect, useState } from "react";
import "./GameHistory.css";

const API_GATEWAY_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type GameResult = "player_won" | "bot_won";

interface GameRecord {
  _id: string;
  result: GameResult;
  totalMoves: number;
  playedAt: string;
  board: Record<string, 0 | 1>;
}

type SortField = "playedAt" | "totalMoves" | "result";
type SortDir = "asc" | "desc";

interface Props {
  onBack: () => void;
  userName: string;
}

export default function GameHistory({ onBack, userName }: Props) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("playedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filter, setFilter] = useState<"all" | GameResult>("all");

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch(
          `${API_GATEWAY_URL}/api/users/games/list?username=${encodeURIComponent(userName)}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: GameRecord[] = await res.json();
        setGames(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [userName]);

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
    } else if (sortField === "result") {
      cmp = a.result.localeCompare(b.result);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const wins = games.filter((g) => g.result === "player_won").length;
  const losses = games.filter((g) => g.result === "bot_won").length;
  const winRate =
    games.length > 0 ? Math.round((wins / games.length) * 100) : 0;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString("es-ES", {
      timeZone: "Europe/Madrid",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="history">
      <div className="historyCard">
        {/* Header */}
        <div className="historyHeader">
          <button className="btn" type="button" onClick={onBack}>
            ← Back
          </button>
          <h2>Game History</h2>
          <div style={{ width: 80 }} />
        </div>

        {/* Stats bar */}
        {!loading && !error && games.length > 0 && (
          <div className="statsBar">
            <div className="statItem">
              <span className="statValue">{games.length}</span>
              <span className="statLabel">Total games</span>
            </div>
            <div className="statDivider" />
            <div className="statItem">
              <span className="statValue statWin">{wins}</span>
              <span className="statLabel">Wins</span>
            </div>
            <div className="statDivider" />
            <div className="statItem">
              <span className="statValue statLoss">{losses}</span>
              <span className="statLabel">Losses</span>
            </div>
            <div className="statDivider" />
            <div className="statItem">
              <span className="statValue">{winRate}%</span>
              <span className="statLabel">Win rate</span>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {!loading && !error && games.length > 0 && (
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
        )}

        {/* Content */}
        {loading && (
          <div className="historyCenter">
            <div className="spinner" />
            <p className="loadingText">Loading history…</p>
          </div>
        )}

        {error && (
          <div className="historyCenter">
            <p className="errorText">⚠️ {error}</p>
            <button className="btn" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        )}

        {!loading && !error && games.length === 0 && (
          <div className="historyCenter">
            <p className="emptyText">No games played yet. Go play one! 🎮</p>
          </div>
        )}

        {!loading && !error && games.length > 0 && (
          <div className="tableWrapper">
            <table className="historyTable">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="sortable" onClick={() => handleSort("result")}>
                    Result {sortIcon("result")}
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
                    <td className="tdMoves">{game.totalMoves ?? "—"}</td>
                    <td className="tdDate">{formatDate(game.playedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}