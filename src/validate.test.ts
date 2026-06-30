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
});
