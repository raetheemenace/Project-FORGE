// Feature: forge-system — useSTT hook
// Provides voice input via Web Speech API (browser-native).
// Requirements: 11.3, 11.4, 11.5
import { useState, useCallback, useRef } from 'react';

/**
 * useSTT — manages STT active state and listen() / stop() functions.
 * Uses Web Speech API with continuous mode so the user controls when to stop.
 *
 * @returns {{ sttActive, listen, stop, transcript, error }}
 */
export function useSTT() {
  const [sttActive, setSttActive] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const latestTextRef = useRef('');
  const onResultCallbackRef = useRef(null);

  const listen = useCallback((onResult) => {
    if (sttActive) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    setError(null);
    latestTextRef.current = '';
    onResultCallbackRef.current = onResult;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    recognitionRef.current = recognition;
    setSttActive(true);

    recognition.onresult = (event) => {
      // Accumulate all recognized segments
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + ' ';
      }
      latestTextRef.current = text.trim();
    };

    recognition.onerror = (e) => {
      setError(e.error === 'no-speech' ? 'No speech detected. Try again.' : e.error);
      setSttActive(false);
    };

    recognition.onend = () => {
      // Fire callback with whatever was captured when recognition ends
      if (latestTextRef.current && onResultCallbackRef.current) {
        onResultCallbackRef.current(latestTextRef.current);
      }
      setSttActive(false);
    };

    recognition.start();
  }, [sttActive]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // triggers onend which fires the callback
      recognitionRef.current = null;
    }
    setSttActive(false);
  }, []);

  return { sttActive, listen, stop, error };
}
