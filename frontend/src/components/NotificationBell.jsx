import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Bell, X, CheckCheck, Package, Wrench, ShoppingCart, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TYPE_META = {
  BORROW:       { icon: Package,      color: 'text-blue-600',   bg: 'bg-blue-50' },
  MAINTENANCE:  { icon: Wrench,       color: 'text-amber-600',  bg: 'bg-amber-50' },
  ACQUISITION:  { icon: ShoppingCart, color: 'text-emerald-600',bg: 'bg-emerald-50' },
  STATUS_UPDATE:{ icon: RefreshCw,    color: 'text-purple-600', bg: 'bg-purple-50' },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);
  const prevUnreadRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data.notifications || []);
      const count = res.data.unreadCount || 0;
      setUnreadCount(count);
      // Only trigger chime/vibrate on subsequent polls where count increased
      // (skip the very first fetch — prevUnreadRef is null on mount)
      if (prevUnreadRef.current !== null && count > prevUnreadRef.current) {
        // Play a short chime via Web Audio API
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (!AudioCtx) throw new Error('No AudioContext');
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
        } catch (_) {}
        navigator.vibrate?.([200]);
      }
      prevUnreadRef.current = count;
    } catch (_) {}
  };

  // Poll every 30s
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      // Mark all as read
      try {
        const token = localStorage.getItem('token');
        await axios.patch(`${API_URL}/notifications/read-all`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      } catch (_) {}
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-[#001254]/60" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center font-bold"
            style={{ fontSize: '0.55rem' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden shadow-2xl z-50"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,18,84,0.08)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#001254]/8">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-[#001254]/50" />
                <span className="text-[#001254]/70 font-semibold text-sm">Notifications</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-[#001254]/30 hover:text-[#001254]/60 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <CheckCheck className="w-8 h-8 text-[#001254]/15" />
                  <p className="text-[#001254]/35 text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META.STATUS_UPDATE;
                  const Icon = meta.icon;
                  return (
                    <div
                      key={n.notification_id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-[#001254]/5 transition-colors ${
                        !n.is_read ? 'bg-[#F2F0DB]/40' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#001254] text-xs leading-relaxed">{n.message}</p>
                        <p className="text-[#001254]/35 text-xs mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#0B4EA2] shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
