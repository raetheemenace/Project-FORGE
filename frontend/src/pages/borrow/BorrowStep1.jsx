import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, FlaskConical, Zap, Wrench, ChevronRight } from 'lucide-react';
import logo from '../../assets/logo_landingpage.png';
import { useTTS } from '../../hooks/useTTS';
import StepIndicator from '../../components/ui/StepIndicator';
import TTSToggle from '../../components/ui/TTSToggle';

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

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;

export default function BorrowStep1() {
  const navigate = useNavigate();
  const { ttsEnabled, toggleTTS, speak, stop } = useTTS(false);
  const [selecting, setSelecting] = useState(null);

  // Read page content aloud when TTS is enabled (req 4.5)
  useEffect(() => {
    if (ttsEnabled) {
      speak('Select a Department Stockroom. Step 1 of 4. Available departments: Chemistry, Physics, Engineering.');
    } else {
      stop();
    }
  }, [ttsEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTTS = () => {
    toggleTTS();
  };

  const handleSelectDepartment = (dept) => {
    setSelecting(dept.id);
    if (ttsEnabled) speak(`Selected ${dept.label}. Proceeding to borrowing details.`);
    // Navigate to step 2 with department pre-filled (req 4.2)
    setTimeout(() => {
      navigate('/borrow/step2', { state: { department: dept.id } });
    }, 200);
  };

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
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
            </button>
            <img src={logo} alt="FORGE" className="h-5 opacity-70" />
          </div>

          <div className="flex items-center gap-3">
            <StepIndicator current={CURRENT_STEP} total={TOTAL_STEPS} />

            {/* TTS toggle (req 4.3) */}
            <TTSToggle enabled={ttsEnabled} onToggle={handleToggleTTS} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <p className="text-[#0B4EA2] text-xs font-medium tracking-widest uppercase mb-1">
            Step {CURRENT_STEP} of {TOTAL_STEPS}
          </p>
          <h1 className="text-2xl font-semibold text-[#001254]">Select a Department</h1>
          <p className="text-[#001254]/50 text-sm mt-1">
            Choose the stockroom that holds the equipment you need.
          </p>
        </motion.div>

        {/* Department cards (req 4.1) */}
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
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${dept.iconBg}`}>
                  <Icon className={`w-7 h-7 ${dept.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[#001254] font-semibold text-base">{dept.label}</h2>
                  <p className="text-[#001254]/45 text-sm mt-0.5 truncate">{dept.desc}</p>
                </div>
                <ChevronRight
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isSelecting ? 'text-[#0B4EA2]' : 'text-[#001254]/20 group-hover:text-[#001254]/40'
                  }`}
                />
              </motion.button>
            );
          })}
        </div>

        {/* TTS status indicator */}
        {ttsEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 flex items-center justify-center gap-2 text-[#0B4EA2]/60 text-xs"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Feedback Active</span>
          </motion.div>
        )}
      </main>
    </div>
  );
}
