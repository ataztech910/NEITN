import { describe, expect, it } from 'vitest';
import { validateSeoKeywordsJson } from '../validate_seo_keywords_json';

describe('validateSeoKeywordsJson', () => {
  it('returns transformed data', () => {
    const input = { ok: true };
    const result = validateSeoKeywordsJson(input);

    expect(result).toEqual(input);
  });
});
