import { Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import HomePage from './pages/HomePage';
import LobbyPage from './pages/LobbyPage';
import GamePage from './pages/GamePage';

export default function App() {
  return (
    <LanguageProvider>
      <SocketProvider>
        <GameProvider>
          <div className="min-h-screen bg-surface-dark">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/room/:code" element={<LobbyPage />} />
              <Route path="/room/:code/play" element={<GamePage />} />
            </Routes>
          </div>
        </GameProvider>
      </SocketProvider>
    </LanguageProvider>
  );
}
