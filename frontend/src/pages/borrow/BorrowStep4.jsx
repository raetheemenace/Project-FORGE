import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Volume2, CheckCircle2, AlertCircle,
  RefreshCw, ChevronRight, Mic,
} from 'lucide-react';
import axios from 'axios';
import logo from '../../assets/logo_landingpage.png';
import { useTTS } from '../../hooks/useTTS';
import StepIndicator from '../../components/ui/StepIndicator';
import TTSToggle from '../../components/ui/TTSToggle';

const TOTAL_STEPS = 4;
const CURRENT_STEP = 4;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CONDITION_COLORS = {
  Excellent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Good: 'bg-blue-100 text-blue-700 border-blue-200',
  Fair: 'bg-amber-100 text-amber-700 border-amber-200',
  Poor: 'bg-red-100 text-red-700 border-red-200',
};

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-[#001254]/6 last:border-0">
      <span className="text-xs font-medium text-[#001254]/45 uppercase tracking-wide shrink-0 w-24">
        {label}
      </span>
      <span className="text-sm text-[#001254] text-right">{value}</span>
    </div>
  );
}

export default function BorrowStep4() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state ?? {};

  const {
    department = '',
    course = '',
    timeSlot = '',
    date = '',
    labRoom = '',
    adviser = '',
    cartItems = [],
    ttsEnabled: ttsFromPrev = false,
  } = state;

  const { ttsEnabled, toggleTTS, speak, stop } = useTTS(ttsFromPrev);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Read page content aloud when TTS is enabled (req 7.2)
  useEffect(() => {
    if (ttsEnabled) {
      speak(
        `Review Summary. Step 4 of 4. Department: ${department}. Course: ${course}. ` +
        `Date: ${date}. Time Slot: ${timeSlot}. Lab Room: ${labRoom}. Adviser: ${adviser}. ` +
        `${cartItems.length} equipment item${cartItems.length !== 1 ? 's' : ''}: ` +
        cartItems.map((item, i) => `${i + 1}. ${item.name}, condition ${item.condition}`).join('. ')
      );
    } else {
      stop();
    }
  }, [ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Read Summary" button handler (req 7.2)
  function handleReadSummary() {
    speak(
      `Summary. Department: ${department}. Course: ${course}. Date: ${date}. ` +
      `Time Slot: ${timeSlot}. Lab Room: ${labRoom}. Adviser: ${adviser}. ` +
      `Equipment: ` +
      cartItems.map((item, i) => `${i + 1}. ${item.name}, condition ${item.condition}`).join('. ')
    );
  }

  // Confirm and submit (req 7.3, 7.6)
  async function handleConfirm() {
    setSubmitError(null);
    setSubmitting(true);
    speak('Submitting your borrowing transaction. Please wait.');

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${API_BASE}/api/transactions`,
        {
          department,
          course,
          timeSlot,
          date,
          labRoom,
          adviser,
          items: cartItems.map((item) => ({
            equipmentId: item.equipmentId || null,
            name: item.name,
            condition: item.condition,
          })),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      speak(`Transaction confirmed. Your Transaction ID is ${data.txnId}.`);

      navigate('/log-updated', {
        state: { txnId: data.txnId, department, labRoom, itemCount: cartItems.length },
      });
    } catch (err) {
      const msg =
        err.response?.status === 409
          ? 'A conflict occurred. Please go back and try again.'
          : err.response?.data?.error ?? 'Failed to create transaction. Please retry.';
      setSubmitError(msg);
      speak('Error. ' + msg);
    } finally {
      setSubmitting(false);
    }
  }

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
        <div className="max-w-2xl mx-auto px-4 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/borrow/step3', { state })}
              className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
              aria-label="Back to scanner"
            >
              <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
            </button>
            <img src={logo} alt="FORGE" className="h-8 opacity-70" />
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator current={CURRENT_STEP} total={TOTAL_STEPS} />
            <TTSToggle enabled={ttsEnabled} onToggle={toggleTTS} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">
        {/* Step label */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-[#0B4EA2] text-xs font-medium tracking-widest uppercase mb-1">
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </p>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-[#001254]">Review Summary</h1>
            {/* Read Summary TTS button (req 7.2) */}
            <button
              onClick={handleReadSummary}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-white border-[#001254]/15 text-[#001254]/60 hover:border-[#0B4EA2]/30 text-xs font-medium transition-all"
              aria-label="Read summary aloud"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Read Summary</span>
            </button>
          </div>
          <p className="text-[#001254]/50 text-sm mt-1">
            Verify all details before confirming your borrowing transaction.
          </p>
        </motion.div>

        {/* Session details card (req 7.1) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-[#001254]/10 p-5"
        >
          <p className="text-xs font-semibold text-[#001254]/50 uppercase tracking-wide mb-3">
            Session Details
          </p>
          <DetailRow label="Department" value={department || '—'} />
          <DetailRow label="Course" value={course || '—'} />
          <DetailRow label="Date" value={date || '—'} />
          <DetailRow label="Time Slot" value={timeSlot || '—'} />
          <DetailRow label="Lab Room" value={labRoom || '—'} />
          <DetailRow label="Adviser" value={adviser || '—'} />
        </motion.div>

        {/* Equipment list (req 7.1) */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-[#001254]/10 overflow-hidden"
        >
          <div className="px-5 py-3 border-b border-[#001254]/8 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#001254]/50 uppercase tracking-wide">
              Equipment
            </p>
            <span className="text-xs font-bold text-[#0B4EA2]">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
          </div>
          {cartItems.length === 0 ? (
            <p className="text-center text-[#001254]/30 py-6 text-sm">No items scanned.</p>
          ) : (
            <ul className="divide-y divide-[#001254]/6">
              {cartItems.map((item, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 + i * 0.04 }}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="w-6 h-6 rounded-full bg-[#0B4EA2]/10 text-[#0B4EA2] text-xs font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#001254] truncate">{item.name}</p>
                    {item.equipmentId && (
                      <p className="text-xs text-[#001254]/35 font-mono">{item.equipmentId}</p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                      CONDITION_COLORS[item.condition] ?? 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {item.condition}
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>

        {/* Error banner (req 7.5) */}
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
              <button
                onClick={handleConfirm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium transition-colors shrink-0"
                aria-label="Retry submission"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Confirm button (req 7.3) */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={handleConfirm}
          disabled={submitting || cartItems.length === 0}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          aria-label="Confirm and log borrowing"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Confirm and Log Borrowing
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </motion.button>

        {/* Multimodal accessibility notice (req 7.4) */}
        <div className="flex items-center justify-center gap-4 text-xs text-[#001254]/40">
          {ttsEnabled && (
            <span className="flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Voice Feedback Active
            </span>
          )}
          <span className="flex items-center gap-1">
            <Mic className="w-3 h-3" /> Voice Input Available
          </span>
        </div>
      </main>
    </div>
  );
}
