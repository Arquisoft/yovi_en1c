import './App.css'
import { useState } from 'react';
import RegisterForm from './RegisterForm';
import GameMenu, { type GameConfig } from './GameMenu';
import reactLogo from './assets/react.svg';

function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);

  const handleStartGame = (config: GameConfig) => {
    setLastConfig(config);
    console.log('Starting game with config:', config);
  };

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

      <main className="AppMain">
        {!username ? (
          <RegisterForm onRegistered={setUsername} />
        ) : (
          <>
            <GameMenu
              userName={username}
              onStartGame={handleStartGame}
              onLogOut={() => setUsername(null)}
            />
            {lastConfig && (
              <p style={{ marginTop: 12, opacity: 0.8 }}>
                (Last config chosen: {lastConfig.mode}, {lastConfig.boardSize}, {lastConfig.layout})
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
