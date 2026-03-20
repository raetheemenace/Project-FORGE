import { useState, useCallback, useRef } from 'react';
import { transcribeVoice } from '../services/ttsService.js';

export const useSTT = (onResult) => {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = reader.result.split(',')[1];
          try {
            const text = await transcribeVoice(base64);
            onResult?.(text);
          } catch {
            setError('Transcription failed');
          }
        };
        reader.readAsDataURL(blob);
        setListening(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
      // Auto-stop after 5 seconds per requirement 11.4
      setTimeout(() => recorder.state === 'recording' && recorder.stop(), 5000);
    } catch {
      setError('Microphone access denied');
      setListening(false);
    }
  }, [onResult]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { listening, error, start, stop };
};
