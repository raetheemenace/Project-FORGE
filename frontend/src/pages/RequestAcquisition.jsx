import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft, ShoppingCart, Plus, CheckCircle2, AlertTriangle,
  Loader2, Clock, LayoutDashboard,
} from 'lucide-react';
import logo from '../assets/logo_landingpage.png';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const URGENCIES = ['Low', 'Medium', 'High', 'Critical'];
const DEPARTMENTS = [
  'Computer Engineering',
  'Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemistry Laboratory',
  'Other',
];

const URGENCY_COLORS = {
  Low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  High: 'bg-orange-100 text-orange-700 border-orange-200',
  Critical: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_COLORS = {
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  REJECTED: 'bg-red-50 text-red-600 border-red-200',
  FULFILLED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STATUS_LABELS = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  FULFILLED: 'Fulfilled',
};

export default function RequestAcquisition() {
  const navigate = useNavigate();

  // View: 'form' | 'history'
  const [view, setView] = useState('form');

  // Form state
  const [equipmentName, setEquipmentName] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [department, setDepartment] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // History state
  const [requests, setRequests] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const token = () => localStorage.getItem('token');

  const fetchHistory = () => {
    setHistoryLoading(true);
    setHistoryError('');
    axios
      .get(`${API_URL}/acquisitions/my-requests`, {
        headers: { Authorization: `Bearer ${token()}` },
      })
      .then((res) => setRequests(res.data))
      .catch(() => setHistoryError('Could not load your requests.'))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (view === 'history') fetchHistory();
  }, [view]);

  const validate = () => {
    const e = {};
    if (!equipmentName.trim()) e.equipmentName = 'Equipment name is required.';
    if (!equipmentId.trim()) e.equipmentId = 'Equipment ID is required.';
    if (!department) e.department = 'Department is required.';
    if (!quantity || isNaN(quantity) || Number(quantity) < 1) e.quantity = 'Enter a valid quantity (min 1).';
    if (!reason.trim()) e.reason = 'Please describe why this equipment is needed.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      await axios.post(
        `${API_URL}/acquisitions/request`,
        {
          equipment_name: equipmentName.trim(),
          equipment_id: equipmentId.trim().toUpperCase(),
          department,
          quantity: Number(quantity),
          reason: reason.trim(),
          urgency,
        },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    setEquipmentName('');
    setEquipmentId('');
    setDepartment('');
    setQuantity('1');
    setReason('');
    setUrgency('Medium');
    setErrors({});
    setSubmitError('');
    setSubmitted(false);
  };

  const fieldClass = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-[#001254] bg-white transition-colors outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 ${
      errors[field] ? 'border-red-400 focus:border-red-400' : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'
    }`;

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
        <Header navigate={navigate} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 flex flex-col items-center justify-center gap-6">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="w-24 h-24 rounded-full bg-emerald-100 flex items-center justify-center"
          >
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-center space-y-2"
          >
            <h1 className="text-3xl font-bold text-[#001254]">Request Submitted!</h1>
            <p className="text-[#001254]/55 text-sm max-w-xs">
              Your equipment acquisition request has been sent to the Lab Admin for review.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex gap-3"
          >
            <button
              onClick={handleNewRequest}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-[#0B4EA2] text-[#0B4EA2] font-semibold text-sm hover:bg-[#0B4EA2]/5 transition-all"
            >
              <Plus className="w-4 h-4" />
              New Request
            </button>
            <button
              onClick={() => { setSubmitted(false); setView('history'); fetchHistory(); }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] transition-all"
            >
              <Clock className="w-4 h-4" />
              View My Requests
            </button>
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-[#001254]/40 text-sm hover:text-[#001254]/60 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Back to Dashboard
          </motion.button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
      <Header navigate={navigate} />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Page title + tab switcher */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-semibold text-[#001254]">Request Equipment</h1>
          <p className="text-[#001254]/50 text-sm mt-1">
            Can't find what you need? Submit a request and the Lab Admin will review it.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white border border-[#001254]/10 rounded-xl p-1 mb-6">
          <button
            onClick={() => setView('form')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'form'
                ? 'bg-[#0B4EA2] text-white shadow-sm'
                : 'text-[#001254]/50 hover:text-[#001254]/70'
            }`}
          >
            New Request
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'history'
                ? 'bg-[#0B4EA2] text-white shadow-sm'
                : 'text-[#001254]/50 hover:text-[#001254]/70'
            }`}
          >
            My Requests
          </button>
        </div>

        {/* ── New Request Form ── */}
        {view === 'form' && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            noValidate
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-[#001254]/10 p-6 space-y-5">

              {/* Equipment Name */}
              <div>
                <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                  Equipment Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={equipmentName}
                  onChange={(e) => { setEquipmentName(e.target.value); if (errors.equipmentName) setErrors((p) => ({ ...p, equipmentName: '' })); }}
                  placeholder="e.g. Digital Oscilloscope, Bunsen Burner"
                  className={fieldClass('equipmentName')}
                />
                {errors.equipmentName && <p className="mt-1 text-xs text-red-500">{errors.equipmentName}</p>}
              </div>

              {/* Equipment ID */}
              <div>
                <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                  Equipment ID <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={equipmentId}
                  onChange={(e) => { setEquipmentId(e.target.value); if (errors.equipmentId) setErrors((p) => ({ ...p, equipmentId: '' })); }}
                  placeholder="e.g. EQ-7167"
                  className={fieldClass('equipmentId')}
                />
                {errors.equipmentId && <p className="mt-1 text-xs text-red-500">{errors.equipmentId}</p>}
              </div>

              {/* Department + Quantity row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                    Department <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => { setDepartment(e.target.value); if (errors.department) setErrors((p) => ({ ...p, department: '' })); }}
                    className={fieldClass('department')}
                  >
                    <option value="">Select…</option>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                  {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                    Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => { setQuantity(e.target.value); if (errors.quantity) setErrors((p) => ({ ...p, quantity: '' })); }}
                    className={fieldClass('quantity')}
                  />
                  {errors.quantity && <p className="mt-1 text-xs text-red-500">{errors.quantity}</p>}
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-xs font-medium text-[#001254]/60 mb-2 uppercase tracking-wide">
                  Urgency
                </label>
                <div className="flex gap-2 flex-wrap">
                  {URGENCIES.map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        urgency === u
                          ? URGENCY_COLORS[u]
                          : 'bg-white border-[#001254]/15 text-[#001254]/50 hover:border-[#001254]/30'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                  Reason / Justification <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); if (errors.reason) setErrors((p) => ({ ...p, reason: '' })); }}
                  placeholder="Describe why this equipment is needed, for which course or experiment, and any relevant context…"
                  className={`${fieldClass('reason')} resize-none`}
                />
                {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
              </div>
            </div>

            {/* Submit error */}
            <AnimatePresence>
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {submitError}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </motion.form>
        )}

        {/* ── My Requests History ── */}
        {view === 'history' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-[#0B4EA2] animate-spin" />
              </div>
            ) : historyError ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {historyError}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <ShoppingCart className="w-10 h-10 text-[#001254]/15" />
                <p className="text-[#001254]/40 text-sm">No requests yet.</p>
                <button
                  onClick={() => setView('form')}
                  className="text-[#0B4EA2] text-sm underline underline-offset-2"
                >
                  Submit your first request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <motion.div
                    key={req.request_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-[#001254]/10 p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#001254] font-semibold text-sm truncate">{req.equipment_name}</p>
                        <p className="text-[#001254]/40 text-xs font-mono mt-0.5">{req.equipment_id}</p>
                        <p className="text-[#001254]/40 text-xs font-mono mt-0.5">REQ-{String(req.request_id).padStart(4, '0')}</p>
                        <p className="text-[#001254]/45 text-xs mt-0.5">
                          {req.department} · Qty {req.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${URGENCY_COLORS[req.urgency]}`}>
                          {req.urgency}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[req.status]}`}>
                          {STATUS_LABELS[req.status]}
                        </span>
                      </div>
                    </div>

                    <p className="text-[#001254]/60 text-xs leading-relaxed">{req.reason}</p>

                    {req.admin_notes && (
                      <div className="bg-[#EFEFE9]/80 rounded-lg px-3 py-2">
                        <p className="text-[#001254]/40 text-xs font-medium uppercase tracking-wide mb-0.5">Admin Notes</p>
                        <p className="text-[#001254]/70 text-xs">{req.admin_notes}</p>
                      </div>
                    )}

                    <p className="text-[#001254]/30 text-xs">
                      Submitted {new Date(req.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

function Header({ navigate }) {
  return (
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
        <span className="text-[#001254]/70 font-semibold text-lg">Request Equipment</span>
      </div>
    </header>
  );
}
