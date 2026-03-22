import { Volume2, VolumeX } from 'lucide-react';

/**
 * TTS on/off toggle button for the Borrow an Item flow.
 *
 * Props:
 *   enabled   {boolean}  - Whether TTS is currently active
 *   onToggle  {function} - Callback when the button is clicked
 *   className {string}   - Extra wrapper classes
 */
export default function TTSToggle({ enabled, onToggle, className = '' }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-medium ${
        enabled
          ? 'bg-[#0B4EA2] border-[#0B4EA2] text-white'
          : 'bg-white border-[#001254]/15 text-[#001254]/60 hover:border-[#0B4EA2]/30'
      } ${className}`}
      aria-label={enabled ? 'Disable voice readback' : 'Enable voice readback'}
      aria-pressed={enabled}
    >
      {enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
      <span className="hidden sm:inline">{enabled ? 'TTS On' : 'TTS Off'}</span>
    </button>
  );
}
