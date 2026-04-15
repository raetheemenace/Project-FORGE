// Feature: forge-system — useTTS hook
// Provides voice readback via AWS Polly (backend) with Web Speech API fallback.
// Requirements: 11.1, 11.2, 11.5
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// GLOBAL SINGLETON STATE - shared across ALL useTTS instances
const globalTTSState = {
  isProcessing: false,
  lastSpeakTime: 0,
  currentAudio: null,
  currentAbortController: null,
  DEBOUNCE_MS: 500
};

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
  const abortControllerRef = useRef(null);
  const speakQueueRef = useRef(null);

  /**
   * Speak text using AWS Polly via backend, falling back to Web Speech API.
   * No-ops when ttsEnabled is false.
   */
  const speak = useCallback(
    async (text) => {
      if (!ttsEnabled || !text) return;
      
      // Debounce rapid calls across ALL instances
      const now = Date.now();
      if (now - globalTTSState.lastSpeakTime < globalTTSState.DEBOUNCE_MS) return;
      globalTTSState.lastSpeakTime = now;
      
      // Cancel ANY existing speech globally across all components
      stop();
      
      // Prevent overlapping calls globally
      if (globalTTSState.isProcessing) return;
      globalTTSState.isProcessing = true;

      // Cancel any in-progress speech and pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();
      globalTTSState.currentAbortController = abortControllerRef.current;

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
            signal: abortControllerRef.current.signal,
          }
        );

        // Check if we were cancelled during the request
        if (abortControllerRef.current.signal.aborted) return;

        const url = URL.createObjectURL(response.data);
        const audio = new Audio(url);
        audioRef.current = audio;
        globalTTSState.currentAudio = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          audioRef.current = null;
          abortControllerRef.current = null;
          globalTTSState.isProcessing = false;
          globalTTSState.currentAudio = null;
          globalTTSState.currentAbortController = null;
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setSpeaking(false);
          audioRef.current = null;
          abortControllerRef.current = null;
          globalTTSState.isProcessing = false;
          globalTTSState.currentAudio = null;
          globalTTSState.currentAbortController = null;
          _fallbackSpeak(text);
        };

        await audio.play();
      } catch (err) {
        // Ignore abort errors
        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          globalTTSState.isProcessing = false;
          return;
        }
        // Polly unavailable — fall back to browser TTS silently
        globalTTSState.isProcessing = false;
        _fallbackSpeak(text);
      }
    },
    [ttsEnabled]
  );

  /** Web Speech API fallback */
  function _fallbackSpeak(text) {
    if (!window.speechSynthesis) {
      setSpeaking(false);
      globalTTSState.isProcessing = false;
      return;
    }
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.95;
    utt.onend = () => {
      setSpeaking(false);
      globalTTSState.isProcessing = false;
    };
    utt.onerror = () => {
      setSpeaking(false);
      globalTTSState.isProcessing = false;
    };
    window.speechSynthesis.speak(utt);
  }

  /** Stop any active speech immediately */
  const stop = useCallback(() => {
    // Stop ANY active TTS globally
    if (globalTTSState.currentAbortController) {
      try { globalTTSState.currentAbortController.abort(); } catch(e) {}
      globalTTSState.currentAbortController = null;
    }
    if (globalTTSState.currentAudio) {
      try { globalTTSState.currentAudio.pause(); } catch(e) {}
      globalTTSState.currentAudio = null;
    }
    if (abortControllerRef.current) {
      try { abortControllerRef.current.abort(); } catch(e) {}
      abortControllerRef.current = null;
    }
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch(e) {}
      audioRef.current = null;
    }
    try { window.speechSynthesis?.cancel(); } catch(e) {}
    setSpeaking(false);
    globalTTSState.isProcessing = false;
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
