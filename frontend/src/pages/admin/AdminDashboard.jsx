import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../hooks/useAuth.jsx';
import { getToken } from '../../services/authService';
import logo from '../../assets/logo_landingpage.png';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  Package,
  Ticket,
  LogOut,
  Loader2,
  ShieldCheck,
  RefreshCw,
  ClipboardList,
  DoorOpen,
  BarChart3,
  ShoppingCart,
  Wrench,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function StatCard({ icon: Icon, label, value, color, loading }) {
  return (
    <div className="bg-white rounded-xl border border-[#001254]/10 p-6 flex items-center gap-5">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-[#001254]/40 uppercase tracking-widest" style={{ fontSize: '0.65rem' }}>{label}</p>
        {loading ? (
          <Loader2 className="w-5 h-5 text-[#0B4EA2] animate-spin mt-1" />
        ) : (
          <p className="text-[#001254] text-3xl font-semibold mt-0.5">{value ?? '—'}</p>
        )}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

   const fetchStats = () => {
     setLoading(true);
     setError(null);
     const token = getToken();
     axios
       .get(`${API_URL}/admin/analytics`, {
         headers: { Authorization: `Bearer ${token}` },
       })
      .then((res) => setStats(res.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          setError('Access denied. Lab Admin role required.');
        } else {
          setError('Could not load analytics data.');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleLogout = () => {
    signOut();
    navigate('/signin');
  };

  const displayName = user?.fullName || user?.username || 'Admin';

  const statCards = [
    {
      icon: Activity,
      label: 'Active Transactions',
      value: stats?.activeTransactions,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Ticket,
      label: 'Open Tickets',
      value: stats?.openTickets,
      color: stats?.openTickets > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600',
    },
    {
      icon: Package,
      label: 'Available Equipment',
      value: stats?.availableEquipment,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      icon: Users,
      label: 'Registered Users',
      value: stats?.registeredUsers,
      color: 'bg-purple-50 text-purple-600',
    },
  ];

  return (
    <div className="min-h-screen bg-[#EFEFE9]">

      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(0,18,84,0.08)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-[72px]">
            <div className="flex items-center gap-3">
              <img src={logo} alt="FORGE" className="h-9 opacity-80" />
              <div className="hidden md:block h-5 w-px bg-[#001254]/20" />
              <div className="hidden md:flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0B4EA2]/60" />
                <span className="text-[#001254]/50 tracking-widest uppercase" style={{ fontSize: '0.6rem' }}>
                  Admin Portal
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[#001254]/90" style={{ fontSize: '0.8rem' }}>{displayName}</p>
                <p className="text-[#0B4EA2]/60" style={{ fontSize: '0.65rem' }}>LAB ADMIN</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4 text-[#001254]/50" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[#001254] text-xl font-semibold">Admin Dashboard</h1>
            <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>
              System overview and key metrics
            </p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-[#001254]/10 rounded-lg hover:border-[#0B4EA2]/30 transition-colors disabled:opacity-50"
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0B4EA2] ${loading ? 'animate-spin' : ''}`} />
            <span className="text-[#001254]/60 hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} loading={loading} />
          ))}
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/equipment')}
            className="bg-white rounded-xl border border-[#001254]/10 p-5 flex items-center gap-4 hover:border-[#0B4EA2]/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Equipment</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>Manage inventory</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/transactions')}
            className="bg-white rounded-xl border border-[#001254]/10 p-5 flex items-center gap-4 hover:border-[#0B4EA2]/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Transactions</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>Oversight &amp; status override</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/users')}
            className="bg-white rounded-xl border border-[#001254]/10 p-5 flex items-center gap-4 hover:border-[#0B4EA2]/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Users</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>Manage student accounts</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/admin/rooms')}
            className="bg-white rounded-xl border border-[#001254]/10 p-5 flex items-center gap-4 hover:border-[#0B4EA2]/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Lab Rooms</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>Manage laboratory rooms</p>
            </div>
          </button>
           <button
            onClick={() => navigate('/admin/acquisitions')}
            className="bg-white rounded-xl border border-[#001254]/10 p-5 flex items-center gap-4 hover:border-[#0B4EA2]/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Acquisitions</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>Manage inventory intake</p>
            </div>
          </button>
           <button
            onClick={() => navigate('/admin/maintenance')}
            className="bg-white rounded-xl border border-[#001254]/10 p-5 flex items-center gap-4 hover:border-[#0B4EA2]/30 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#001254] font-medium" style={{ fontSize: '0.88rem' }}>Maintenance Tickets</p>
              <p className="text-[#001254]/40" style={{ fontSize: '0.75rem' }}>Manage equipment maintenance</p>
            </div>
          </button>
        </div>

        {/* Alerts section */}
        {!loading && stats && (
          <div className="bg-white rounded-xl border border-[#001254]/10 p-5 space-y-3">
            <h2 className="text-[#001254] font-medium" style={{ fontSize: '0.9rem' }}>Alerts</h2>
            {stats.openTickets === 0 && stats.activeTransactions === 0 ? (
              <div className="flex items-center gap-2 text-green-700" style={{ fontSize: '0.85rem' }}>
                <CheckCircle2 className="w-4 h-4" />
                All systems nominal. No open tickets or active transactions.
              </div>
            ) : (
              <div className="space-y-2">
                {stats.openTickets > 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-3 py-2" style={{ fontSize: '0.82rem' }}>
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    {stats.openTickets} open maintenance ticket{stats.openTickets !== 1 ? 's' : ''} require attention.
                  </div>
                )}
                {stats.activeTransactions > 0 && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-3 py-2" style={{ fontSize: '0.82rem' }}>
                    <Activity className="w-4 h-4 shrink-0" />
                    {stats.activeTransactions} active transaction{stats.activeTransactions !== 1 ? 's' : ''} currently in progress.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
