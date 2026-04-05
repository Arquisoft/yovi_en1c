import { useState } from "react";
import "./App.css";
import RegisterForm from "./RegisterForm";
import GameMenu from "./GameMenu";
import type { GameConfig } from "./GameMenu";
import GameHistory from "./GameHistory";
import GameBoard from "./GameBoard";
import reactLogo from "./assets/react.svg";

type Screen = "register" | "menu" | "board" | "history";

function App() {
  const [screen, setScreen] = useState<Screen>("register");
  const [userName, setUserName] = useState("");
  const [config, setConfig] = useState<GameConfig | null>(null);

  if (screen === "menu") {
    return (
      <GameMenu
        userName={userName}
        onStartGame={(cfg: GameConfig) => {
          setConfig(cfg);
          setScreen("board");
        }}
        onLogOut={() => {
          setUserName("");
          setConfig(null);
          setScreen("register");
        }}
        onViewHistory={() => setScreen("history")}
      />
    );
  }

  if (screen === "board") {
    return (
      <GameBoard
        onBack={() => setScreen("menu")}
        userName={userName}
        config={config!}
      />
    );
  }

  if (screen === "history") {
    return <GameHistory onBack={() => setScreen("menu")} userName={userName} />;
  }

  return (
    <div className="App">
      <div>
        <a href="https://vitejs.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src="/logo-game-y.svg" className="logo gameY" alt="Game Y" />
        </a>
      </div>
      <h2>Welcome to the Software Architecture 2025-2026 course</h2>

      <RegisterForm
        onRegistered={(name: string) => {
          setUserName(name);
          setScreen("menu");
        }}
      />
    </div>
  );
}

export default App;
