import { describe, expect, it } from 'vitest';
import { validatePackagingJson } from '../validate_packaging_json';

describe('validatePackagingJson', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = validatePackagingJson(input);

    expect(result).toEqual(input);
  });
});
