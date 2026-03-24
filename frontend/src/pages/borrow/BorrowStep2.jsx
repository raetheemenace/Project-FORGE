import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, ChevronRight } from 'lucide-react';
import logo from '../../assets/logo_landingpage.png';
import { useTTS } from '../../hooks/useTTS';
import StepIndicator from '../../components/ui/StepIndicator';
import TTSToggle from '../../components/ui/TTSToggle';

const TIME_SLOTS = [
  '07:00 - 09:00',
  '09:00 - 11:00',
  '11:00 - 13:00',
  '13:00 - 15:00',
  '15:00 - 17:00',
  '17:00 - 19:00',
];

const TOTAL_STEPS = 4;
const CURRENT_STEP = 2;

/** Returns today's date as YYYY-MM-DD in local time */
function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Returns true if the given YYYY-MM-DD string is strictly before today */
export function isPastDate(dateStr) {
  if (!dateStr) return false;
  return dateStr < todayString();
}

export default function BorrowStep2() {
  const navigate = useNavigate();
  const location = useLocation();
  const department = location.state?.department ?? '';
  const ttsFromStep1 = location.state?.ttsEnabled ?? false;

  const { ttsEnabled, toggleTTS, speak, stop } = useTTS(ttsFromStep1);
  const [fields, setFields] = useState({
    course: '',
    timeSlot: '',
    date: '',
    labRoom: '',
    adviser: '',
  });
  const [errors, setErrors] = useState({});

  // Read page content aloud when TTS is enabled (req 5.5)
  useEffect(() => {
    if (ttsEnabled) {
      speak(
        `Borrowing Details. Step 2 of 4. Department: ${department || 'not selected'}. ` +
          'Please fill in Course, Time Slot, Date, Lab Room ID, and Adviser.'
      );
    } else {
      stop();
    }
    
    // Cleanup: stop TTS when navigating away
    return () => {
      stop();
    };
  }, [ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTTS = () => toggleTTS();

  const handleChange = (field, value) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleFocus = (label) => {
    if (ttsEnabled) speak(label); // req 5.5
  };

  const validate = () => {
    const next = {};
    if (!fields.course.trim()) next.course = 'Course is required.';
    if (!fields.timeSlot) next.timeSlot = 'Time slot is required.';
    if (!fields.date) {
      next.date = 'Date is required.';
    } else if (isPastDate(fields.date)) {
      next.date = 'Date cannot be in the past.'; // req 5.4
    }
    if (!fields.labRoom.trim()) next.labRoom = 'Lab Room ID is required.';
    if (!fields.adviser.trim()) next.adviser = 'Adviser / Instructor is required.';
    return next;
  };

  const handleNext = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs); // req 5.2 — highlight empty/invalid fields
      if (ttsEnabled) speak('Please fix the highlighted fields before continuing.');
      return;
    }
    navigate('/borrow/step3', {
      state: { department, ...fields, ttsEnabled },
    });
  };

  const fieldClass = (field) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-[#001254] bg-white transition-colors outline-none focus:ring-2 focus:ring-[#0B4EA2]/20 ${
      errors[field]
        ? 'border-red-400 focus:border-red-400'
        : 'border-[#001254]/15 focus:border-[#0B4EA2]/50'
    }`;

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
              onClick={() => navigate('/borrow/step1')}
              className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
              aria-label="Back to department selection"
            >
              <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
            </button>
            <img src={logo} alt="FORGE" className="h-8 opacity-70" />
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator current={CURRENT_STEP} total={TOTAL_STEPS} />
            <TTSToggle enabled={ttsEnabled} onToggle={handleToggleTTS} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-[#0B4EA2] text-xs font-medium tracking-widest uppercase mb-1">
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </p>
          <h1 className="text-2xl font-semibold text-[#001254]">Borrowing Details</h1>
          <p className="text-[#001254]/50 text-sm mt-1">
            Fill in your session information for{' '}
            <span className="font-medium text-[#001254]/70">{department}</span>.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl border border-[#001254]/10 p-6 space-y-5"
        >
          {/* Course */}
          <div>
            <label htmlFor="course" className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
              Course <span className="text-red-400">*</span>
            </label>
            <input
              id="course"
              type="text"
              placeholder="e.g. CHM 001A"
              value={fields.course}
              onChange={(e) => handleChange('course', e.target.value)}
              onFocus={() => handleFocus('Course')}
              className={fieldClass('course')}
              aria-invalid={!!errors.course}
              aria-describedby={errors.course ? 'course-error' : undefined}
            />
            {errors.course && (
              <p id="course-error" className="mt-1 text-xs text-red-500">{errors.course}</p>
            )}
          </div>

          {/* Time Slot */}
          <div>
            <label htmlFor="timeSlot" className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
              Time Slot <span className="text-red-400">*</span>
            </label>
            <select
              id="timeSlot"
              value={fields.timeSlot}
              onChange={(e) => handleChange('timeSlot', e.target.value)}
              onFocus={() => handleFocus('Time Slot')}
              className={fieldClass('timeSlot')}
              aria-invalid={!!errors.timeSlot}
              aria-describedby={errors.timeSlot ? 'timeSlot-error' : undefined}
            >
              <option value="">Select a time slot</option>
              {TIME_SLOTS.map((slot) => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
            {errors.timeSlot && (
              <p id="timeSlot-error" className="mt-1 text-xs text-red-500">{errors.timeSlot}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              id="date"
              type="date"
              min={todayString()}
              value={fields.date}
              onChange={(e) => handleChange('date', e.target.value)}
              onFocus={() => handleFocus('Date')}
              className={fieldClass('date')}
              aria-invalid={!!errors.date}
              aria-describedby={errors.date ? 'date-error' : undefined}
            />
            {errors.date && (
              <p id="date-error" className="mt-1 text-xs text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Lab Room ID */}
          <div>
            <label htmlFor="labRoom" className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
              Lab Room ID <span className="text-red-400">*</span>
            </label>
            <input
              id="labRoom"
              type="text"
              placeholder="e.g. A-101"
              value={fields.labRoom}
              onChange={(e) => handleChange('labRoom', e.target.value)}
              onFocus={() => handleFocus('Lab Room ID')}
              className={fieldClass('labRoom')}
              aria-invalid={!!errors.labRoom}
              aria-describedby={errors.labRoom ? 'labRoom-error' : undefined}
            />
            {errors.labRoom && (
              <p id="labRoom-error" className="mt-1 text-xs text-red-500">{errors.labRoom}</p>
            )}
          </div>

          {/* Adviser */}
          <div>
            <label htmlFor="adviser" className="block text-xs font-medium text-[#001254]/60 mb-1.5 uppercase tracking-wide">
              Adviser / Instructor <span className="text-red-400">*</span>
            </label>
            <input
              id="adviser"
              type="text"
              placeholder="e.g. Engr. Raffy Garcia"
              value={fields.adviser}
              onChange={(e) => handleChange('adviser', e.target.value)}
              onFocus={() => handleFocus('Adviser or Instructor')}
              className={fieldClass('adviser')}
              aria-invalid={!!errors.adviser}
              aria-describedby={errors.adviser ? 'adviser-error' : undefined}
            />
            {errors.adviser && (
              <p id="adviser-error" className="mt-1 text-xs text-red-500">{errors.adviser}</p>
            )}
          </div>
        </motion.div>

        {/* Next button */}
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleNext}
          className="mt-6 w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#0B4EA2] text-white font-semibold text-sm hover:bg-[#0a3f8a] active:scale-[0.98] transition-all"
        >
          Continue to Scanner
          <ChevronRight className="w-4 h-4" />
        </motion.button>

        {/* TTS status indicator */}
        {ttsEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-center justify-center gap-2 text-[#0B4EA2]/60 text-xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Feedback Active</span>
          </motion.div>
        )}
      </main>
    </div>
  );
}
