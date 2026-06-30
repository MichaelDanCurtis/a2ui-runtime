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
});
