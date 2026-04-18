import { useState } from "react";
import "./App.css";
import LoginForm from "./RegisterForm";
import SignUpForm from "./SignupForm";
import GameMenu from "./GameMenu";
import GameHistory from "./GameHistory";
import type { GameConfig } from "./GameMenu";
import GameBoard from "./GameBoard";

type Screen = 'login' | 'signup' | 'menu' | 'board' | 'history';

function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [userName, setUserName] = useState('');
  const [config, setConfig] = useState<GameConfig | null>(null);

  if (screen === "menu") {
    return (
      <GameMenu
        userName={userName}
        onStartGame={(cfg: GameConfig) => {
          setConfig(cfg);
          setScreen('board');
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
      <div className="authPage">
        <div>
          <a href="https://react.dev" target="_blank" rel="noreferrer">
            <img src="/logo-game-y.svg" className="logo gameY" alt="Game Y" />
          </a>
        </div>

        <h2>Welcome to play the game of Y</h2>

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
              setScreen('menu');
            }}
            onGoToLogin={() => setScreen("login")}
          />
        )}
      </div>
    </div>
  );
}

export default App;
