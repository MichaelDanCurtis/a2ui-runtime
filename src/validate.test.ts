import { describe, it, expect } from 'vitest';
import { validateDocument } from './validate';

const good = { version: 1, surfaceId: 's', root: 't1', components: { t1: { id: 't1', type: 'text', props: { value: 'hi' } } } };

describe('validateDocument', () => {
  it('accepts a doc whose components match catalog schemas', () => {
    expect(validateDocument(good as any)).toEqual({ ok: true });
  });
  it('rejects an unknown component type', () => {
    const bad = { ...good, components: { t1: { id: 't1', type: 'wat', props: {} } } };
    const r = validateDocument(bad as any);
    expect(r.ok).toBe(false);
  });
  it('rejects props failing the component schema', () => {
    const bad = { ...good, components: { t1: { id: 't1', type: 'text', props: { value: 42 } } } };
    expect(validateDocument(bad as any).ok).toBe(false);
  });
  it('rejects a missing root reference', () => {
    expect(validateDocument({ ...good, root: 'nope' } as any).ok).toBe(false);
  });
});
