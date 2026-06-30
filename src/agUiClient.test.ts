import { describe, it, expect } from 'vitest';
import { AgUiClient } from './agUiClient';

const doc = { version: 1, surfaceId: 's', root: 't', components: { t: { id: 't', type: 'text', props: { value: 'hi' } } } };

describe('AgUiClient', () => {
  it('stores a doc on RENDER and notifies subscribers', () => {
    const c = new AgUiClient(); let n = 0; c.subscribe(() => n++);
    c.handle({ type: 'RENDER', doc: doc as any });
    expect(c.doc?.surfaceId).toBe('s'); expect(n).toBe(1);
  });
  it('mutates state on STATE_DELTA', () => {
    const c = new AgUiClient(); c.handle({ type: 'RENDER', doc: doc as any });
    c.handle({ type: 'STATE_DELTA', surfaceId: 's', patch: [{ op: 'add', path: '/series', value: [1, 2] }] });
    expect(c.state.series).toEqual([1, 2]);
  });
  it('ignores a RENDER that fails validation', () => {
    const c = new AgUiClient();
    c.handle({ type: 'RENDER', doc: { ...doc, components: { t: { id: 't', type: 'nope', props: {} } } } as any });
    expect(c.doc).toBeUndefined();
  });
});
