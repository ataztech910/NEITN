import { describe, expect, it } from 'vitest';
import { validateFinalDecisionJson } from '../validate_final_decision_json';

describe('validateFinalDecisionJson', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = validateFinalDecisionJson(input);

    expect(result).toEqual(input);
  });
});
