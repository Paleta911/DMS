// Debounce hook: delay value updates to reduce expensive operations (search, filter, etc.) during rapid changes
import { useEffect, useState } from "react";

// Returns debounced value with optional delay (default 300ms); cleans up timers to prevent memory leaks
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
