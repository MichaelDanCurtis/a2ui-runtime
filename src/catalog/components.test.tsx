import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { catalog } from './index.tsx';
import { mountRuntime } from '../host';
import { validateDocument } from '../validate';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function renderEntry(node: any): { container: HTMLElement; unmount: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const { createRoot: cr } = require('react-dom/client');
  let root: any;
  act(() => { root = cr(container); root.render(node); });
  return {
    container,
    unmount: () => { act(() => root.unmount()); document.body.removeChild(container); },
  };
}

const emptyCtx = { state: {}, emit: () => {}, getComponent: () => undefined, renderChild: () => null } as any;

// ─── table ────────────────────────────────────────────────────────────────────

describe('table catalog entry', () => {
  it('is registered', () => expect(catalog['table']).toBeDefined());

  it('renders header and rows from inline props', () => {
    const entry = catalog['table']!;
    const node = entry.render(
      { id: 't1', props: { columns: ['Name', 'Score'], rows: [['Alice', 90], ['Bob', 85]] } },
      emptyCtx,
    );
    const { container, unmount } = renderEntry(node);
    const ths = container.querySelectorAll('th');
    expect(ths.length).toBe(2);
    expect(ths[0].textContent).toBe('Name');
    const tds = container.querySelectorAll('td');
    expect(tds.length).toBe(4);
    unmount();
  });

  it('renders rows from ctx.state when bind is set', () => {
    const entry = catalog['table']!;
    const ctx = { ...emptyCtx, state: { myRows: [['X', 1], ['Y', 2], ['Z', 3]] } };
    const node = entry.render(
      { id: 't2', props: { columns: ['A', 'B'], bind: 'myRows' } },
      ctx,
    );
    const { container, unmount } = renderEntry(node);
    expect(container.querySelectorAll('tr').length).toBe(4); // 1 header + 3 rows
    unmount();
  });
});

describe('table STATE_DELTA re-render', () => {
  it('updates rows when STATE_DELTA changes bound key', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    await act(async () => {
      mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    });
    const doc = {
      version: 1, surfaceId: 's1', root: 'tbl1',
      components: { tbl1: { id: 'tbl1', type: 'table', props: { columns: ['A', 'B'], bind: 'rows' } } },
    };
    await act(async () => { handler({ type: 'RENDER', doc }); });
    expect(root.querySelectorAll('td').length).toBe(0);
    await act(async () => {
      handler({ type: 'STATE_DELTA', surfaceId: 's1', patch: [{ op: 'add', path: '/rows', value: [['a', 1], ['b', 2]] }] });
    });
    expect(root.querySelectorAll('td').length).toBe(4);
    document.body.removeChild(root);
  });
});

// ─── progress ─────────────────────────────────────────────────────────────────

describe('progress catalog entry', () => {
  it('is registered', () => expect(catalog['progress']).toBeDefined());

  it('renders fill width matching value/max %', () => {
    const entry = catalog['progress']!;
    const node = entry.render(
      { id: 'p1', props: { value: 40, max: 200, label: 'Loading' } },
      emptyCtx,
    );
    const { container, unmount } = renderEntry(node);
    const fill = container.querySelector('.a2ui-progress-fill') as HTMLElement;
    expect(fill).not.toBeNull();
    expect(fill.style.width).toMatch(/^20(\.0)?%$/);
    expect(container.textContent).toContain('Loading');
    unmount();
  });

  it('clamps value above max to 100%', () => {
    const entry = catalog['progress']!;
    const node = entry.render({ id: 'p2', props: { value: 150, max: 100 } }, emptyCtx);
    const { container, unmount } = renderEntry(node);
    const fill = container.querySelector('.a2ui-progress-fill') as HTMLElement;
    expect(fill.style.width).toMatch(/^100(\.0)?%$/);
    unmount();
  });

  it('reads value from ctx.state when bind is set', () => {
    const entry = catalog['progress']!;
    const ctx = { ...emptyCtx, state: { prog: 75 } };
    const node = entry.render({ id: 'p3', props: { value: 0, bind: 'prog', max: 100 } }, ctx);
    const { container, unmount } = renderEntry(node);
    const fill = container.querySelector('.a2ui-progress-fill') as HTMLElement;
    expect(fill.style.width).toMatch(/^75(\.0)?%$/);
    unmount();
  });
});

