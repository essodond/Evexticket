import { describe, it, expect, beforeEach, vi } from 'vitest';
import { safeJsonParse, readLocalStorage, writeLocalStorage, removeLocalStorage } from '../storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorageMock.clear());

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null for null input', () => {
    expect(safeJsonParse(null)).toBeNull();
  });

  it('returns null for invalid JSON without throwing', () => {
    expect(safeJsonParse('not-json{')).toBeNull();
  });

  it('parses arrays', () => {
    expect(safeJsonParse<number[]>('[1,2,3]')).toEqual([1, 2, 3]);
  });
});

describe('readLocalStorage', () => {
  it('returns parsed value when key exists', () => {
    localStorage.setItem('testKey', JSON.stringify({ x: 42 }));
    expect(readLocalStorage<{ x: number }>('testKey')).toEqual({ x: 42 });
  });

  it('returns null when key is absent', () => {
    expect(readLocalStorage('missing')).toBeNull();
  });

  it('returns null when stored value is corrupt JSON', () => {
    localStorage.setItem('bad', '{corrupt');
    expect(readLocalStorage('bad')).toBeNull();
  });
});

describe('writeLocalStorage', () => {
  it('stores JSON-serialized value', () => {
    writeLocalStorage('key', { city: 'Lomé' });
    expect(localStorage.getItem('key')).toBe('{"city":"Lomé"}');
  });

  it('does not throw on non-serializable values', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => writeLocalStorage('circ', circular)).not.toThrow();
  });
});

describe('removeLocalStorage', () => {
  it('removes one key', () => {
    localStorage.setItem('k1', 'v1');
    removeLocalStorage('k1');
    expect(localStorage.getItem('k1')).toBeNull();
  });

  it('removes multiple keys at once', () => {
    localStorage.setItem('a', '1');
    localStorage.setItem('b', '2');
    removeLocalStorage('a', 'b');
    expect(localStorage.getItem('a')).toBeNull();
    expect(localStorage.getItem('b')).toBeNull();
  });

  it('does not throw when key does not exist', () => {
    expect(() => removeLocalStorage('nonexistent')).not.toThrow();
  });
});
