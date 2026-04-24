import { describe, expect, it } from 'vitest';
import { validateProductJson } from '../validate_product_json';

describe('validateProductJson', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = validateProductJson(input);

    expect(result).toEqual(input);
  });
});
