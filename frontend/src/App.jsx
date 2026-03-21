import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
// Updated path to include the 'borrow' folder
import BorrowStep1 from './pages/borrow/BorrowStep1.jsx'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/borrow-step-1" element={<BorrowStep1 />} />
      </Routes>
    </Router>
  );
}

export default App;