import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function getAllKeys(obj: Record<string, any>, prefix = ''): Set<string> {
  const keys = new Set<string>();
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const childKeys = getAllKeys(v, fullKey);
      childKeys.forEach((key) => keys.add(key));
    } else {
      keys.add(fullKey);
    }
  }
  return keys;
}

describe('Internationalization (i18n) Parity Test', () => {
  const enPath = path.resolve(__dirname, '../../frontend/src/i18n/en.json');
  const hiPath = path.resolve(__dirname, '../../frontend/src/i18n/hi.json');

  it('both en.json and hi.json should exist and be valid JSON', () => {
    expect(fs.existsSync(enPath)).toBe(true);
    expect(fs.existsSync(hiPath)).toBe(true);

    const enContent = fs.readFileSync(enPath, 'utf8');
    const hiContent = fs.readFileSync(hiPath, 'utf8');

    expect(() => JSON.parse(enContent)).not.toThrow();
    expect(() => JSON.parse(hiContent)).not.toThrow();
  });

  it('every translation key in en.json must exist in hi.json with non-empty translation', () => {
    const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

    const enKeys = getAllKeys(en);
    const hiKeys = getAllKeys(hi);

    const missingInHi = [...enKeys].filter((k) => !hiKeys.has(k));
    const missingInEn = [...hiKeys].filter((k) => !enKeys.has(k));

    expect(missingInHi, `Keys present in en.json but missing in hi.json: ${missingInHi.join(', ')}`).toEqual([]);
    expect(missingInEn, `Keys present in hi.json but missing in en.json: ${missingInEn.join(', ')}`).toEqual([]);
    expect(enKeys.size).toBeGreaterThan(400);
    expect(hiKeys.size).toBe(enKeys.size);
  });
});
