import { useState} from "react";
import "./App.css";
import RegisterForm from "./RegisterForm";
import GameBoard from "./GameBoard";
import reactLogo from "./assets/react.svg";


function App() {
  const [showBoard, setShowBoard] = useState(false);


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
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src="/logo-game-y.svg" className="logo gameY" alt="Game Y"/>
        </a>
      </div>

      <h2>Welcome to the Software Arquitecture 2025-2026 course</h2>

      

      {/* onSuccess navigates directly to the board — no separate button needed */}
      <RegisterForm onSuccess={() => setShowBoard(true)} />
    </div>
  );
}

export default App;