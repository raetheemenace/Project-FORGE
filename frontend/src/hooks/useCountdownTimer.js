import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useCountdownTimer hook with alarm notification
 * Provides countdown functionality for borrowed equipment time slots
 * Triggers audible alarm when time expires
 */
export function useCountdownTimer(timeSlot, txnDate, onComplete) {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const alarmIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Parse time slot string like "11:00-13:00"
  const parseTimeSlot = useCallback(() => {
    if (!timeSlot || !txnDate) return null;
    
    const match = timeSlot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!match) return null;
    
    const [, sh, sm, eh, em] = match.map(Number);
    const base = new Date(txnDate);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em);
    
    return end;
  }, [timeSlot, txnDate]);

  // Initialize countdown
  useEffect(() => {
    const endTime = parseTimeSlot();
    if (!endTime) {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const now = Date.now();
      const diff = endTime - now;
      
      if (diff <= 0) {
        setTimeRemaining(0);
        setIsExpired(true);
        return false;
      }
      
      const seconds = Math.floor(diff / 1000);
      setTimeRemaining(seconds);
      return true;
    };

    // Initial calculation
    calculateRemaining();

    // Update every second
    intervalRef.current = setInterval(() => {
      const stillActive = calculateRemaining();
      if (!stillActive) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch(e) {}
      }
    };
  }, [parseTimeSlot]);

  // Trigger alarm when expired
  useEffect(() => {
    if (isExpired && !alarmActive) {
      setAlarmActive(true);
      playAlarm();
      if (onComplete) onComplete();
    }
  }, [isExpired, alarmActive, onComplete]);

  // Play alarm sound - clock ding every 2 seconds for 15 seconds total
  const playAlarm = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      let dingCount = 0;
      const MAX_DINGS = 8; // 8 dings × 2s = 16 seconds total
      
      const playDing = () => {
        if (!alarmActive || dingCount >= MAX_DINGS) {
          clearInterval(alarmIntervalRef.current);
          alarmIntervalRef.current = null;
          setAlarmActive(false);
          return;
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Clock/ding sound - 1200Hz sine wave with fast attack/decay
        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
        
        dingCount++;
      };
      
      // Play first ding immediately
      playDing();
      
      // Play ding every 2 seconds
      alarmIntervalRef.current = setInterval(playDing, 2000);
      
    } catch (e) {
      console.warn('Alarm audio not supported');
    }
  }, [alarmActive]);

  // Stop alarm manually
  const stopAlarm = useCallback(() => {
    setAlarmActive(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch(e) {}
      audioContextRef.current = null;
    }
  }, []);

  // Format time remaining as MM:SS
  const formatTime = useCallback(() => {
    if (timeRemaining === null) return '--:--';
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [timeRemaining]);

  return {
    timeRemaining,
    isExpired,
    alarmActive,
    formatTime,
    stopAlarm,
    playAlarm,
  };
}

// Helper to unlock audio context on user interaction
export function unlockAudio() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  } catch (e) {
    // Ignore errors
  }
}
