import { describe, expect, it } from 'vitest';

import { assertJsonBodyHasNoUnsafeIntegers, assertNoUnsafeIntegers } from './safeIntegers';

describe('CockroachDB safe integer guards', () => {
  const largeId = '1200803787052744701';

  it('accepts large IDs represented as decimal strings', () => {
    expect(() => assertNoUnsafeIntegers({ departure_city: largeId }, 'réponse')).not.toThrow();
    expect(() => assertJsonBodyHasNoUnsafeIntegers(JSON.stringify({ departure_city: largeId }))).not.toThrow();
  });

  it('rejects integers that JavaScript cannot represent exactly', () => {
    const roundedId = Number(largeId);

    expect(Number.isSafeInteger(roundedId)).toBe(false);
    expect(() => assertNoUnsafeIntegers({ departure_city: roundedId }, 'réponse'))
      .toThrow(/CockroachDB doivent être transmis sous forme de chaînes/);
    expect(() => assertJsonBodyHasNoUnsafeIntegers(JSON.stringify({ departure_city: roundedId })))
      .toThrow(/CockroachDB doivent être transmis sous forme de chaînes/);
  });

  it('keeps normal counters and monetary values as numbers', () => {
    expect(() => assertNoUnsafeIntegers({ count: 42, price: 7500 }, 'réponse')).not.toThrow();
  });
});
