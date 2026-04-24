import { describe, expect, it } from 'vitest';
import { assembleFinalResponse } from '../assemble_final_response';

describe('assembleFinalResponse', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = assembleFinalResponse(input);

    expect(result).toEqual(input);
  });
});
