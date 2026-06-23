import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageContext';
import { SocketProvider } from './contexts/SocketContext';
import { GameProvider } from './contexts/GameContext';
import ConnectionStatus from './components/ui/ConnectionStatus';

const HomePage = lazy(() => import('./pages/HomePage'));
const LobbyPage = lazy(() => import('./pages/LobbyPage'));
const GamePage = lazy(() => import('./pages/GamePage'));

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark">
      <div className="text-2xl font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent animate-pulse">
        Red Flags
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <SocketProvider>
        <ConnectionStatus />
        <GameProvider>
          <div className="min-h-screen bg-surface-dark">
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/room/:code" element={<LobbyPage />} />
                <Route path="/room/:code/play" element={<GamePage />} />
              </Routes>
            </Suspense>
          </div>
        </GameProvider>
      </SocketProvider>
    </LanguageProvider>
  );
}
