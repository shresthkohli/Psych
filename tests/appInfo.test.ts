import { describe, it, expect } from 'vitest';
import { APP_INFO } from '../src/constants/appInfo';

describe('APP_INFO branding configuration', () => {
  it('sets APP_INFO.NAME to PSYCH', () => {
    expect(APP_INFO.NAME).toBe('PSYCH');
  });

  it('ensures no APP_INFO value is empty', () => {
    const entries = Object.entries(APP_INFO);
    expect(entries.length).toBeGreaterThan(0);
    for (const [key, value] of entries) {
      expect(typeof value).toBe('string');
      expect(value.trim().length, `Expected APP_INFO.${key} to be non-empty`).toBeGreaterThan(0);
    }
  });
});

