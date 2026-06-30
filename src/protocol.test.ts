import { describe, it, expect } from 'vitest';
import { isHostToInset, isInsetToHost, HostToInsetMessage, InsetToHostMessage } from './protocol';

describe('protocol guards', () => {
  it('accepts a valid RENDER message as host→inset', () => {
    const msg: HostToInsetMessage = { type: 'RENDER', doc: { version: 1, surfaceId: 's1', root: 'r', components: {} } };
    expect(isHostToInset(msg)).toBe(true);
    expect(isInsetToHost(msg)).toBe(false);
  });
  it('accepts a valid INTERACTION message as inset→host (carries binding target + action)', () => {
    const msg: InsetToHostMessage = { type: 'INTERACTION', surfaceId: 's1', componentId: 'b1', binding: 'mcp', action: 'refresh', payload: {} };
    expect(isInsetToHost(msg)).toBe(true);
    expect(msg.action).toBe('refresh');
  });
  it('rejects an unknown type', () => {
    expect(isHostToInset({ type: 'NOPE' } as any)).toBe(false);
  });
});
