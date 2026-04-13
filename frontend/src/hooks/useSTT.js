// Feature: forge-system — useSTT hook
// Provides voice input via Web Speech API (browser-native).
// Requirements: 11.3, 11.4, 11.5
import { useState, useCallback, useRef } from 'react';

/**
 * useSTT — manages STT active state and listen() / stop() functions.
 * Uses Web Speech API. Accumulates ALL finalized segments across restarts
 * so the full transcript is captured even when the browser auto-stops.
 *
 * @returns {{ sttActive, listen, stop, error }}
 */
export function useSTT() {
  const [sttActive, setSttActive] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const accumulatedRef = useRef('');   // all finalized text across restarts
  const onResultCallbackRef = useRef(null);
  const shouldRestartRef = useRef(false);

  const startRecognition = useCallback((recognition) => {
    recognition.onresult = (event) => {
      // Only process newly finalized results from this session
      let newText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newText += event.results[i][0].transcript + ' ';
        }
      }
      if (newText) {
        accumulatedRef.current = (accumulatedRef.current + newText).trimStart();
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return; // ignore silence, let it restart
      setError(e.error);
      shouldRestartRef.current = false;
      setSttActive(false);
    };

    recognition.onend = () => {
      if (shouldRestartRef.current) {
        // Browser auto-stopped due to silence — restart to keep listening
        try { recognition.start(); } catch (_) {}
      } else {
        // User manually stopped — fire callback with everything accumulated
        const full = accumulatedRef.current.trim();
        if (full && onResultCallbackRef.current) {
          onResultCallbackRef.current(full);
        }
        setSttActive(false);
      }
    };

    recognition.start();
  }, []);

  const listen = useCallback((onResult) => {
    if (sttActive) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    accumulatedRef.current = '';
    onResultCallbackRef.current = onResult;
    shouldRestartRef.current = true;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false; // use manual restart instead of continuous

    recognitionRef.current = recognition;
    setSttActive(true);
    startRecognition(recognition);
  }, [sttActive, startRecognition]);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // triggers onend → fires callback
      recognitionRef.current = null;
    }
    setSttActive(false);
  }, []);

  return { sttActive, listen, stop, error };
}
