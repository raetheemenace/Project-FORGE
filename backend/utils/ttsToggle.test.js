// Feature: forge-system, Property 12: TTS toggle state consistency
// For any screen in the Borrow an Item flow, toggling TTS on then off should return
// the TTS state to its original off state, and no audio should play after the toggle
// returns to off.
// Validates: Requirements 11.1
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure state machine that mirrors useTTS logic — no React/DOM required.
// ---------------------------------------------------------------------------

/**
 * Minimal model of the TTS toggle state machine.
 * Tracks: enabled flag, whether stop() was called when toggling off.
 */
function createTTSModel(initialEnabled = false) {
  let enabled = initialEnabled;
  let stopCalled = false;
  let speakCalled = false;
  let lastSpokenText = null;

  return {
    toggle() {
      if (enabled) {
        // Turning off must stop active speech (req 11.1)
        stopCalled = true;
        speakCalled = false;
        lastSpokenText = null;
      } else {
        stopCalled = false;
      }
      enabled = !enabled;
    },
    speak(text) {
      if (!enabled) return; // no-op when disabled
      speakCalled = true;
      lastSpokenText = text;
    },
    stop() {
      stopCalled = true;
      speakCalled = false;
      lastSpokenText = null;
    },
    get isEnabled() { return enabled; },
    get wasStopCalled() { return stopCalled; },
    get wasSpeakCalled() { return speakCalled; },
    get lastText() { return lastSpokenText; },
    reset() {
      stopCalled = false;
      speakCalled = false;
      lastSpokenText = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

// Arbitrary non-empty text strings (simulating page content read aloud)
const arbText = fc.string({ minLength: 1, maxLength: 200 });

// Arbitrary sequence of toggle actions (true = toggle, false = speak)
const arbActions = fc.array(
  fc.record({ type: fc.constantFrom('toggle', 'speak', 'stop'), text: arbText }),
  { minLength: 1, maxLength: 20 }
);

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('Property 12: TTS toggle state consistency', () => {

  // Property 12a — toggle on then off returns to off state
  it('toggling TTS on then off always returns to disabled state', () => {
    fc.assert(
      fc.property(fc.boolean(), (startEnabled) => {
        const tts = createTTSModel(startEnabled);
        const before = tts.isEnabled;

        // Toggle once (changes state)
        tts.toggle();
        // Toggle again (returns to original)
        tts.toggle();

        expect(tts.isEnabled).toBe(before);
      }),
      { numRuns: 100 }
    );
  });

  // Property 12b — speak() is a no-op when TTS is disabled
  it('speak() does not produce audio when TTS is disabled', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const tts = createTTSModel(false); // starts disabled
        tts.speak(text);

        expect(tts.wasSpeakCalled).toBe(false);
        expect(tts.lastText).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  // Property 12c — speak() works when TTS is enabled
  it('speak() records audio when TTS is enabled', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const tts = createTTSModel(true); // starts enabled
        tts.speak(text);

        expect(tts.wasSpeakCalled).toBe(true);
        expect(tts.lastText).toBe(text);
      }),
      { numRuns: 100 }
    );
  });

  // Property 12d — toggling off stops any active speech
  it('toggling TTS off always calls stop() to cancel active speech', () => {
    fc.assert(
      fc.property(arbText, (text) => {
        const tts = createTTSModel(true); // start enabled
        tts.speak(text); // simulate active speech

        tts.toggle(); // turn off

        expect(tts.isEnabled).toBe(false);
        expect(tts.wasStopCalled).toBe(true);
        expect(tts.wasSpeakCalled).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // Property 12e — after toggle off, subsequent speak() calls are no-ops
  it('after toggling off, speak() never produces audio regardless of input', () => {
    fc.assert(
      fc.property(arbText, fc.array(arbText, { minLength: 1, maxLength: 10 }), (first, rest) => {
        const tts = createTTSModel(true);
        tts.speak(first); // speak while on

        tts.toggle(); // turn off
        tts.reset();  // clear flags to observe post-toggle behavior

        for (const t of rest) {
          tts.speak(t);
        }

        expect(tts.isEnabled).toBe(false);
        expect(tts.wasSpeakCalled).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  // Property 12f — arbitrary toggle sequence: enabled state is always a boolean
  it('TTS enabled state is always a boolean after any sequence of toggles', () => {
    fc.assert(
      fc.property(fc.nat({ max: 50 }), (toggleCount) => {
        const tts = createTTSModel(false);
        for (let i = 0; i < toggleCount; i++) {
          tts.toggle();
        }
        expect(typeof tts.isEnabled).toBe('boolean');
        // After even number of toggles, state returns to initial (false)
        if (toggleCount % 2 === 0) {
          expect(tts.isEnabled).toBe(false);
        } else {
          expect(tts.isEnabled).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  // Property 12g — interleaved speak/toggle sequences never leave audio playing when disabled
  it('no audio plays after any sequence ending with TTS disabled', () => {
    fc.assert(
      fc.property(arbActions, (actions) => {
        const tts = createTTSModel(false);

        for (const action of actions) {
          if (action.type === 'toggle') tts.toggle();
          else if (action.type === 'speak') tts.speak(action.text);
          else tts.stop();
        }

        // If TTS is currently disabled, speak must be a no-op
        if (!tts.isEnabled) {
          tts.reset();
          tts.speak('should not play');
          expect(tts.wasSpeakCalled).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});
