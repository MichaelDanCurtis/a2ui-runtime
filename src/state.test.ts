import { describe, it, expect } from 'vitest';
import { applyStateDelta } from './state';

describe('applyStateDelta', () => {
  it('applies an add operation immutably', () => {
    const before = { a: 1 };
    const r = applyStateDelta(before, [{ op: 'add', path: '/b', value: 2 }]);
    expect('state' in r && r.state).toEqual({ a: 1, b: 2 });
    expect(before).toEqual({ a: 1 }); // original untouched
  });
  it('returns an error for a malformed patch', () => {
    const r = applyStateDelta({}, [{ op: 'replace', path: '/missing', value: 1 }] as any);
    expect('error' in r).toBe(true);
  });

  it('rejects a prototype-pollution patch and leaves Object.prototype safe', () => {
    const r = applyStateDelta({}, [{ op: 'add', path: '/__proto__/polluted', value: 1 }] as any);
    expect('error' in r).toBe(true);
    expect(({} as any).polluted).toBeUndefined();
    expect((Object.prototype as any).polluted).toBeUndefined();
  });

  it('rejects constructor/prototype path segments too', () => {
    const r1 = applyStateDelta({}, [{ op: 'add', path: '/constructor/x', value: 1 }] as any);
    const r2 = applyStateDelta({}, [{ op: 'add', path: '/a/prototype/x', value: 1 }] as any);
    expect('error' in r1).toBe(true);
    expect('error' in r2).toBe(true);
  });
});
