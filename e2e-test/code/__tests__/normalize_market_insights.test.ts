import { describe, expect, it } from 'vitest';
import { normalizeMarketInsights } from '../normalize_market_insights';

describe('normalizeMarketInsights', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = normalizeMarketInsights(input);

    expect(result).toEqual(input);
  });
});
