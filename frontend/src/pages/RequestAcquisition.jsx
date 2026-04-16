import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft, ShoppingCart, Plus, CheckCircle2, AlertTriangle,
  Loader2, Clock, LayoutDashboard, TrendingUp, Zap, Trash2, ChevronDown,
  Mic, MicOff, FlaskConical, Wrench, ChevronRight
} from 'lucide-react';
import logo from '../assets/logo_landingpage.png';
import { useSTT } from '../hooks/useSTT';
import { useTTS } from '../hooks/useTTS';
import TTSToggle from '../components/ui/TTSToggle';
import { unlockAudio } from '../hooks/useCountdownTimer';
import { getToken } from '../services/authService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const URGENCIES = ['Low', 'Medium', 'High', 'Critical'];
const DEPARTMENTS = [
  {
    id: 'Chemistry',
    label: 'Chemistry',
    desc: 'Flasks, burners, reagents & lab glassware',
    icon: FlaskConical,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    id: 'Physics',
    label: 'Physics',
    desc: 'Oscilloscopes, sensors, optics & mechanics',
    icon: Zap,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
  },
  {
    id: 'Engineering',
    label: 'Engineering',
    desc: 'Multimeters, soldering tools & prototyping kits',
    icon: Wrench,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
];

const DEPARTMENT_DB_VALUES = {
  Chemistry: 'Chemistry',
  Physics: 'Physics',
  Engineering: 'Engineering',
};

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

const emptyItem = () => ({ equipmentName: '', equipmentId: '', quantity: '1' });

export default function RequestAcquisition() {
  const navigate = useNavigate();

  const [view, setView] = useState('form');
  const [step, setStep] = useState('department'); // 'department' or 'form'
  const [selecting, setSelecting] = useState(null);
  const { ttsEnabled, toggleTTS, speak, stop } = useTTS(false);

  // Multi-item form state
  const [items, setItems] = useState([emptyItem()]);
  const [department, setDepartment] = useState('');
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

  // STT for reason field
  const { sttActive, listen, stop: stopSTT, error: sttError } = useSTT();

  // High-demand equipment
  const [highDemand, setHighDemand] = useState([]);
  const [highDemandOpen, setHighDemandOpen] = useState(false);
  const [deptEquipment, setDeptEquipment] = useState([]);

  const token = getToken;

  const fetchDeptEquipment = async (dept) => {
    if (!dept) return;
    console.log('Using highDemand equipment for department:', dept);
    // Match ANY equipment that contains the department name anywhere
    const filtered = highDemand.filter(eq => {
      return eq.department && eq.department.toLowerCase().includes(dept.toLowerCase());
    });
    console.log('Filtered equipment:', filtered);
    setDeptEquipment(filtered);
  };

  // TTS for department step and form step
  useEffect(() => {
    if (ttsEnabled) {
      if (step === 'department') {
        speak('Request Equipment. Select a Department first. Available departments: Chemistry, Physics, Engineering.');
      } else if (step === 'form') {
        speak('Request Equipment Form. Fill in the equipment details and submit your request.');
      }
    }
    
    // Cleanup: stop TTS when navigating away
    return () => {
      stop();
    };
  }, [step, ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTTS = () => {
    toggleTTS();
  };

  const handleSelectDepartment = (dept) => {
    setSelecting(dept.id);
    if (ttsEnabled) speak(`Selected ${dept.label}. Proceeding to request form.`);
    setDepartment(dept.id);
    setView('form'); // Explicitly set view to form
    fetchDeptEquipment(dept.id);
    setTimeout(() => {
      setStep('form');
      setSelecting(null);
    }, 200);
  };

  useEffect(() => {
    axios
      .get(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => setHighDemand(res.data.highDemandEquipment || []))
      .catch(() => {});
  }, []);

  // Load department equipment if coming back with department already selected
  useEffect(() => {
    if (department && step === 'form') {
      fetchDeptEquipment(department);
    }
  }, [department, step]);

  const fetchHistory = () => {
    setHistoryLoading(true);
    setHistoryError('');
    axios
      .get(`${API_URL}/acquisitions/my-requests`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((res) => setRequests(res.data))
      .catch(() => setHistoryError('Could not load your requests.'))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (view === 'history') fetchHistory();
  }, [view]);

  // ── Item helpers ──────────────────────────────────────────────────────────

  const updateItem = (index, field, value) => {
    setItems((prev) => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
    // clear that item's error
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`${field}_${index}`];
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    // clear errors for removed item
    setErrors((prev) => {
      const next = { ...prev };
      ['equipmentName', 'equipmentId', 'quantity'].forEach((f) => delete next[`${f}_${index}`]);
      return next;
    });
  };

  const prefillFromEquipment = (eq) => {
    // Fill the first empty item, or add a new one
    const firstEmpty = items.findIndex((it) => !it.equipmentName && !it.equipmentId);
    if (firstEmpty !== -1) {
      setItems((prev) => prev.map((it, i) =>
        i === firstEmpty ? { ...it, equipmentName: eq.name || '', equipmentId: eq.equipmentId || '' } : it
      ));
    } else {
      setItems((prev) => [...prev, { ...emptyItem(), equipmentName: eq.name || '', equipmentId: eq.equipmentId || '' }]);
    }
    setErrors({});
    setSubmitError('');
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    items.forEach((it, i) => {
      if (!it.equipmentName.trim()) e[`equipmentName_${i}`] = 'Required.';
      if (!it.equipmentId.trim()) e[`equipmentId_${i}`] = 'Required.';
      if (!it.quantity || isNaN(it.quantity) || Number(it.quantity) < 1) e[`quantity_${i}`] = 'Min 1.';
    });
    if (!reason.trim()) e.reason = 'Please describe why this equipment is needed.';
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    unlockAudio(); // pre-unlock inside user gesture
    if (items.length > 10) {
      setSubmitError('You cannot request more than 10 items at a time.');
      return;
    }
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitting(true);
    try {
      // Submit one request per item (backend expects individual requests)
      await Promise.all(
        items.map((it) =>
          axios.post(
            `${API_URL}/acquisitions/request`,
            {
              equipment_name: it.equipmentName.trim(),
              equipment_id: it.equipmentId.trim().toUpperCase(),
              department,
              quantity: Number(it.quantity),
              reason: reason.trim(),
              urgency,
            },
            { headers: { Authorization: `Bearer ${token()}` } }
          )
        )
      );
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRequest = () => {
    setItems([emptyItem()]);
    setDepartment('');
    setReason('');
    setUrgency('Medium');
    setErrors({});
    setSubmitError('');
    setSubmitted(false);
    setView('form');
    setStep('department');
  };

  const inputClass = (errKey) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-[#001254] bg-white transition-colors outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 ${
      errors[errKey] ? 'border-red-400 focus:border-red-400' : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'
    }`;

  const sharedInputClass = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-[#001254] bg-white transition-colors outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 ${
      errors[field] ? 'border-red-400 focus:border-red-400' : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'
    }`;

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
        <Header navigate={navigate} ttsEnabled={ttsEnabled} onToggleTTS={handleToggleTTS} />
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
            <h1 className="text-3xl font-bold text-[#001254]">
              {items.length > 1 ? `${items.length} Requests Submitted!` : 'Request Submitted!'}
            </h1>
            <p className="text-[#001254]/55 text-sm max-w-xs">
              Your equipment acquisition request{items.length > 1 ? 's have' : ' has'} been sent to the Lab Admin for review.
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

  // ── Department Selection Step ─────────────────────────────────────────────
  if (step === 'department') {
    return (
      <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
        <Header navigate={navigate} step={step} ttsEnabled={ttsEnabled} onToggleTTS={handleToggleTTS} />

        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="text-[#0B4EA2] text-xs font-medium tracking-widest uppercase mb-1">
              Step 1 of 2
            </p>
            <h1 className="text-2xl font-semibold text-[#001254]">Select a Department</h1>
            <p className="text-[#001254]/50 text-sm mt-1">
              Choose the department for which you are requesting equipment.
            </p>
          </motion.div>

          {/* Department cards */}
          <div className="space-y-3">
            {DEPARTMENTS.map((dept, i) => {
              const Icon = dept.icon;
              const isSelecting = selecting === dept.id;
              return (
                <motion.button
                  key={dept.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectDepartment(dept)}
                  disabled={!!selecting}
                  className={`w-full flex items-center gap-5 p-5 rounded-xl border-2 bg-white transition-all text-left group ${
                    isSelecting
                      ? 'border-[#0B4EA2] shadow-md'
                      : 'border-[#001254]/10 hover:border-[#0B4EA2]/30 hover:shadow-sm'
                  }`}
                  aria-label={`Select ${dept.label} department`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${dept.iconBg}`}>
                    <Icon className={`w-7 h-7 ${dept.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-[#001254] font-semibold text-base">{dept.label}</h2>
                    <p className="text-[#001254]/45 text-sm mt-0.5 truncate">{dept.desc}</p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 shrink-0 transition-colors ${
                      isSelecting ? 'text-[#0B4EA2]' : 'text-[#001254]/20 group-hover:text-[#001254]/40'
                    }`}
                  />
                </motion.button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EFEFE9] flex flex-col">
      <Header 
        navigate={navigate} 
        step={step} 
        ttsEnabled={ttsEnabled} 
        onToggleTTS={handleToggleTTS}
        onBack={() => setStep('department')}
      />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

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
              view === 'form' ? 'bg-[#0B4EA2] text-white shadow-sm' : 'text-[#001254]/50 hover:text-[#001254]/70'
            }`}
          >
            New Request
          </button>
          <button
            onClick={() => setView('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'history' ? 'bg-[#0B4EA2] text-white shadow-sm' : 'text-[#001254]/50 hover:text-[#001254]/70'
            }`}
          >
            My Requests
          </button>
        </div>

         {/* ── New Request Form ── */}
        {view === 'form' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-5">

            {/* High-demand quick-pick */}
            {highDemand.length > 0 && (
              <div className="bg-white border border-[#001254]/10 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setHighDemandOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#F2F0DB]/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#0B4EA2]" />
                    <span className="text-sm font-medium text-[#001254]/70">High-Demand Equipment Available</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#0B4EA2]/10 text-[#0B4EA2] font-medium">
                      {highDemand.length}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-[#001254]/30 transition-transform duration-200 ${highDemandOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {highDemandOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-[#001254]/6 flex flex-wrap gap-2">
                        {highDemand.map((eq) => (
                          <button
                            key={eq.equipmentId}
                            type="button"
                            onClick={() => { prefillFromEquipment(eq); setHighDemandOpen(false); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#001254]/12 bg-[#f7f7f3] hover:border-[#0B4EA2]/40 hover:bg-[#0B4EA2]/5 transition-all text-left group"
                          >
                            <div className="w-6 h-6 rounded-lg bg-[#001254]/6 flex items-center justify-center shrink-0 group-hover:bg-[#0B4EA2]/10 transition-colors">
                              <Zap className="w-3 h-3 text-[#001254]/40 group-hover:text-[#0B4EA2] transition-colors" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[#001254] text-xs font-medium truncate max-w-[140px]">{eq.name}</p>
                              <p className="text-[#001254]/35 text-xs font-mono">{eq.equipmentId}</p>
                            </div>
                            <div className="flex flex-col items-end gap-0.5 shrink-0">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${eq.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {eq.status === 'AVAILABLE' ? 'Free' : 'In Use'}
                              </span>
                              {eq.availableUnits != null && (
                                <span className="text-[#001254]/35 text-xs">
                                  {eq.availableUnits}/{eq.totalUnits} avail.
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* ── Equipment items ── */}
              <AnimatePresence initial={false}>
                {items.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18 }}
                    className="bg-white rounded-2xl border border-[#001254]/10 p-5 space-y-4"
                  >
                    {/* Item header */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#001254]/50 uppercase tracking-wide">
                        Equipment {items.length > 1 ? `#${index + 1}` : ''}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                        Equipment Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.equipmentName}
                        onChange={(e) => updateItem(index, 'equipmentName', e.target.value)}
                        placeholder="e.g. Digital Oscilloscope, Bunsen Burner"
                        className={inputClass(`equipmentName_${index}`)}
                      />
                      {errors[`equipmentName_${index}`] && (
                        <p className="mt-1 text-xs text-red-500">{errors[`equipmentName_${index}`]}</p>
                      )}
                    </div>

                    {/* ID + Quantity row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                          Equipment ID <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={item.equipmentId}
                          onChange={(e) => updateItem(index, 'equipmentId', e.target.value)}
                          placeholder="e.g. EQ-7167"
                          className={inputClass(`equipmentId_${index}`)}
                        />
                        {errors[`equipmentId_${index}`] && (
                          <p className="mt-1 text-xs text-red-500">{errors[`equipmentId_${index}`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                          Quantity <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          className={inputClass(`quantity_${index}`)}
                        />
                        {errors[`quantity_${index}`] && (
                          <p className="mt-1 text-xs text-red-500">{errors[`quantity_${index}`]}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add another button */}
              <button
                type="button"
                onClick={addItem}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-[#001254]/20 text-[#001254]/50 text-sm font-medium hover:border-[#0B4EA2]/40 hover:text-[#0B4EA2] hover:bg-[#0B4EA2]/3 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Another Equipment
</button>

              {/* ── Shared fields ── */}
              <div className="bg-white rounded-2xl border border-[#001254]/10 p-5 space-y-5">
                <p className="text-xs font-semibold text-[#001254]/50 uppercase tracking-wide">Request Details</p>

                 {/* Department - prefilled, read-only from previous selection */}
                 <div>
                   <label className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
                     Department
                   </label>
                   <div className={`${sharedInputClass('department')} bg-[#f7f7f3]`} style={{ padding: '12px 16px' }}>
                     <span className="font-medium text-[#001254]">{DEPARTMENTS.find(d => d.id === department)?.label || department}</span>
                   </div>
                 </div>

                {/* Urgency */}
                <div>
                  <label className="block text-xs font-medium text-[#001254]/60 mb-2 uppercase tracking-wide">Urgency</label>
                  <div className="flex gap-2 flex-wrap">
                    {URGENCIES.map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          urgency === u ? URGENCY_COLORS[u] : 'bg-white border-[#001254]/15 text-[#001254]/50 hover:border-[#001254]/30'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-[#001254]/60 uppercase tracking-wide">
                      Reason / Justification <span className="text-red-400">*</span>
                    </label>
                    {!sttActive ? (
                      <button
                        type="button"
                        onClick={() => listen((text) => {
                          setReason((prev) => prev ? `${prev} ${text}` : text);
                          setErrors((p) => { const n = { ...p }; delete n.reason; return n; });
                        })}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#001254]/6 text-[#001254]/60 hover:bg-[#001254]/10 transition-all"
                        aria-label="Start voice input"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        Speak
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopSTT}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 transition-all"
                        aria-label="Done speaking"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        Done Speaking
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => { setReason(e.target.value); setErrors((p) => { const n = { ...p }; delete n.reason; return n; }); }}
                    placeholder="Describe why this equipment is needed, for which course or experiment, and any relevant context… or tap Speak"
                    className={`${sharedInputClass('reason')} resize-none`}
                  />
                  {sttError && <p className="mt-1 text-xs text-amber-600">{sttError}</p>}
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
          {submitting
            ? 'Submitting…'
            : items.length > 1
            ? `Submit ${items.length} Requests`
            : 'Submit Request'}
        </button>
      </form>
              </div>
              
              {/* Equipment List Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-[#001254]/10 p-4 sticky top-24">
                  <p className="text-xs font-semibold text-[#001254]/60 uppercase tracking-wide mb-3">
                    Department Equipment
                  </p>
                  
{!department ? (
                      <div className="text-center p-4">
                        <p className="text-[#001254]/40 text-xs mb-2">Select a department first to view available equipment</p>
                        <p className="text-[#0B4EA2]/60 text-xs">↓ Scroll down to select your department ↓</p>
                      </div>
) : (
                      <div className="space-y-2 max-h-[500px] overflow-y-auto">
                        {(() => {
                          // Fallback: always show equipment from highDemand if API fails
                          const equipment = deptEquipment.length > 0 ? deptEquipment : highDemand.filter(eq => {
                            const dbDept = DEPARTMENT_DB_VALUES[department] || department;
                            return eq.department && eq.department.toLowerCase().includes(dbDept.toLowerCase());
                          });
                          
                          if (equipment.length === 0) {
                            return (
                              <p className="text-[#001254]/40 text-xs text-center py-4">
                                No equipment found for this department
                              </p>
                            );
                          }
                          
                          return equipment.map(eq => (
                            <button
                              key={eq.equipmentId}
                              type="button"
                              onClick={() => prefillFromEquipment(eq)}
                              className="w-full text-left p-3 rounded-xl border border-[#001254]/10 hover:border-[#0B4EA2]/30 hover:bg-[#0B4EA2]/5 transition-all"
                            >
                              <p className="text-sm font-medium text-[#001254] truncate">{eq.name}</p>
                              <p className="text-xs font-mono text-[#001254]/40">{eq.equipmentId}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                  eq.status === 'AVAILABLE' 
                                    ? 'bg-emerald-100 text-emerald-700' 
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {eq.status}
                                </span>
                                {eq.totalUnits > 1 && (
                                  <span className="text-[#001254]/35 text-xs">
                                    {eq.availableUnits}/{eq.totalUnits} avail.
                                  </span>
                                )}
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                </div>
              </div>
            </div>
    </motion.div>
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
                <button onClick={() => setView('form')} className="text-[#0B4EA2] text-sm underline underline-offset-2">
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
                        <p className="text-[#001254]/45 text-xs mt-0.5">{req.department} · Qty {req.quantity}</p>
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

function Header({ navigate, step, ttsEnabled, onToggleTTS, onBack }) {
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
      <div className="max-w-2xl mx-auto px-4 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={step === 'form' ? onBack : () => navigate('/dashboard')}
            className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
            aria-label={step === 'form' ? "Back to department selection" : "Back to dashboard"}
          >
            <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
          </button>
          <img src={logo} alt="FORGE" className="h-8 opacity-70" />
          <span className="text-[#001254]/70 font-semibold text-lg">Request Equipment</span>
        </div>
        
        <div className="flex items-center gap-3">
          <TTSToggle enabled={ttsEnabled} onToggle={onToggleTTS} />
        </div>
      </div>
    </header>
  );
}
