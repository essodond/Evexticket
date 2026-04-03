/**
 * Safely parses a JSON string. Returns `null` on any error instead of throwing.
 */
export function safeJsonParse<T = unknown>(value: string | null): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Reads and parses an item from localStorage.
 * Returns `null` if the key is absent or the value is not valid JSON.
 */
export function readLocalStorage<T = unknown>(key: string): T | null {
  try {
    return safeJsonParse<T>(localStorage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * Writes a value to localStorage as JSON.
 * Silently ignores errors (e.g., storage quota exceeded, private mode).
 */
export function writeLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

/**
 * Removes one or more keys from localStorage.
 * Silently ignores errors.
 */
export function removeLocalStorage(...keys: string[]): void {
  try {
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}
