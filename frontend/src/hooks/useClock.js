// useClock Hook - Live clock with 1-second interval updates
import { useState, useEffect } from 'react';

/**
 * Returns the current Date, updated every second.
 * Cleans up the interval on unmount.
 *
 * @returns {Date} current date/time
 */
export function useClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}
