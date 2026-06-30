import { describe, it, expect } from 'vitest';
import { A2uiDocument } from './types';

describe('A2uiDocument shape', () => {
  it('constructs a minimal valid document', () => {
    const doc: A2uiDocument = {
      version: 1, surfaceId: 's1', root: 'card1',
      components: { card1: { id: 'card1', type: 'card', props: { title: 'Hi' }, children: [] } },
    };
    expect(doc.components[doc.root].type).toBe('card');
  });
});
