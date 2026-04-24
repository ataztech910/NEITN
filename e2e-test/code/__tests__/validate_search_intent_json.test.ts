import { describe, expect, it } from 'vitest';
import { validateSearchIntentJson } from '../validate_search_intent_json';

describe('validateSearchIntentJson', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = validateSearchIntentJson(input);

    expect(result).toEqual(input);
  });
});
