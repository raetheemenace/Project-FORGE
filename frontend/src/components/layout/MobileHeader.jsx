import { ArrowLeft } from 'lucide-react';

/**
 * MobileHeader — sticky top bar for borrow flow pages.
 *
 * Props:
 *   onBack        {function}  — called when the back button is tapped
 *   logo          {string}    — img src for the FORGE logo
 *   stepIndicator {node}      — step dots / progress indicator
 *   ttsButton     {node}      — TTS toggle button
 */
export default function MobileHeader({ onBack, logo, stepIndicator, ttsButton }) {
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
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: back button + logo */}
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#001254]/8 rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 text-[#001254]/60" />
            </button>
          )}
          {logo && <img src={logo} alt="FORGE" className="h-5 opacity-70" />}
        </div>

        {/* Right: step indicator + TTS toggle */}
        <div className="flex items-center gap-3">
          {stepIndicator}
          {ttsButton}
        </div>
      </div>
    </header>
  );
}
