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

function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return null;
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  // Check if user has admin role
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
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
          
          {/* Protected User Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/borrow" element={<ProtectedRoute><BorrowStep1 /></ProtectedRoute>} />
          <Route path="/borrow/step1" element={<ProtectedRoute><BorrowStep1 /></ProtectedRoute>} />
          <Route path="/borrow/step2" element={<ProtectedRoute><BorrowStep2 /></ProtectedRoute>} />
          <Route path="/borrow/step3" element={<ProtectedRoute><BorrowStep3 /></ProtectedRoute>} />
          <Route path="/borrow/step4" element={<ProtectedRoute><BorrowStep4 /></ProtectedRoute>} />
          <Route path="/log-updated" element={<ProtectedRoute><LogUpdated /></ProtectedRoute>} />
          <Route path="/transactions" element={<ProtectedRoute><MyTransactions /></ProtectedRoute>} />
          <Route path="/report-maintenance" element={<ProtectedRoute><ReportMaintenance /></ProtectedRoute>} />
          <Route path="/offline" element={<OfflinePage />} />
          
          {/* Admin Routes - Protected */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/equipment" element={<AdminRoute><EquipmentManagement /></AdminRoute>} />
          <Route path="/admin/transactions" element={<AdminRoute><TransactionOversight /></AdminRoute>} />
          <Route path="/admin/tickets" element={<AdminRoute><MaintenanceTickets /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
          <Route path="/admin/rooms" element={<AdminRoute><LabRoomManagement /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><SystemReports /></AdminRoute>} />
          
          {/* Redirect any unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
