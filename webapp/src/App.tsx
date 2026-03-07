import './App.css'
import { useState } from 'react';
import RegisterForm from './RegisterForm';
import GameMenu, { type GameConfig } from './GameMenu';

function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [lastConfig, setLastConfig] = useState<GameConfig | null>(null);

  const handleStartGame = (config: GameConfig) => {
    setLastConfig(config);
    console.log('Starting game with config:', config);
  };

  return (
    <div className="App">

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
