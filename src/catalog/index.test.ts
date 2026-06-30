import { describe, it, expect } from 'vitest';
import { catalog, getCatalogDescriptions } from './index.tsx';

describe('catalog registry', () => {
  it('exposes a text entry with schema + description', () => {
    expect(catalog.text).toBeDefined();
    expect(catalog.text.description.length).toBeGreaterThan(0);
  });
  it('getCatalogDescriptions returns one row per registered type', () => {
    const rows = getCatalogDescriptions();
    expect(rows.map(r => r.type)).toContain('text');
  });
});
