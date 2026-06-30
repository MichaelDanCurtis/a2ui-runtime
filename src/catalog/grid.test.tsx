import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { catalog } from './index.tsx';
import { mountRuntime } from '../host';

// Tell React 18 that this is an act()-aware test environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function makeTransport() {
  const posts: any[] = [];
  let handler: (m: any) => void = () => {};
  return {
    postMessage: (m: any) => posts.push(m),
    onMessage: (cb: (m: any) => void) => { handler = cb; },
    send: (m: any) => handler(m),
    posts,
  };
}

describe('grid catalog entry', () => {
  it('is registered in the catalog with a non-empty description', () => {
    expect(catalog['grid']).toBeDefined();
    expect(catalog['grid']!.type).toBe('grid');
    expect(catalog['grid']!.description.length).toBeGreaterThan(0);
  });

  it('description stays prompt-safe (no double quotes, no newlines)', () => {
    const d = catalog['grid']!.description;
    expect(d).not.toContain('"');
    expect(d).not.toContain('\n');
  });

  it('renders rows*cols cells', () => {
    const entry = catalog['grid']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render({ id: 'g1', props: { rows: 3, cols: 4 } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const cells = container.querySelectorAll('.a2ui-grid-cell');
    expect(cells.length).toBe(12);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('returns null without throwing when required props are missing', () => {
    const entry = catalog['grid']!;
    const ctx = { state: {}, emit: () => {} };
    let result: any;
    expect(() => { result = entry.render({ id: 'g2', props: {} }, ctx as any); }).not.toThrow();
    expect(result).toBeNull();
  });

  it('clicking an available cell emits INTERACTION with its cellId', () => {
    const entry = catalog['grid']!;
    const emitted: any[] = [];
    const ctx = { state: {}, emit: (id: string, binding: any, payload: any) => emitted.push({ id, binding, payload }) };
    const node = entry.render(
      { id: 'g3', props: { rows: 2, cols: 2, binding: { target: 'mcp', action: 'pick-seat' } } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const cell = container.querySelector('[data-cell-id="r1c0"]') as HTMLButtonElement;
    expect(cell).not.toBeNull();
    act(() => { cell.click(); });

    expect(emitted.length).toBe(1);
    expect(emitted[0].id).toBe('r1c0');
    expect(emitted[0].binding).toEqual({ target: 'mcp', action: 'pick-seat' });
    expect(emitted[0].payload).toEqual({ cellId: 'r1c0' });

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('a taken cell is disabled and does not emit on click', () => {
    const entry = catalog['grid']!;
    const emitted: any[] = [];
    const ctx = {
      state: { seats: { r0c0: 'taken' } },
      emit: (id: string, binding: any, payload: any) => emitted.push({ id, binding, payload }),
    };
    const node = entry.render(
      { id: 'g4', props: { rows: 2, cols: 2, bind: 'seats', binding: { target: 'mcp', action: 'pick-seat' } } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const taken = container.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    expect(taken).not.toBeNull();
    expect(taken.disabled).toBe(true);
    expect(taken.className).toContain('a2ui-grid-cell--taken');
    act(() => { taken.click(); });
    expect(emitted.length).toBe(0);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('does not emit when binding is unset', () => {
    const entry = catalog['grid']!;
    const emitted: any[] = [];
    const ctx = { state: {}, emit: (id: string, binding: any, payload: any) => emitted.push({ id, binding, payload }) };
    const node = entry.render({ id: 'g5', props: { rows: 1, cols: 1 } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const cell = container.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    act(() => { cell.click(); });
    expect(emitted.length).toBe(0);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('clicking an available cell flips it to selected immediately (no STATE_DELTA)', () => {
    const entry = catalog['grid']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render(
      { id: 'g6', props: { rows: 2, cols: 2, binding: { target: 'agent', action: 'pick-seat' } } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const cell = container.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    expect(cell.className).toContain('a2ui-grid-cell--available');
    act(() => { cell.click(); });

    const after = container.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    expect(after.className).toContain('a2ui-grid-cell--selected');

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('a subsequent STATE_DELTA marking a clicked cell taken overrides local selection (state wins)', async () => {
    const boundDoc = {
      version: 1,
      surfaceId: 's',
      root: 'g',
      components: {
        g: {
          id: 'g',
          type: 'grid',
          props: { rows: 2, cols: 2, bind: 'seats', binding: { target: 'agent', action: 'pick-seat' } },
        },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });
    await act(async () => { t.send({ type: 'RENDER', doc: boundDoc }); });

    // Click optimistically selects r0c0.
    const cell = root.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    await act(async () => { cell.click(); });
    expect((root.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement).className)
      .toContain('a2ui-grid-cell--selected');

    // Authoritative state marks it taken → state wins over local optimism.
    await act(async () => {
      t.send({ type: 'STATE_DELTA', surfaceId: 's', patch: [{ op: 'add', path: '/seats', value: { r0c0: 'taken' } }] });
    });

    const taken = root.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    expect(taken.className).toContain('a2ui-grid-cell--taken');
    expect(taken.disabled).toBe(true);

    document.body.removeChild(root);
  });

  it('taken cells still do not select on click (optimistic path skips them)', () => {
    const entry = catalog['grid']!;
    const emitted: any[] = [];
    const ctx = {
      state: { seats: { r0c0: 'taken' } },
      emit: (id: string, binding: any, payload: any) => emitted.push({ id, binding, payload }),
    };
    const node = entry.render(
      { id: 'g7', props: { rows: 2, cols: 2, bind: 'seats', binding: { target: 'agent', action: 'pick-seat' } } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const taken = container.querySelector('[data-cell-id="r0c0"]') as HTMLButtonElement;
    expect(taken.disabled).toBe(true);
    act(() => { taken.click(); });
    expect(emitted.length).toBe(0);
    expect(taken.className).toContain('a2ui-grid-cell--taken');
    expect(taken.className).not.toContain('a2ui-grid-cell--selected');

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('STATE_DELTA to the bound key recolors a cell (available -> selected)', async () => {
    const boundDoc = {
      version: 1,
      surfaceId: 's',
      root: 'g',
      components: {
        g: {
          id: 'g',
          type: 'grid',
          props: { rows: 2, cols: 2, bind: 'seats', binding: { target: 'mcp', action: 'pick-seat' } },
        },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });
    await act(async () => { t.send({ type: 'RENDER', doc: boundDoc }); });

    // No state yet → all cells available.
    const before = root.querySelector('[data-cell-id="r0c1"]') as HTMLButtonElement;
    expect(before.className).toContain('a2ui-grid-cell--available');

    // STATE_DELTA flips r0c1 to selected.
    await act(async () => {
      t.send({ type: 'STATE_DELTA', surfaceId: 's', patch: [{ op: 'add', path: '/seats', value: { r0c1: 'selected' } }] });
    });

    const after = root.querySelector('[data-cell-id="r0c1"]') as HTMLButtonElement;
    expect(after.className).toContain('a2ui-grid-cell--selected');

    document.body.removeChild(root);
  });
});
