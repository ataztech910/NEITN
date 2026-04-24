import { describe, expect, it } from 'vitest';
import { computeRoiEstimate } from '../compute_roi_estimate';

describe('computeRoiEstimate', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = computeRoiEstimate(input);

    expect(result).toEqual(input);
  });
});
