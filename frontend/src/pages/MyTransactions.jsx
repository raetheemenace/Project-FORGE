import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft,
  Package,
  Loader2,
  CreditCard,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
  ClipboardList,
  Calendar,
  Filter,
  Clock,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import logo from '../assets/logo_landingpage.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_META = {
  ACTIVE: {
    label: 'ACTIVE',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Package,
  },
  PENDING_RETURN: {
    label: 'PENDING RETURN',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: Loader2,
    spin: true,
  },
  CLAIM_ID: {
    label: 'CLAIM ID',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: CreditCard,
  },
  RETURNED: {
    label: 'RETURNED',
    bg: 'bg-gray-50',
    text: 'text-gray-500',
    border: 'border-gray-200',
    icon: CheckCircle2,
  },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.RETURNED;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium ${meta.bg} ${meta.text} ${meta.border}`}
    >
      <Icon className={`w-3 h-3 ${meta.spin ? 'animate-spin' : ''}`} />
      {meta.label}
    </span>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── helpers for countdown ───────────────────────────────────────────────────────

/**
 * Parse a time slot string like "11:00-13:00" and return minutes remaining
 * relative to now. Returns null if unparseable or time expired.
 */
function minutesRemainingInSlot(timeSlot) {
  if (!timeSlot) return null;
  const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const [, sh, sm, eh, em] = match.map(Number);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), sh, sm);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eh, em);
  const diff = Math.round((end - now) / 60000);
  if (diff <= 0) return 0;
  return diff;
}

/**
 * Play an alarm sound using Web Audio API
 */
function playAlarmSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Play 3 beeps
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    oscillator.start();
    
    // First beep
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Second beep
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.setValueAtTime(880, audioContext.currentTime + 0.25);
    gain2.gain.setValueAtTime(0.3, audioContext.currentTime + 0.25);
    osc2.start(audioContext.currentTime + 0.25);
    osc2.stop(audioContext.currentTime + 0.45);
    
    // Third beep
    const osc3 = audioContext.createOscillator();
    const gain3 = audioContext.createGain();
    osc3.connect(gain3);
    gain3.connect(audioContext.destination);
    osc3.frequency.setValueAtTime(880, audioContext.currentTime + 0.5);
    gain3.gain.setValueAtTime(0.3, audioContext.currentTime + 0.5);
    osc3.start(audioContext.currentTime + 0.5);
    osc3.stop(audioContext.currentTime + 0.7);
    
    // Also try to vibrate on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  } catch (err) {
    console.error('Alarm sound error:', err);
  }
}

// ── Transaction row (expandable) ─────────────────────────────────────────────

function TransactionRow({ txn, index }) {
  const [expanded, setExpanded] = useState(false);
  const [countdownKey, setCountdownKey] = useState(0);
  const [alarmPlayed, setAlarmPlayed] = useState(false);
  const items = txn.items || [];
  const isActive = txn.status === 'ACTIVE';
  const timeSlot = txn.time_slot;
  
  // Countdown timer for ACTIVE transactions
  useEffect(() => {
    if (!isActive || !timeSlot) return;
    
    const interval = setInterval(() => {
      const minsLeft = minutesRemainingInSlot(timeSlot);
      setCountdownKey(prev => prev + 1);
      
      // Play alarm at 10 seconds remaining (≈0.167 minutes) or when time expires
      if (minsLeft !== null && minsLeft <= 0.167 && !alarmPlayed) {
        playAlarmSound();
        setAlarmPlayed(true);
      }
    }, 1000); // Check every second for accurate 10-second warning
    
    return () => clearInterval(interval);
  }, [isActive, timeSlot, alarmPlayed]);
  
  // Get minutes remaining
  const minsLeft = isActive && timeSlot ? minutesRemainingInSlot(timeSlot) : null;
  const isExpiringSoon = minsLeft !== null && minsLeft <= 15 && minsLeft > 0;
  const isExpired = minsLeft !== null && minsLeft === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="border border-[#001254]/8 rounded-xl overflow-hidden bg-white"
    >
      {/* Row header — tap to expand (req 9.4) */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F2F0DB]/30 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[#001254] text-sm font-semibold">{txn.txn_id}</span>
            <StatusBadge status={txn.status} />
            {/* Countdown display for ACTIVE transactions */}
            {isActive && minsLeft !== null && (
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isExpired 
                  ? 'bg-red-100 text-red-700 border border-red-200' 
                  : isExpiringSoon 
                  ? 'bg-orange-100 text-orange-700 border border-orange-200 animate-pulse'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                <Clock className="w-3 h-3" />
                {isExpired ? 'EXPIRED' : `${minsLeft} min left`}
              </span>
            )}
          </div>
          <p className="text-[#001254]/40 text-xs mt-0.5 truncate">
            {formatDate(txn.txn_date)} · {txn.department} · {txn.lab_room} · {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#001254]/30 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded detail (req 9.2, 9.4) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-[#001254]/6 space-y-3">
              {/* Session details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {[
                  ['Transaction ID', txn.txn_id],
                  ['Date', formatDate(txn.txn_date)],
                  ['Department', txn.department],
                  ['Course', txn.course],
                  ['Time Slot', txn.time_slot],
                  ['Lab Room', txn.lab_room],
                  ['Adviser', txn.adviser],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-[#001254]/35 uppercase tracking-wide" style={{ fontSize: '0.6rem' }}>{label}</span>
                    <p className="text-[#001254] font-medium mt-0.5">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Equipment list */}
              {items.length > 0 && (
                <div>
                  <p className="text-[#001254]/35 uppercase tracking-wide mb-1.5" style={{ fontSize: '0.6rem' }}>Equipment</p>
                  <div className="space-y-1">
                    {items.map((item, i) => (
                      <div key={item.item_id || i} className="flex items-center justify-between bg-[#F2F0DB]/40 rounded-lg px-3 py-2">
                        <span className="text-[#001254] text-xs">{item.name || `Equipment #${item.equipment_id}`}</span>
                        {item.condition && (
                          <span className="text-[#001254]/40 text-xs">{item.condition}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function MyTransactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [datePreset, setDatePreset] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios
      .get(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setTransactions(res.data.transactions || []))
      .catch((err) => {
        console.error('Transactions fetch error:', err);
        setError('Could not load transactions.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Apply preset → set dateFrom/dateTo
  const applyPreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    if (preset === 'TODAY') {
      setDateFrom(fmt(today));
      setDateTo(fmt(today));
    } else if (preset === 'WEEK') {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      setDateFrom(fmt(start));
      setDateTo(fmt(today));
    } else if (preset === 'MONTH') {
      setDateFrom(fmt(new Date(today.getFullYear(), today.getMonth(), 1)));
      setDateTo(fmt(today));
    } else {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Filtered list
  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (dateFrom) {
      const txnDate = t.txn_date ? t.txn_date.slice(0, 10) : '';
      if (txnDate < dateFrom) return false;
    }
    if (dateTo) {
      const txnDate = t.txn_date ? t.txn_date.slice(0, 10) : '';
      if (txnDate > dateTo) return false;
    }
    return true;
  });

  // Summary counters (req 9.3)
  const activeCount = filtered.filter((t) => t.status === 'ACTIVE').length;
  const pendingCount = filtered.filter((t) => t.status === 'PENDING_RETURN').length;
  const claimCount = filtered.filter((t) => t.status === 'CLAIM_ID').length;

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
        <div className="max-w-3xl mx-auto px-4 h-[72px] flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
          </button>
          <img src={logo} alt="FORGE" className="h-8 opacity-70" />
          <span className="text-[#001254]/70 font-semibold text-lg ml-1">
            My Transactions
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full px-4 py-6 space-y-5">

        {/* Summary counters (req 9.3) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: 'Active', count: activeCount, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: Package },
            { label: 'Pending Return', count: pendingCount, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: Loader2 },
            { label: 'Claim ID', count: claimCount, bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: CreditCard },
          ].map(({ label, count, bg, text, border, icon: Icon }) => (
            <div
              key={label}
              className={`rounded-xl border ${bg} ${border} px-3 py-3 flex flex-col items-center gap-1`}
            >
              <Icon className={`w-4 h-4 ${text}`} />
              <span className={`text-2xl font-bold ${text}`}>{count}</span>
              <span className={`text-center leading-tight ${text} opacity-70`} style={{ fontSize: '0.6rem' }}>{label.toUpperCase()}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Filters ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-[#001254]/8 rounded-xl px-4 py-3.5 space-y-3"
        >
          {/* Date presets */}
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-3.5 h-3.5 text-[#001254]/40 shrink-0" />
            {[
              { key: 'ALL', label: 'All Time' },
              { key: 'TODAY', label: 'Today' },
              { key: 'WEEK', label: 'This Week' },
              { key: 'MONTH', label: 'This Month' },
              { key: 'CUSTOM', label: 'Custom' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  datePreset === key
                    ? 'bg-[#001254] text-white border-[#001254]'
                    : 'bg-transparent text-[#001254]/50 border-[#001254]/15 hover:border-[#001254]/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 min-w-[130px] px-3 py-1.5 rounded-lg border border-[#001254]/15 text-[#001254] bg-[#f7f7f3] text-xs focus:outline-none focus:border-[#0B4EA2]"
              />
              <span className="text-[#001254]/30 text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 min-w-[130px] px-3 py-1.5 rounded-lg border border-[#001254]/15 text-[#001254] bg-[#f7f7f3] text-xs focus:outline-none focus:border-[#0B4EA2]"
              />
            </div>
          )}

          {/* Status filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#001254]/40 shrink-0" />
            {[
              { key: 'ALL', label: 'All Status' },
              { key: 'ACTIVE', label: 'Active' },
              { key: 'PENDING_RETURN', label: 'Pending Return' },
              { key: 'CLAIM_ID', label: 'Claim ID' },
              { key: 'RETURNED', label: 'Returned' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  statusFilter === key
                    ? 'bg-[#0B4EA2] text-white border-[#0B4EA2]'
                    : 'bg-transparent text-[#001254]/50 border-[#001254]/15 hover:border-[#001254]/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
          </div>
        )}

        {/* Empty state (req 9.5) */}
        {!loading && !error && transactions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-16 h-[72px] rounded-full bg-[#001254]/6 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-[#001254]/25" />
            </div>
            <div className="text-center">
              <p className="text-[#001254]/50 font-medium">No transactions yet</p>
              <p className="text-[#001254]/30 text-sm mt-1">Your borrowing records will appear here.</p>
            </div>
            <button
              onClick={() => navigate('/borrow')}
              className="mt-2 px-5 py-2.5 bg-[#0B4EA2] text-white rounded-xl text-sm font-medium hover:bg-[#0a3f8a] transition-colors"
            >
              Borrow an Item
            </button>
          </motion.div>
        )}

        {/* No results after filtering */}
        {!loading && !error && transactions.length > 0 && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <Filter className="w-8 h-8 text-[#001254]/20" />
            <p className="text-[#001254]/40 text-sm">No transactions match the selected filters.</p>
            <button
              onClick={() => { applyPreset('ALL'); setStatusFilter('ALL'); }}
              className="text-[#0B4EA2] text-xs underline underline-offset-2"
            >
              Clear filters
            </button>
          </motion.div>
        )}

        {/* Transaction list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[#001254]/40 text-xs uppercase tracking-wide">
                {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== transactions.length && (
                  <span className="ml-1 text-[#001254]/25">of {transactions.length}</span>
                )}
              </p>
            </div>
            {filtered.map((txn, i) => (
              <TransactionRow key={txn.txn_id} txn={txn} index={i} />
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
