// Feature: forge-system — useTTS hook
// Provides voice readback via AWS Polly (backend) with Web Speech API fallback.
// Requirements: 11.1, 11.2, 11.5
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * useTTS — manages TTS enabled state and speak() function.
 *
 * @param {boolean} initialEnabled  Starting state of the TTS toggle.
 * @returns {{ ttsEnabled, toggleTTS, speak, speaking }}
 */
export function useTTS(initialEnabled = false) {
  // Persist TTS state in localStorage
  const [ttsEnabled, setTtsEnabled] = useState(() => {
    const saved = localStorage.getItem('ttsEnabled');
    return saved !== null ? saved === 'true' : initialEnabled;
  });
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);
  // Monotonically-increasing ID to detect stale async speak() calls
  const speakIdRef = useRef(0);

  /**
   * Speak text using AWS Polly via backend, falling back to Web Speech API.
   * No-ops when ttsEnabled is false.
   * Atomically cancels any in-progress audio before starting a new clip,
   * ensuring at most one audio clip plays at any time.
   */
  const speak = useCallback(
    async (text) => {
      if (!ttsEnabled || !text) return;

      // Atomically cancel any in-progress speech and claim ownership of this call.
      // Incrementing speakIdRef before the async request ensures that any
      // concurrent or prior speak() call will detect it is stale and abort.
      const myId = ++speakIdRef.current;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      setSpeaking(true);

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post(
          `${API_BASE}/tts/synthesize`,
          { text },
          {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob',
            timeout: 10000,
          }
        );

        // If a newer speak() call has started since the async request began, abort.
        if (speakIdRef.current !== myId) return;

        const url = URL.createObjectURL(response.data);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          audioRef.current = null;
          _fallbackSpeak(text);
        };

        await audio.play();
      } catch {
        // Polly unavailable — fall back to browser TTS silently
        _fallbackSpeak(text);
      }
    },
    [ttsEnabled]
  );

  /** Web Speech API fallback */
  function _fallbackSpeak(text) {
    if (!window.speechSynthesis) {
      setSpeaking(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  /** Stop any active speech immediately */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const toggleTTS = useCallback(() => {
    setTtsEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem('ttsEnabled', String(newValue));
      if (prev) {
        // Turning off — stop any active speech
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        window.speechSynthesis?.cancel();
        setSpeaking(false);
      }
      return newValue;
    });
  }, []);

  return { ttsEnabled, toggleTTS, speak, stop, speaking };
}
