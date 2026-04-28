import { useState } from "react";
import "./App.css";
import LoginForm from "./RegisterForm";
import SignUpForm from "./SignupForm";
import GameMenu from "./GameMenu";
import GameHistory from "./GameHistory";
import type { GameConfig } from "./GameMenu";
import GameBoard from "./GameBoard";
import "./i18n/index.ts";
import LanguageSwitcher from "./LanguageSwitcher";
type Screen = "login" | "signup" | "menu" | "board" | "history";

function App() {
  const [screen, setScreen] = useState<Screen>("login");
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
          setScreen("login");
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
    <div className="App hexBackground">
      <header
        style={{ padding: "1rem", display: "flex", justifyContent: "flex-end" }}
      >
        <LanguageSwitcher />
      </header>
      <div>
        <a
          href="https://github.com/Arquisoft/yovi_en1c"
          target="_blank"
          rel="noreferrer"
        >
          <img src="/yovi_en1c-logo.svg" className="logo gameY" alt="Game Y" />
        </a>
      </div>
      <h2>Welcome to the Y game!</h2>

      {screen === "login" && (
        <LoginForm
          onLoggedIn={(name: string) => {
            setUserName(name);
            setScreen("menu");
          }}
          onGoToSignUp={() => setScreen("signup")}
        />
      )}

      {screen === "signup" && (
        <SignUpForm
          onRegistered={(name: string) => {
            setUserName(name);
            setScreen("menu");
          }}
          onGoToLogin={() => setScreen("login")}
        />
      )}
    </div>
  );
}

export default App;
