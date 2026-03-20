import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Wrench, Package, Users, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import WebHeader from '../../components/layout/WebHeader.jsx';
import { getStoredUser } from '../../services/authService.js';

const ADMIN_NAV = [
  { label: 'Equipment',     path: '/admin/equipment',    icon: Package },
  { label: 'Transactions',  path: '/admin/transactions', icon: Activity },
  { label: 'Tickets',       path: '/admin/tickets',      icon: Wrench },
  { label: 'Users',         path: '/admin/users',        icon: Users },
  { label: 'Lab Rooms',     path: '/admin/rooms',        icon: Package },
  { label: 'Reports',       path: '/admin/reports',      icon: Activity },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics').then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const cards = [
    { label: 'Active Transactions', value: stats?.activeTransactions ?? '—', color: 'emerald' },
    { label: 'Open Tickets',        value: stats?.openTickets        ?? '—', color: 'amber' },
    { label: 'Available Equipment', value: stats?.availableEquipment ?? '—', color: 'blue' },
    { label: 'Registered Users',    value: stats?.registeredUsers    ?? '—', color: 'orange' },
  ];

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
        <div className="mb-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Admin Portal</p>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {cards.map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <p className={`text-3xl font-black text-${color}-400`}>{value}</p>
              <p className="text-xs text-zinc-500 mt-1 leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ADMIN_NAV.map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 rounded-xl px-4 py-3.5 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Icon size={16} className="text-zinc-500" />
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
              <ChevronRight size={14} className="text-zinc-600" />
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
