import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { mountRuntime } from './host';
import { validateDocument } from './validate';
import type { HostToInsetMessage, InsetToHostMessage } from './protocol';

// Tell React 18 that this is an act()-aware test environment.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Transport spy (mirrors the existing grid.test.tsx idiom) ──────────────────
// Records every InsetToHostMessage the runtime posts and lets the test drive
// HostToInsetMessages back into the runtime via `send`.
function makeTransport() {
  const posts: InsetToHostMessage[] = [];
  let handler: (m: HostToInsetMessage) => void = () => {};
  return {
    postMessage: (m: InsetToHostMessage) => posts.push(m),
    onMessage: (cb: (m: HostToInsetMessage) => void) => { handler = cb; },
    send: (m: HostToInsetMessage) => handler(m),
    posts,
  };
}

/**
 * One rich, cohesive A2UI document exercising the whole catalog in a single
 * tree: a card → container holding a table (bind), an area chart (bind), a grid
 * (bind + binding for interaction), a status, and a progress (bind). This is the
 * full-doc render E2E: it proves RENDER paints the structure, a STATE_DELTA to a
 * bound key updates the bound components, and a grid cell click posts an
 * INTERACTION carrying the cellId — all through the public mountRuntime seam.
 */
const RICH_DOC = {
  version: 1,
  surfaceId: 'e2e-surface',
  root: 'root',
  components: {
    root: { id: 'root', type: 'card', props: { title: 'E2E Showcase', children: ['col'] } },
    col: { id: 'col', type: 'container', props: { direction: 'vertical', children: ['tbl', 'cht', 'grd', 'sts', 'prg'] } },
    tbl: { id: 'tbl', type: 'table', props: { columns: ['Name', 'Score'], bind: 'rows' } },
    cht: { id: 'cht', type: 'chart', props: { kind: 'area', bind: 'series', title: 'Trend' } },
    grd: { id: 'grd', type: 'grid', props: { rows: 2, cols: 2, bind: 'seats', binding: { target: 'agent', action: 'pick-seat' } } },
    sts: { id: 'sts', type: 'status', props: { state: 'running', label: 'Working' } },
    prg: { id: 'prg', type: 'progress', props: { value: 0, max: 100, bind: 'pct' } },
  },
} as const;

describe('A2UI runtime full-doc render E2E', () => {
  it('renders a rich document, updates bound components on STATE_DELTA, and posts INTERACTION on grid click', async () => {
    // The doc must be valid up front — the same validateDocument used by the
    // extension before it ever reaches the runtime.
    expect(validateDocument(RICH_DOC as any)).toEqual({ ok: true });

    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    // ── Mount + RENDER: the runtime paints the whole structure ──────────────
    await act(async () => { mountRuntime(root, t); });
    await act(async () => { t.send({ type: 'RENDER', doc: RICH_DOC as any }); });

    // Structure painted: card title, status pill, every catalog node present.
    expect(root.textContent).toContain('E2E Showcase');
    expect(root.querySelector('.a2ui-card')).not.toBeNull();
    expect(root.querySelector('.a2ui-status--running')).not.toBeNull();
    expect(root.textContent).toContain('Working');
    expect(root.querySelector('.a2ui-chart--area')).not.toBeNull();
    // Grid painted: 2x2 = 4 cells, all available, none taken yet.
    expect(root.querySelectorAll('.a2ui-grid-cell').length).toBe(4);
    // Table + progress are bound but unset → no rows, fill at 0%.
    expect(root.querySelectorAll('td').length).toBe(0);
    expect((root.querySelector('.a2ui-progress-fill') as HTMLElement).style.width).toMatch(/^0(\.0)?%$/);

    // The runtime posts READY on mount (the host→inset RENDER handshake seam).
    expect(t.posts.some(m => m.type === 'READY')).toBe(true);

    // ── STATE_DELTA: a single delta updates table rows, chart, and progress ──
    await act(async () => {
      t.send({
        type: 'STATE_DELTA',
        surfaceId: 'e2e-surface',
        patch: [
          { op: 'add', path: '/rows', value: [['Alice', 90], ['Bob', 85], ['Cara', 77]] },
          { op: 'add', path: '/series', value: [10, 40, 25, 60, 35] },
          { op: 'add', path: '/pct', value: 60 },
        ],
      });
    });

    // Table now has 3 rows × 2 cols = 6 <td>.
    expect(root.querySelectorAll('td').length).toBe(6);
    // Area chart polyline now has one point per series value.
    const polyline = root.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean)).toHaveLength(5);
    // Progress fill reflects the bound value.
    expect((root.querySelector('.a2ui-progress-fill') as HTMLElement).style.width).toMatch(/^60(\.0)?%$/);

    // ── INTERACTION: a grid cell click posts INTERACTION carrying the cellId ─
    const postsBefore = t.posts.length;
    const cell = root.querySelector('[data-cell-id="r1c0"]') as HTMLButtonElement;
    expect(cell).not.toBeNull();
    await act(async () => { cell.click(); });

    const interactions = t.posts
      .slice(postsBefore)
      .filter((m): m is Extract<InsetToHostMessage, { type: 'INTERACTION' }> => m.type === 'INTERACTION');
    expect(interactions).toHaveLength(1);
    expect(interactions[0].surfaceId).toBe('e2e-surface');
    expect(interactions[0].componentId).toBe('r1c0');
    expect(interactions[0].binding).toBe('agent');
    expect(interactions[0].action).toBe('pick-seat');
    expect(interactions[0].payload).toEqual({ cellId: 'r1c0' });

    // Optimistic local flip: the clicked available cell shows selected immediately.
    expect((root.querySelector('[data-cell-id="r1c0"]') as HTMLButtonElement).className)
      .toContain('a2ui-grid-cell--selected');

    document.body.removeChild(root);
  });
});
