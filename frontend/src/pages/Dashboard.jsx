import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth.jsx';
import { useClock } from '../hooks/useClock.js';
import logo from '../assets/logo_landingpage.png';
import {
  ScanLine,
  QrCode,
  LogOut,
  Activity,
  Clock,
  User,
  Zap,
  ChevronRight,
  Package,
  RotateCcw,
  Loader2,
  CreditCard,
  CheckCircle2,
  Menu,
  X,
  AlertTriangle,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function roomAvailabilityStatus(room) {
  if (room.status === 'MAINTENANCE') return 'MAINTENANCE';
  // A room is "IN SESSION" when an active transaction references it today
  // The backend doesn't join sessions to rooms yet, so we derive from status field.
  // ACTIVE rooms with no session info are AVAILABLE.
  return room.status === 'ACTIVE' ? 'AVAILABLE' : 'IN SESSION';
}

/**
 * Parse a time slot string like "11:00-13:00" and return minutes remaining
 * relative to now. Returns null if unparseable.
 */
function minutesRemainingInSlot(timeSlot, txnDate) {
  if (!timeSlot || !txnDate) return null;
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, sh, sm, eh, em] = match.map(Number);
  const base = new Date(txnDate);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em);
  const diff = Math.round((end - Date.now()) / 60000);
  return diff > 0 ? diff : 0;
}

// ── sub-components ────────────────────────────────────────────────────────────

function MiniStatusBadge({ status }) {
  if (status === 'ACTIVE')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full" style={{ fontSize: '0.6rem' }}>
        <Package className="w-2.5 h-2.5" /> ACTIVE
      </span>
    );
  if (status === 'PENDING_RETURN')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full" style={{ fontSize: '0.6rem' }}>
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> PENDING RETURN
      </span>
    );
  if (status === 'CLAIM_ID')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full" style={{ fontSize: '0.6rem' }}>
        <CreditCard className="w-2.5 h-2.5" /> CLAIM ID
      </span>
    );
  return null;
}

