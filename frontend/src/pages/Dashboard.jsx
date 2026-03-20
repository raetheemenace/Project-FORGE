import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, ClipboardList, Wrench, LogOut, ChevronRight } from 'lucide-react';
import { getDashboard } from '../services/transactionService.js';
import { signOut, getStoredUser } from '../services/authService.js';
import { useClock } from '../hooks/useClock.js';
import Badge from '../components/ui/Badge.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import WebHeader from '../components/layout/WebHeader.jsx';

const NAV_CARDS = [
  { label: 'Borrow an Item',      icon: ShoppingCart, path: '/borrow/step1', color: 'orange' },
  { label: 'My Transactions',     icon: ClipboardList, path: '/transactions', color: 'blue' },
  { label: 'Report Maintenance',  icon: Wrench,        path: '/maintenance',  color: 'red' },
];

const COLOR_MAP = {
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  blue:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  red:    'bg-red-500/10 text-red-400 border-red-500/20',
};

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const now = useClock();
  const [data, setData] = useState(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => {});
  }, []);

  const handleLogout = () => { signOut(); navigate('/signin'); };

  const timeStr = now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const activeCount = data?.activeTransactions?.length || 0;

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <WebHeader user={user} />

      <main className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* Greeting + clock */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Welcome back</p>
              <h2 className="text-xl font-bold text-white">{user?.fullName || 'Student'}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{user?.program}</p>
            </div>
            <button onClick={handleLogout} className="md:hidden p-2 text-zinc-500 hover:text-red-400 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
          <div className="mt-4 bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
            <p className="text-2xl font-mono font-bold text-orange-400 tracking-wider">{timeStr}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{dateStr}</p>
          </div>
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {NAV_CARDS.map(({ label, icon: Icon, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-zinc-900/60 hover:bg-zinc-800/60 transition-all active:scale-95 ${COLOR_MAP[color]}`}
            >
              <Icon size={22} />
              <span className="text-[11px] font-semibold text-center leading-tight">{label}</span>
              {label === 'My Transactions' && activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Lab Rooms */}
        <section className="mb-6">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Laboratory Rooms</h3>
          <div className="space-y-2">
            {data?.rooms?.length ? data.rooms.map((room) => (
              <div key={room.roomId} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">{room.roomId}</p>
                  <p className="text-xs text-zinc-500">{room.roomName} · {room.department}</p>
                </div>
                <Badge status={room.status} />
              </div>
            )) : (
              <div className="text-center py-6 text-zinc-600 text-xs">No rooms available</div>
            )}
          </div>
        </section>

        {/* High Demand Equipment */}
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">High Demand Equipment</h3>
          <div className="space-y-2">
            {data?.highDemandEquipment?.length ? data.highDemandEquipment.map((eq) => (
              <div key={eq.equipmentId} className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{eq.name}</p>
                    <p className="text-xs text-zinc-500">{eq.borrower} · {eq.room}</p>
                  </div>
                  <ChevronRight size={14} className="text-zinc-600" />
                </div>
                <ProgressBar value={eq.minutesRemaining || 0} max={eq.sessionDuration || 120} color="orange" />
                <p className="text-[10px] text-zinc-600 mt-1">{eq.minutesRemaining || 0} min remaining</p>
              </div>
            )) : (
              <div className="text-center py-6 text-zinc-600 text-xs">No high-demand equipment at this time</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
