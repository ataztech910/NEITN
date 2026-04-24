import { describe, expect, it } from 'vitest';
import { normalizeInput } from '../normalize_input';

describe('normalizeInput', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = normalizeInput(input);

    expect(result).toEqual(input);
  });
});
