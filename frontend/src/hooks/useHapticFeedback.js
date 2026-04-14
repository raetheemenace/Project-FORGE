/**
 * useHapticFeedback — vibration + ding sound on success events.
 * Works on mobile (Vibration API) and desktop (Web Audio API ding).
 */

// Generate a short ding tone using Web Audio API
function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Primary tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);          // A5
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15); // E5

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);

    // Second harmonic for richness
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime);
    gain2.gain.setValueAtTime(0.15, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + 0.4);

    // Auto-close context after sound finishes
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Web Audio not supported — silently skip
  }
}

// Trigger haptic vibration pattern
function vibrate() {
  if (!navigator.vibrate) return;
  // Short-long pattern: feels like a success "tap-buzz"
  navigator.vibrate([40, 60, 120]);
}

export function useHapticFeedback() {
  return {
    /**
     * Call this on any successful action (borrow, report, request).
     * Plays a ding and triggers haptic vibration simultaneously.
     */
    triggerSuccess() {
      vibrate();
      playDing();
    },
  };
}
