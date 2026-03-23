import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import SplashScreen from './components/SplashScreen';
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import BorrowStep1 from './pages/borrow/BorrowStep1';
import BorrowStep2 from './pages/borrow/BorrowStep2';
import BorrowStep3 from './pages/borrow/BorrowStep3';
import BorrowStep4 from './pages/borrow/BorrowStep4';
import LogUpdated from './pages/LogUpdated';
import MyTransactions from './pages/MyTransactions';
import ReportMaintenance from './pages/ReportMaintenance';
import OfflinePage from './pages/OfflinePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import EquipmentManagement from './pages/admin/EquipmentManagement';
import TransactionOversight from './pages/admin/TransactionOversight';
import MaintenanceTickets from './pages/admin/MaintenanceTickets';
import UserManagement from './pages/admin/UserManagement';
import LabRoomManagement from './pages/admin/LabRoomManagement';
import SystemReports from './pages/admin/SystemReports';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? children : <Navigate to="/signin" replace />;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  // Check if splash has been shown in this session
  useEffect(() => {
    const splashShown = sessionStorage.getItem('splashShown');
    if (splashShown) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/borrow" element={<BorrowStep1 />} />
          <Route path="/borrow/step1" element={<BorrowStep1 />} />
          <Route path="/borrow/step2" element={<BorrowStep2 />} />
          <Route path="/borrow/step3" element={<BorrowStep3 />} />
          <Route path="/borrow/step4" element={<BorrowStep4 />} />
          <Route path="/log-updated" element={<LogUpdated />} />
          <Route path="/transactions" element={<MyTransactions />} />
          <Route path="/report-maintenance" element={<ReportMaintenance />} />
          <Route path="/offline" element={<OfflinePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/equipment" element={<EquipmentManagement />} />
          <Route path="/admin/transactions" element={<TransactionOversight />} />
          <Route path="/admin/tickets" element={<MaintenanceTickets />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/rooms" element={<LabRoomManagement />} />
          <Route path="/admin/reports" element={<SystemReports />} />
          {/* Redirect any unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;