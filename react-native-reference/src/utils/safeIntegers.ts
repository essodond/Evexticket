const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

export const assertNoUnsafeIntegers = (
  value: unknown,
  context: 'requête' | 'réponse',
  path = '$',
): void => {
  if (typeof value === 'number' && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    throw new Error(
      `Identifiant entier imprécis détecté dans la ${context} API (${path}). ` +
      'Les identifiants CockroachDB doivent être transmis sous forme de chaînes.',
    );
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnsafeIntegers(item, context, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      assertNoUnsafeIntegers(item, context, `${path}.${key}`);
    });
  }
};

export const assertJsonBodyHasNoUnsafeIntegers = (body: unknown): void => {
  if (typeof body !== 'string' || body.length === 0) return;

  try {
    assertNoUnsafeIntegers(JSON.parse(body), 'requête');
  } catch (error) {
    if (error instanceof SyntaxError) return;
    throw error;
  }
};
