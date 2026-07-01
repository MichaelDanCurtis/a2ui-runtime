import { describe, it, expect } from 'vitest';
// The examples are authored as plain ESM doc objects (no build step) so the
// gallery IIFE can import them directly. We import the same file here and assert
// every doc passes the very validator the runtime runs on RENDER — so a bad
// example can never ship green.
// @ts-expect-error - plain .js module without type declarations
import { examples } from './examples.js';
import { validateDocument } from '../src/validate';
import type { A2uiDocument } from '../src/types';

interface Example { id: string; title: string; blurb: string; doc: A2uiDocument; live?: { stateKey: string; intervalMs?: number } }

describe('gallery examples', () => {
  const set = examples as Example[];

  it('is a non-empty ordered list with unique ids', () => {
    expect(set.length).toBeGreaterThanOrEqual(6);
    const ids = set.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(examples as Example[])('example "$id" validates', (ex) => {
    const res = validateDocument(ex.doc);
    if (!res.ok) {
      throw new Error(`example "${ex.id}" failed validation:\n- ${res.errors.join('\n- ')}`);
    }
    expect(res.ok).toBe(true);
  });

  it('each example has title + blurb metadata', () => {
    for (const ex of set) {
      expect(typeof ex.title).toBe('string');
      expect(ex.title.length).toBeGreaterThan(0);
      expect(typeof ex.blurb).toBe('string');
      expect(ex.blurb.length).toBeGreaterThan(0);
    }
  });

  it('live examples declare a matching doc.live binding', () => {
    for (const ex of set) {
      if (ex.live) {
        expect(ex.doc.live).toBeDefined();
        expect(ex.doc.live!.stateKey).toBe(ex.live.stateKey);
      }
    }
  });
});
