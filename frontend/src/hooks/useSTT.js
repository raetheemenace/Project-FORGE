// Feature: forge-system — useSTT hook
// Provides voice input via AWS Transcribe (backend) with Web Speech API fallback.
// Requirements: 11.3, 11.4, 11.5
import { useState, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * useSTT — manages STT active state and listen() function.
 *
 * @returns {{ sttActive, listen, transcript, error }}
 *
 * listen(onResult) — starts recording, calls onResult(text) when done.
 * Falls back to Web Speech API if MediaRecorder is unavailable.
 */
export function useSTT() {
  const [sttActive, setSttActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);

  /**
   * Start listening. Calls onResult(transcriptText) when speech is captured.
   * Times out after 5 seconds per requirement 11.4.
   */
  const listen = useCallback(async (onResult) => {
    if (sttActive) return;
    setError(null);
    setTranscript('');

    // Prefer MediaRecorder + Transcribe backend
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      setSttActive(true);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        setSttActive(false);
        setError('Microphone access denied.');
        return;
      }

      const chunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setSttActive(false);

        try {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const arrayBuffer = await blob.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(arrayBuffer))
          );

          const token = localStorage.getItem('forge_token');
          const { data } = await axios.post(
            `${API_BASE}/api/stt/transcribe`,
            { audioBase64: base64 },
            { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
          );

          setTranscript(data.transcript);
          onResult?.(data.transcript);
        } catch {
          // Transcribe unavailable — fall back to Web Speech API
          _fallbackListen(onResult);
        }
      };

      // Record for up to 5 seconds (req 11.4)
      recorder.start();
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 5000);

      return;
    }

    // Fallback: Web Speech API
    _fallbackListen(onResult);
  }, [sttActive]);

  function _fallbackListen(onResult) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Voice input is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setSttActive(true);

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      onResult?.(text);
      setSttActive(false);
    };

    recognition.onerror = (e) => {
      setError(e.error);
      setSttActive(false);
    };

    recognition.onend = () => setSttActive(false);

    recognition.start();

    // 5-second timeout (req 11.4)
    setTimeout(() => {
      try { recognition.stop(); } catch { /* already stopped */ }
    }, 5000);
  }

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setSttActive(false);
  }, []);

  return { sttActive, listen, stop, transcript, error };
}
