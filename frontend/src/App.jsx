import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getStoredUser, getToken } from './services/authService.js';

// Public pages
import LandingPage    from './pages/LandingPage.jsx';
import SignIn         from './pages/SignIn.jsx';
import SignUp         from './pages/SignUp.jsx';
import OfflinePage    from './pages/OfflinePage.jsx';

// Student pages
import Dashboard         from './pages/Dashboard.jsx';
import BorrowStep1       from './pages/borrow/BorrowStep1.jsx';
import BorrowStep2       from './pages/borrow/BorrowStep2.jsx';
import BorrowStep3       from './pages/borrow/BorrowStep3.jsx';
import BorrowStep4       from './pages/borrow/BorrowStep4.jsx';
import LogUpdated        from './pages/LogUpdated.jsx';
import MyTransactions    from './pages/MyTransactions.jsx';
import ReportMaintenance from './pages/ReportMaintenance.jsx';

// Admin pages
import AdminDashboard       from './pages/admin/AdminDashboard.jsx';
import EquipmentManagement  from './pages/admin/EquipmentManagement.jsx';
import TransactionOversight from './pages/admin/TransactionOversight.jsx';
import MaintenanceTickets   from './pages/admin/MaintenanceTickets.jsx';
import UserManagement       from './pages/admin/UserManagement.jsx';
import LabRoomManagement    from './pages/admin/LabRoomManagement.jsx';
import SystemReports        from './pages/admin/SystemReports.jsx';

// Auth guard — redirects to /signin if no token
const RequireAuth = ({ children }) => {
  if (!getToken()) return <Navigate to="/signin" replace />;
  return children;
};

// Admin guard — requires LAB_ADMIN role
const RequireAdmin = ({ children }) => {
  const user = getStoredUser();
  if (!getToken()) return <Navigate to="/signin" replace />;
  if (user?.role !== 'LAB_ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/"        element={<LandingPage />} />
        <Route path="/signin"  element={<SignIn />} />
        <Route path="/signup"  element={<SignUp />} />
        <Route path="/offline" element={<OfflinePage />} />

        {/* Student */}
        <Route path="/dashboard"    element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/borrow/step1" element={<RequireAuth><BorrowStep1 /></RequireAuth>} />
        <Route path="/borrow/step2" element={<RequireAuth><BorrowStep2 /></RequireAuth>} />
        <Route path="/borrow/step3" element={<RequireAuth><BorrowStep3 /></RequireAuth>} />
        <Route path="/borrow/step4" element={<RequireAuth><BorrowStep4 /></RequireAuth>} />
        <Route path="/borrow/confirmed" element={<RequireAuth><LogUpdated /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><MyTransactions /></RequireAuth>} />
        <Route path="/maintenance"  element={<RequireAuth><ReportMaintenance /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin"              element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
        <Route path="/admin/equipment"    element={<RequireAdmin><EquipmentManagement /></RequireAdmin>} />
        <Route path="/admin/transactions" element={<RequireAdmin><TransactionOversight /></RequireAdmin>} />
        <Route path="/admin/tickets"      element={<RequireAdmin><MaintenanceTickets /></RequireAdmin>} />
        <Route path="/admin/users"        element={<RequireAdmin><UserManagement /></RequireAdmin>} />
        <Route path="/admin/rooms"        element={<RequireAdmin><LabRoomManagement /></RequireAdmin>} />
        <Route path="/admin/reports"      element={<RequireAdmin><SystemReports /></RequireAdmin>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
