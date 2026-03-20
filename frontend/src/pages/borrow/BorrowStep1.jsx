import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { FlaskConical, Atom, Cpu } from 'lucide-react';
import MobileHeader from '../../components/layout/MobileHeader.jsx';
import { useTTS } from '../../hooks/useTTS.js';

const DEPARTMENTS = [
  { id: 'Chemistry',   icon: FlaskConical, desc: 'Glassware, reagents, lab equipment' },
  { id: 'Physics',     icon: Atom,         desc: 'Optics, mechanics, electronics' },
  { id: 'Engineering', icon: Cpu,          desc: 'Tools, circuits, fabrication' },
];

const BorrowStep1 = () => {
  const navigate = useNavigate();
  const tts = useTTS();

  useEffect(() => {
    tts.speak('Step 1 of 4. Select a department stockroom. Available departments: Chemistry, Physics, Engineering.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tts.enabled]);

  const handleSelect = (dept) => {
    sessionStorage.setItem('borrow_dept', dept);
    navigate('/borrow/step2');
  };

  return (
    <div className="min-h-screen bg-[#060b18] text-zinc-100">
      <MobileHeader
        title="Borrow an Item"
        back="/dashboard"
        step={1}
        totalSteps={4}
        tts={{ enabled: tts.enabled, speaking: tts.speaking, onToggle: tts.toggle }}
      />

      <main className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-1">Select Department</h2>
          <p className="text-sm text-zinc-500">Choose the stockroom for the equipment you need.</p>
        </div>

        <div className="space-y-3">
          {DEPARTMENTS.map(({ id, icon: Icon, desc }) => (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              className="w-full flex items-center gap-4 bg-zinc-900/60 border border-zinc-800 hover:border-orange-500/50 hover:bg-zinc-800/60 rounded-xl px-5 py-4 transition-all active:scale-[0.98] text-left"
            >
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                <Icon size={22} className="text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{id}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Multimodal status */}
        <div className="mt-8 flex items-center justify-center gap-4 text-[10px] text-zinc-600">
          <span className={tts.enabled ? 'text-orange-400' : ''}>
            {tts.enabled ? '● Voice Feedback Active' : '○ Voice Feedback Off'}
          </span>
        </div>
      </main>
    </div>
  );
};

export default BorrowStep1;
