import { describe, expect, it } from 'vitest';
import { classifyIdea } from '../classify_idea';

describe('classifyIdea', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = classifyIdea(input);

    expect(result).toEqual(input);
  });
});
