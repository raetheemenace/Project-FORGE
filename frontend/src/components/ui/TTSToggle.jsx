import { Volume2, VolumeX } from 'lucide-react';

const TTSToggle = ({ enabled, speaking, onToggle }) => (
  <button
    onClick={onToggle}
    aria-label={enabled ? 'Disable voice readback' : 'Enable voice readback'}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
      enabled
        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
    }`}
  >
    {enabled ? (
      <Volume2 size={13} className={speaking ? 'animate-pulse' : ''} />
    ) : (
      <VolumeX size={13} />
    )}
    {enabled ? (speaking ? 'Speaking...' : 'TTS On') : 'TTS Off'}
  </button>
);

export default TTSToggle;
