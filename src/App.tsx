import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { JoinPage } from './pages/JoinPage';
import { RoomPage } from './pages/RoomPage';
import { HostPage } from './pages/HostPage';
import { DisplayPage } from './pages/DisplayPage';
import { ResultsPage } from './pages/ResultsPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
        <Route path="/host/:roomCode" element={<HostPage />} />
        <Route path="/display/:roomCode" element={<DisplayPage />} />
        <Route path="/results/:roomCode" element={<ResultsPage />} />
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
