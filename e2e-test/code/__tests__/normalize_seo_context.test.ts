import { describe, expect, it } from 'vitest';
import { normalizeSeoContext } from '../normalize_seo_context';

describe('normalizeSeoContext', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = normalizeSeoContext(input);

    expect(result).toEqual(input);
  });
});
