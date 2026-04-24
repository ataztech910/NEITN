import { describe, expect, it } from 'vitest';
import { ideaFraming } from '../idea_framing';

describe('ideaFraming', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = ideaFraming(input);

    expect(result).toEqual(input);
  });
});
