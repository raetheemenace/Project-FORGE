/**
 * useHapticFeedback — vibration + ding sound on success events.
 * Works on mobile (Vibration API) and desktop (Web Audio API ding).
 *
 * Audio context is created lazily on first user interaction to satisfy
 * browser autoplay policies (required on iOS Safari and Chrome mobile).
 */

let _audioCtx = null;

function getAudioContext() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  // Resume if suspended (happens after page load before user gesture)
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

function playDing() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Primary tone: A5 → E5
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc.start(now);
    osc.stop(now + 0.6);

    // Second harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now);
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.start(now);
    osc2.stop(now + 0.4);
  } catch {
    // Silently skip if audio fails
  }
}

function vibrate() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([40, 60, 120]);
    }
  } catch {
    // Silently skip
  }
}

export function useHapticFeedback() {
  return {
    /**
     * Call on any successful action (borrow, report, request).
     * Plays a ding and triggers haptic vibration simultaneously.
     */
    triggerSuccess() {
      vibrate();
      playDing();
    },

    /**
     * Call this on any user interaction (button tap, etc.) to pre-unlock
     * the audio context so the ding works on first triggerSuccess call.
     * Wire this to an onClick on your main action buttons if needed.
     */
    unlockAudio() {
      getAudioContext();
    },
  };
}
