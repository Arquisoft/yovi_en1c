import { useState, useEffect } from "react";
import "./App.css";
import RegisterForm from "./RegisterForm";
import GameBoard from "./GameBoard";
import reactLogo from "./assets/react.svg";

function App() {
  const [gameyOnline, setGameyOnline] = useState<boolean | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/gamey/status")
      .then(() => setGameyOnline(true))
      .catch(() => setGameyOnline(false));
  }, []);

  if (showBoard) {
    return (
      <GameBoard
        onBack={() => setShowBoard(false)}
      />
    );
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
      </div>

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>

      {gameyOnline !== null && (
        <p style={{ color: gameyOnline ? "green" : "red" }}>
          Gamey: {gameyOnline ? "✓ Online" : "✗ Offline"}
        </p>
      )}

      <RegisterForm />

      <button onClick={() => setShowBoard(true)} style={{ marginTop: 24 }}>
        Go to Game Y →
      </button>
    </div>
  );
}

export default App;