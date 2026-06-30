import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { mountRuntime } from './host';

// Tell React 18 that this is an act()-aware test environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const doc = { version: 1, surfaceId: 's', root: 't', components: { t: { id: 't', type: 'text', props: { value: 'hi' } } } };

describe('mountRuntime', () => {
  it('renders the catalog tree and posts READY', async () => {
    const root = document.createElement('div');
    const posts: any[] = []; let handler: any;
    mountRuntime(root, { postMessage: m => posts.push(m), onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    expect(root.textContent).toContain('hi');
    expect(posts.some(p => p.type === 'READY')).toBe(true);
  });
});
