/**
 * Koda Flashcard App - Main Application Component
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import DashboardPage from './pages/DashboardPage';
import DeckViewPage from './pages/DeckViewPage';
import StudySessionPage from './pages/StudySessionPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/dashboard" 
            element={<DashboardPage />} 
          />
          <Route 
            path="/deck/:id" 
            element={<DeckViewPage />} 
          />
          <Route 
            path="/study/:id" 
            element={<StudySessionPage />} 
          />
          <Route 
            path="/" 
            element={<Navigate to="/dashboard" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
