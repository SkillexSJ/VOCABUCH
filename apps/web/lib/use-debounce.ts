import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after
 * the user stops typing for `delayMs` milliseconds.
 *
 * Use the raw value for the input (instant feedback) and the
 * debounced value for API calls (avoids a request per keystroke).
 */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // cancel if value changes before delay
  }, [value, delayMs]);

  return debounced;
}
