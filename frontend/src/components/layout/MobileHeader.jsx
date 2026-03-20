import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StepIndicator from '../ui/StepIndicator.jsx';
import TTSToggle from '../ui/TTSToggle.jsx';

const MobileHeader = ({ title, back, step, totalSteps, tts }) => {
  const navigate = useNavigate();
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-[#0a0f1e] border-b border-zinc-800 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {back && (
          <button
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
            aria-label="Go back"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <span className="text-sm font-semibold text-white truncate">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        {step && totalSteps && <StepIndicator current={step} total={totalSteps} />}
        {tts && <TTSToggle {...tts} />}
      </div>
    </header>
  );
};

export default MobileHeader;
