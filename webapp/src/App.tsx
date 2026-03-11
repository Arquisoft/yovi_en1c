import { useState, useEffect } from "react";
import "./App.css";
import RegisterForm from "./RegisterForm";
import GameBoard from "./GameBoard";
import reactLogo from "./assets/react.svg";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function App() {
  const [gameyOnline, setGameyOnline] = useState<boolean | null>(null);
  const [showBoard, setShowBoard] = useState(false);

  // Check whether the gamey service is reachable through the gateway on mount
  useEffect(() => {
    fetch(`${API_URL}/gamey/status`)
      .then(() => setGameyOnline(true))
      .catch(() => setGameyOnline(false));
  }, []);

  // Once the user registers successfully, go straight to the board
  if (showBoard) {
    return <GameBoard onBack={() => setShowBoard(false)} />;
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

      {/* onSuccess navigates directly to the board — no separate button needed */}
      <RegisterForm onSuccess={() => setShowBoard(true)} />
    </div>
  );
}

export default App;