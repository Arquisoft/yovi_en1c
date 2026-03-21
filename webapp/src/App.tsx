import { useState } from "react";
import "./App.css";
import LoginForm from "./RegisterForm";
import SignUpForm from "./SignupForm";
import GameMenu from "./GameMenu";
import type { GameConfig } from "./GameMenu";
import GameBoard from "./GameBoard";

type Screen = 'login' | 'signup' | 'menu' | 'board';

function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [userName, setUserName] = useState('');

  if (screen === 'menu') {
    return (
      <GameMenu
        userName={userName}
        onStartGame={(_config: GameConfig) => setScreen('board')}
        onLogOut={() => {
          setUserName("");
          setScreen('login');
        }}
      />
    );
  }

  if (screen === 'board') {
    return <GameBoard onBack={() => setScreen('menu')} />;
  }

  return (
    <div className="App">
      <div>

        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src="/logo-game-y.svg" className="logo gameY" alt="Game Y" />
        </a>
      </div>

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>

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
  );
}

export default App;