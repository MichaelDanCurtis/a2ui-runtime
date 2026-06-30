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

  // ─── Document-level target field ───────────────────────────────────────────

  it('accepts a doc with target: panel', () => {
    expect(validateDocument({ ...good, target: 'panel' } as any)).toEqual({ ok: true });
  });
  it('accepts a doc with an absent target', () => {
    expect(validateDocument(good as any)).toEqual({ ok: true });
  });
  it('rejects a doc with a bogus target', () => {
    expect(validateDocument({ ...good, target: 'bogus' } as any).ok).toBe(false);
  });

  // ─── Live-feed demo doc (the LIVE self-updating chart payload) ──────────────

  const liveDemoDoc = {
    version: 1,
    surfaceId: 'live-demo',
    root: 'card1',
    components: {
      card1: { id: 'card1', type: 'card', props: { title: 'Live feed', children: ['chart1'] } },
      chart1: { id: 'chart1', type: 'chart', props: { bind: 'series', kind: 'line', title: 'Throughput' } },
    },
    live: { stateKey: 'series', source: 'demo', intervalMs: 1000 },
  };

  it('accepts the live-feed demo doc (chart bound to state + live binding)', () => {
    expect(validateDocument(liveDemoDoc as any)).toEqual({ ok: true });
  });

  it('rejects a live binding with a bad source', () => {
    const bad = { ...liveDemoDoc, live: { stateKey: 'series', source: 'nope' } };
    expect(validateDocument(bad as any).ok).toBe(false);
  });

  it('rejects a live binding missing stateKey', () => {
    const bad = { ...liveDemoDoc, live: { source: 'demo' } };
    expect(validateDocument(bad as any).ok).toBe(false);
  });

  it('rejects a live binding with a non-positive intervalMs', () => {
    const bad = { ...liveDemoDoc, live: { stateKey: 'series', source: 'demo', intervalMs: 0 } };
    expect(validateDocument(bad as any).ok).toBe(false);
  });

  // ─── Untrusted-document size/count/depth caps (DoS guard) ───────────────────

  it('rejects a doc exceeding the component count cap', () => {
    const components: Record<string, unknown> = {
      root: { id: 'root', type: 'text', props: { value: 'hi' } },
    };
    for (let i = 0; i < 600; i++) {
      components[`t${i}`] = { id: `t${i}`, type: 'text', props: { value: 'x' } };
    }
    const doc = { version: 1, surfaceId: 's', root: 'root', components };
    const r = validateDocument(doc as any);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.some(e => /component count/.test(e))).toBe(true);
  });

  it('rejects an over-long string prop', () => {
    const doc = {
      version: 1, surfaceId: 's', root: 't1',
      components: { t1: { id: 't1', type: 'text', props: { value: 'a'.repeat(10_001) } } },
    };
    const r = validateDocument(doc as any);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.some(e => /out of bounds/.test(e))).toBe(true);
  });

  it('rejects an over-long array prop', () => {
    const big = Array.from({ length: 5_001 }, (_, i) => String(i));
    const doc = {
      version: 1, surfaceId: 's', root: 'g1',
      components: { g1: { id: 'g1', type: 'grid', props: { rows: 1, cols: 1, cellLabels: big } } },
    };
    const r = validateDocument(doc as any);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors.some(e => /out of bounds|array length/.test(e))).toBe(true);
  });

  it('rejects a grid whose rows/cols exceed the schema cap', () => {
    const doc = {
      version: 1, surfaceId: 's', root: 'g1',
      components: { g1: { id: 'g1', type: 'grid', props: { rows: 100000, cols: 100000 } } },
    };
    expect(validateDocument(doc as any).ok).toBe(false);
  });

  it('accepts a 5x6 seat grid within the new caps', () => {
    const doc = {
      version: 1, surfaceId: 's', root: 'g1',
      components: { g1: { id: 'g1', type: 'grid', props: { rows: 5, cols: 6, binding: { target: 'mcp', action: 'pick-seat' } } } },
    };
    expect(validateDocument(doc as any)).toEqual({ ok: true });
  });
});