describe('progress STATE_DELTA re-render', () => {
  it('updates fill width when STATE_DELTA changes bound key', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    await act(async () => {
      mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    });
    const doc = {
      version: 1, surfaceId: 's1', root: 'pr1',
      components: { pr1: { id: 'pr1', type: 'progress', props: { value: 0, bind: 'pct' } } },
    };
    await act(async () => { handler({ type: 'RENDER', doc }); });
    await act(async () => {
      handler({ type: 'STATE_DELTA', surfaceId: 's1', patch: [{ op: 'add', path: '/pct', value: 60 }] });
    });
    const fill = root.querySelector('.a2ui-progress-fill') as HTMLElement;
    expect(fill.style.width).toMatch(/^60(\.0)?%$/);
    document.body.removeChild(root);
  });
});

// ─── status ───────────────────────────────────────────────────────────────────

describe('status catalog entry', () => {
  it('is registered', () => expect(catalog['status']).toBeDefined());

  const states = ['success', 'warning', 'error', 'info', 'running'] as const;
  for (const s of states) {
    it(`renders ${s} state with label`, () => {
      const entry = catalog['status']!;
      const node = entry.render({ id: `st-${s}`, props: { state: s, label: s.toUpperCase() } }, emptyCtx);
      const { container, unmount } = renderEntry(node);
      expect(container.querySelector(`.a2ui-status--${s}`)).not.toBeNull();
      expect(container.textContent).toContain(s.toUpperCase());
      unmount();
    });
  }
});

// ─── image ───────────────────────────────────────────────────────────────────

describe('image catalog entry', () => {
  it('is registered', () => expect(catalog['image']).toBeDefined());

  it('renders img with src and alt', () => {
    const entry = catalog['image']!;
    const node = entry.render(
      { id: 'img1', props: { src: 'https://example.com/img.png', alt: 'Example' } },
      emptyCtx,
    );
    const { container, unmount } = renderEntry(node);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('https://example.com/img.png');
    expect(img!.getAttribute('alt')).toBe('Example');
    unmount();
  });

  it('renders img with optional width and height', () => {
    const entry = catalog['image']!;
    const node = entry.render(
      { id: 'img2', props: { src: 'data:image/png;base64,abc', width: 120, height: 80 } },
      emptyCtx,
    );
    const { container, unmount } = renderEntry(node);
    const img = container.querySelector('img');
    expect(img!.getAttribute('width')).toBe('120');
    expect(img!.getAttribute('height')).toBe('80');
    unmount();
  });
});

// ─── chart area variant ───────────────────────────────────────────────────────

describe('chart area variant', () => {
  it('renders for kind=area with data points', () => {
    const entry = catalog['chart']!;
    const node = entry.render(
      { id: 'ca1', props: { kind: 'area', data: [10, 20, 30] } },
      emptyCtx,
    );
    const { container, unmount } = renderEntry(node);
    expect(container.querySelector('.a2ui-chart--area')).not.toBeNull();
    expect(container.querySelector('polyline')).not.toBeNull();
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    unmount();
  });

  it('renders area chart via bind with STATE_DELTA', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    await act(async () => {
      mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    });
    const doc = {
      version: 1, surfaceId: 's1', root: 'ac1',
      components: { ac1: { id: 'ac1', type: 'chart', props: { kind: 'area', bind: 'vals' } } },
    };
    await act(async () => { handler({ type: 'RENDER', doc }); });
    await act(async () => {
      handler({ type: 'STATE_DELTA', surfaceId: 's1', patch: [{ op: 'add', path: '/vals', value: [1, 4, 2, 8] }] });
    });
    const polyline = root.querySelector('polyline');
    expect(polyline).not.toBeNull();
    const pts = polyline!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean);
    expect(pts).toHaveLength(4);
    document.body.removeChild(root);
  });
});

// ─── validateDocument with all new types ──────────────────────────────────────

describe('validateDocument with new component types', () => {
  it('validates a document containing table, progress, status, image, and area chart', () => {
    const doc = {
      version: 1,
      surfaceId: 'showcase',
      root: 'root',
      components: {
        root: { id: 'root', type: 'card', props: { title: 'Kit', children: ['tbl', 'prg', 'st1', 'st2', 'img', 'cht'] } },
        tbl: { id: 'tbl', type: 'table', props: { columns: ['A', 'B'], rows: [['x', 1]] } },
        prg: { id: 'prg', type: 'progress', props: { value: 50, label: 'Half' } },
        st1: { id: 'st1', type: 'status', props: { state: 'success', label: 'OK' } },
        st2: { id: 'st2', type: 'status', props: { state: 'running', label: 'Working' } },
        img: { id: 'img', type: 'image', props: { src: 'https://example.com/img.png', alt: 'demo' } },
        cht: { id: 'cht', type: 'chart', props: { kind: 'area', data: [1, 2, 3] } },
      },
    };
    const result = validateDocument(doc as any);
    expect(result.ok).toBe(true);
  });
});
