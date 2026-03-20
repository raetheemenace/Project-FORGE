import { useState, useCallback, useRef } from 'react';
import { synthesizeSpeech } from '../services/ttsService.js';

export const useTTS = () => {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  const speak = useCallback(async (text) => {
    if (!enabled || !text) return;
    try {
      setSpeaking(true);
      const arrayBuffer = await synthesizeSpeech(text);
      const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => setSpeaking(false);
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      if (prev && audioRef.current) {
        audioRef.current.pause();
        setSpeaking(false);
      }
      return !prev;
    });
  }, []);

  return { enabled, speaking, speak, toggle };
};
