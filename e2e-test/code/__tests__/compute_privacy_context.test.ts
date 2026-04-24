import { describe, expect, it } from 'vitest';
import { computePrivacyContext } from '../compute_privacy_context';

describe('computePrivacyContext', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = computePrivacyContext(input);

    expect(result).toEqual(input);
  });
});
