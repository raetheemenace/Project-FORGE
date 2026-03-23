import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowLeft, LayoutDashboard } from 'lucide-react';
import logo from '../assets/logo_landingpage.png';

export default function LogUpdated() {
  const navigate = useNavigate();
  const location = useLocation();
  const { txnId = '—', department = '—', labRoom = '—', itemCount = 0 } =
    location.state ?? {};

  return (
    <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
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
        <div className="max-w-2xl mx-auto px-4 h-[72px] flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
          </button>
          <img src={logo} alt="FORGE" className="h-8 opacity-70" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-center gap-6">
        {/* Success icon (req 8.1) */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center"
        >
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
        </motion.div>

        {/* Title (req 8.1) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center space-y-2"
        >
          <h1 className="text-3xl font-bold text-[#001254]">Log Updated!</h1>
          <p className="text-[#001254]/55 text-sm max-w-xs">
            Your borrowing record is now visible to the Lab Admin.
          </p>
        </motion.div>

        {/* Transaction details card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="w-full bg-white rounded-2xl border border-[#001254]/10 p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide">
              Transaction ID
            </span>
            <span className="text-sm font-mono font-semibold text-[#0B4EA2]">{txnId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide">
              Department
            </span>
            <span className="text-sm text-[#001254]">{department}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide">
              Lab Room
            </span>
            <span className="text-sm text-[#001254]">{labRoom}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide">
              Items Borrowed
            </span>
            <span className="text-sm text-[#001254]">
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>
        </motion.div>

        {/* Confirmation message (req 8.2) */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs text-[#001254]/40 text-center max-w-xs"
        >
          A confirmation has been sent to your account. You can view this transaction in My Transactions.
        </motion.p>

        {/* Back to Dashboard button (req 8.3) */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] transition-all"
          aria-label="Back to dashboard"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Dashboard
        </motion.button>
      </main>
    </div>
  );
}