function RoomStatusBadge({ status }) {
  if (status === 'AVAILABLE')
    return (
      <span className="px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 whitespace-nowrap" style={{ fontSize: '0.65rem' }}>
        AVAILABLE
      </span>
    );
  if (status === 'MAINTENANCE')
    return (
      <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap" style={{ fontSize: '0.65rem' }}>
        MAINTENANCE
      </span>
    );
  return (
    <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 whitespace-nowrap" style={{ fontSize: '0.65rem' }}>
      IN SESSION
    </span>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const currentTime = useClock();

  const [pulse, setPulse] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Dashboard data from API
  const [activeTransactions, setActiveTransactions] = useState([]);
  const [labRooms, setLabRooms] = useState([]);
  const [highDemandEquipment, setHighDemandEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setActiveTransactions(res.data.activeTransactions || []);
        setLabRooms(res.data.labRooms || []);
        setHighDemandEquipment(res.data.highDemandEquipment || []);
      })
      .catch((err) => {
        console.error('Dashboard fetch error:', err);
        setError('Could not load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Pulse animation for LIVE indicator
  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 1000);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Close hamburger menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    signOut();
    navigate('/signin');
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const displayName = user?.fullName || user?.username || 'Student';
  const displayProgram = user?.program || '—';
  const firstName = displayName.split(' ')[0];

  const quickActions = [
    { label: 'Borrow an Item', desc: 'AI-powered scanning & checkout', icon: ScanLine, path: '/borrow' },
    { label: 'My Transactions', desc: 'View, return & track records', icon: Package, path: '/transactions', badge: activeTransactions.length },
    { label: 'Report Maintenance', desc: 'QR scan to flag issues', icon: QrCode, path: '/report-maintenance' },
  ];

  return (
    <div className="min-h-screen bg-[#EFEFE9]">

      {/* Header */}
      <header
        className="sticky top-0 z-40 text-white"
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img src={logo} alt="FORGE" className="h-6 opacity-80" />
              <div className="hidden md:block h-5 w-[1px] bg-[#001254]/20" />
              <span className="hidden md:block text-[#001254]/50 tracking-widest uppercase" style={{ fontSize: '0.6rem' }}>
                Resource Dashboard
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-[#001254]/8 rounded-lg px-3 py-1.5">
                <Activity className="w-3 h-3 text-green-600" />
                <span className="text-[#001254]/60" style={{ fontSize: '0.7rem' }}>LIVE</span>
              </div>
              <div className="text-right hidden sm:block mr-1">
                <p className="text-[#001254]/90" style={{ fontSize: '0.8rem' }}>{displayName}</p>
                <p className="text-[#001254]/40" style={{ fontSize: '0.65rem' }}>{displayProgram}</p>
              </div>

              {/* Hamburger */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
                  title="Quick actions"
                >
                  {menuOpen
                    ? <X className="w-4 h-4 text-[#001254]/60" />
                    : <Menu className="w-4 h-4 text-[#001254]/60" />
                  }
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-xl overflow-hidden shadow-2xl"
                      style={{
                        background: 'rgba(0, 18, 84, 0.90)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      <div className="px-4 py-2.5 border-b border-white/10">
                        <span className="text-white/40 tracking-widest uppercase" style={{ fontSize: '0.6rem' }}>Quick Actions</span>
                      </div>
                      {quickActions.map((action) => (
                        <button
                          key={action.path}
                          onClick={() => { setMenuOpen(false); navigate(action.path); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <action.icon className="w-4 h-4 text-white/70" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white/90" style={{ fontSize: '0.8rem' }}>{action.label}</p>
                            <p className="text-white/35 truncate" style={{ fontSize: '0.65rem' }}>{action.desc}</p>
                          </div>
                          {action.badge > 0 && (
                            <span className="w-5 h-5 bg-[#0B4EA2] text-white rounded-full flex items-center justify-center flex-shrink-0" style={{ fontSize: '0.6rem' }}>
                              {action.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Sign out">
                <LogOut className="w-4 h-4 text-white/60" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* Greeting bar */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-[#001254]">
              Hello, {firstName}
              <span className="text-[#0B4EA2]/50"> | {displayProgram}</span>
            </h1>
            <p className="text-[#001254]/40" style={{ fontSize: '0.8rem' }}>{formatDate(currentTime)}</p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#001254]/10 rounded-lg px-4 py-2">
            <Clock className="w-4 h-4 text-[#0B4EA2]" />
            <span className="font-mono text-[#001254]" style={{ fontSize: '0.9rem' }}>{formatTime(currentTime)}</span>
          </div>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3" style={{ fontSize: '0.85rem' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Navigation cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Borrow an Item */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/borrow')}
            className="bg-[#001254] text-white rounded-xl p-6 flex items-center gap-5 hover:bg-[#001254]/95 transition-all group text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/15 transition-colors">
              <ScanLine className="w-7 h-7 text-white/80" />
            </div>
            <div className="flex-1">
              <h3 className="text-white">Borrow an Item</h3>
              <p className="text-white/40 mt-0.5" style={{ fontSize: '0.8rem' }}>AI-powered scanning & checkout</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors" />
          </motion.button>

          {/* My Transactions — badge count when active transactions exist */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/transactions')}
            className="bg-white border-2 border-[#0B4EA2]/15 text-[#001254] rounded-xl p-6 flex items-center gap-5 hover:border-[#0B4EA2]/30 hover:shadow-md transition-all group text-left relative overflow-hidden"
          >
            <div className="w-14 h-14 rounded-xl bg-[#0B4EA2]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#0B4EA2]/15 transition-colors">
              <Package className="w-7 h-7 text-[#0B4EA2]/70" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#001254]">My Transactions</h3>
              <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>View, return & track records</p>
            </div>
            {activeTransactions.length > 0 && (
              <span className="absolute top-3 right-3 w-5 h-5 bg-[#0B4EA2] text-white rounded-full flex items-center justify-center" style={{ fontSize: '0.6rem' }}>
                {activeTransactions.length}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-[#001254]/20 group-hover:text-[#001254]/40 transition-colors" />
          </motion.button>

          {/* Report Maintenance */}
          <motion.button
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/report')}
            className="bg-white border-2 border-[#001254]/10 text-[#001254] rounded-xl p-6 flex items-center gap-5 hover:border-[#0B4EA2]/30 transition-all group text-left"
          >
            <div className="w-14 h-14 rounded-xl bg-[#F2F0DB] flex items-center justify-center flex-shrink-0 group-hover:bg-[#F2F0DB]/80 transition-colors">
              <QrCode className="w-7 h-7 text-[#001254]/60" />
            </div>
            <div className="flex-1">
              <h3 className="text-[#001254]">Report Maintenance</h3>
              <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.8rem' }}>QR scan to flag issues</p>
            </div>
            <ChevronRight className="w-5 h-5 text-[#001254]/20 group-hover:text-[#001254]/40 transition-colors" />
          </motion.button>
        </div>

        {/* Active Transactions summary */}
        {!loading && activeTransactions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <button
              onClick={() => navigate('/transactions')}
              className="w-full bg-white rounded-xl border border-[#001254]/10 overflow-hidden hover:border-[#0B4EA2]/20 hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#001254]/8">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[#0B4EA2]" />
                  <h3 className="text-[#001254]">My Active Transactions</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#001254]/30" style={{ fontSize: '0.7rem' }}>{activeTransactions.length} active</span>
                  <ChevronRight className="w-4 h-4 text-[#001254]/20 group-hover:text-[#001254]/40 transition-colors" />
                </div>
              </div>
              <div className="divide-y divide-[#001254]/5">
                {activeTransactions.slice(0, 3).map((tx) => (
                  <div key={tx.txn_id} className="px-5 py-3 flex items-center justify-between hover:bg-[#F2F0DB]/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[#001254] font-mono" style={{ fontSize: '0.8rem' }}>{tx.txn_id}</span>
                        <MiniStatusBadge status={tx.status} />
                      </div>
                      <p className="text-[#001254]/35 mt-0.5 truncate" style={{ fontSize: '0.7rem' }}>
                        {tx.department} | {(tx.items || []).length} item{(tx.items || []).length !== 1 ? 's' : ''} | {tx.lab_room}
                      </p>
                    </div>
                    {tx.status === 'CLAIM_ID' && (
                      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="ml-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
              {activeTransactions.length > 3 && (
                <div className="px-5 py-2.5 bg-[#F2F0DB]/30 text-center">
                  <span className="text-[#0B4EA2]" style={{ fontSize: '0.75rem' }}>View all {activeTransactions.length} transactions</span>
                </div>
              )}
            </button>
          </motion.div>
        )}

        {/* Live Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Laboratory Rooms */}
          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#001254]/8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0B4EA2]" />
                <h3 className="text-[#001254]">Laboratory Rooms</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full bg-green-500 ${pulse ? 'animate-ping' : ''}`} />
                <span className="text-[#001254]/40" style={{ fontSize: '0.65rem' }}>LIVE</span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#0B4EA2] animate-spin" />
              </div>
            ) : labRooms.length === 0 ? (
              <p className="text-center text-[#001254]/30 py-8" style={{ fontSize: '0.8rem' }}>No lab rooms found.</p>
            ) : (
              <div className="divide-y divide-[#001254]/5">
                {labRooms.map((room, i) => {
                  const availStatus = roomAvailabilityStatus(room);
                  return (
                    <motion.div
                      key={room.roomId}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-[#F2F0DB]/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[#001254]" style={{ fontSize: '0.85rem' }}>{room.roomId}</span>
                          <span className="text-[#001254]/30" style={{ fontSize: '0.7rem' }}>{room.roomName}</span>
                        </div>
                        <p className="text-[#001254]/40 mt-0.5" style={{ fontSize: '0.7rem' }}>{room.department}</p>
                      </div>
                      <RoomStatusBadge status={availStatus} />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* High-Demand Equipment */}
          <motion.div
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-xl border border-[#001254]/10 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#001254]/8">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#0B4EA2]" />
                <h3 className="text-[#001254]">High-Demand Equipment</h3>
              </div>
              {!loading && (
                <span className="text-[#001254]/30" style={{ fontSize: '0.65rem' }}>
                  {highDemandEquipment.filter((e) => e.status === 'AVAILABLE').length}/{highDemandEquipment.length} FREE
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-[#0B4EA2] animate-spin" />
              </div>
            ) : highDemandEquipment.length === 0 ? (
              <p className="text-center text-[#001254]/30 py-8" style={{ fontSize: '0.8rem' }}>No equipment data available.</p>
            ) : (
              <div className="divide-y divide-[#001254]/5">
                {highDemandEquipment.map((item, i) => {
                  const isBorrowed = !!item.borrowerName;
                  const minsLeft = minutesRemainingInSlot(item.timeSlot, item.txnDate);
                  // Progress: fraction of a 2-hour slot elapsed
                  const slotMinutes = 120;
                  const elapsed = minsLeft != null ? slotMinutes - minsLeft : 0;
                  const pct = Math.min(100, Math.max(0, (elapsed / slotMinutes) * 100));

                  return (
                    <motion.div
                      key={item.equipmentId}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 * i }}
                      className="px-5 py-3.5 hover:bg-[#F2F0DB]/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[#001254]" style={{ fontSize: '0.85rem' }}>{item.name}</span>
                          {item.roomLocation && (
                            <span className="text-[#001254]/25" style={{ fontSize: '0.65rem' }}>{item.roomLocation}</span>
                          )}
                        </div>
                        {!isBorrowed && item.status === 'AVAILABLE' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200" style={{ fontSize: '0.65rem' }}>AVAILABLE</span>
                        )}
                        {item.status === 'MAINTENANCE' && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-200" style={{ fontSize: '0.65rem' }}>MAINTENANCE</span>
                        )}
                      </div>

                      {isBorrowed && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3 h-3 text-[#001254]/30" />
                              <span className="text-[#001254]/50" style={{ fontSize: '0.7rem' }}>{item.borrowerName}</span>
                            </div>
                            {minsLeft != null && (
                              <span className="text-[#0B4EA2]" style={{ fontSize: '0.7rem' }}>{minsLeft} min left</span>
                            )}
                          </div>
                          <div className="w-full h-1.5 bg-[#001254]/5 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-[#0B4EA2] to-[#001254] rounded-full"
                              initial={{ width: '0%' }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

      </main>
    </div>
  );
}
