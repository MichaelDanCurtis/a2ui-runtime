import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { catalog } from './index.tsx';
import { mountRuntime } from '../host';
import { AgUiClient } from '../agUiClient';

// Tell React 18 that this is an act()-aware test environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Unit: chart render function ─────────────────────────────────────────────

describe('chart catalog entry', () => {
  const chartEntry = () => catalog['chart'];

  it('is registered in the catalog', () => {
    expect(chartEntry()).toBeDefined();
    expect(chartEntry()!.type).toBe('chart');
    expect(chartEntry()!.description.length).toBeGreaterThan(0);
  });

  it('renders a line chart with 3 data points from ctx.state', () => {
    const entry = chartEntry()!;
    const ctx = {
      state: { series: [1, 2, 3] },
      emit: () => {},
    };
    const node = entry.render({ id: 'c1', props: { dataKey: 'series', kind: 'line' } }, ctx as any);

    // Render to DOM to inspect SVG output
    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    // Line chart: polyline points attribute encodes all data points
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    // Points attribute: "x1,y1 x2,y2 x3,y3" — 3 space-separated pairs
    const pts = polyline!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean);
    expect(pts).toHaveLength(3);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders a bar chart with 3 bars from ctx.state', () => {
    const entry = chartEntry()!;
    const ctx = { state: { bars: [10, 20, 30] }, emit: () => {} };
    const node = entry.render({ id: 'c2', props: { dataKey: 'bars', kind: 'bar' } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(3);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders an empty line chart without throwing when state[dataKey] is missing', () => {
    const entry = chartEntry()!;
    const ctx = { state: {}, emit: () => {} };
    expect(() => {
      entry.render({ id: 'c3', props: { dataKey: 'missing', kind: 'line' } }, ctx as any);
    }).not.toThrow();
  });

  it('renders an empty bar chart without throwing when state[dataKey] is empty array', () => {
    const entry = chartEntry()!;
    const ctx = { state: { empty: [] }, emit: () => {} };
    expect(() => {
      entry.render({ id: 'c4', props: { dataKey: 'empty', kind: 'bar' } }, ctx as any);
    }).not.toThrow();
  });

  it('renders a title when provided', () => {
    const entry = chartEntry()!;
    const ctx = { state: { v: [5, 10] }, emit: () => {} };
    const node = entry.render({ id: 'c5', props: { dataKey: 'v', kind: 'line', title: 'My Chart' } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    expect(container.textContent).toContain('My Chart');

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});

// ─── Integration: STATE_DELTA causes live re-render ──────────────────────────

describe('chart live update via STATE_DELTA', () => {
  const chartDoc = {
    version: 1,
    surfaceId: 's1',
    root: 'chart1',
    components: {
      chart1: { id: 'chart1', type: 'chart', props: { dataKey: 'series', kind: 'line' } },
    },
  };

  it('updates DOM point count when STATE_DELTA replaces the series', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    const posts: any[] = [];
    let handler: (m: any) => void = () => {};

    await act(async () => {
      mountRuntime(root, {
        postMessage: m => posts.push(m),
        onMessage: cb => { handler = cb; },
      });
    });

    // Step 1: RENDER the chart doc (empty state → no points yet)
    await act(async () => {
      handler({ type: 'RENDER', doc: chartDoc });
    });

    const polylineBefore = root.querySelector('polyline');
    // With empty state, polyline may be absent or have 0 points
    const ptsBefore = polylineBefore?.getAttribute('points')?.trim().split(/\s+/).filter(Boolean) ?? [];
    expect(ptsBefore.length).toBe(0);

    // Step 2: STATE_DELTA adds series = [1, 2, 3, 4]
    await act(async () => {
      handler({
        type: 'STATE_DELTA',
        surfaceId: 's1',
        patch: [{ op: 'add', path: '/series', value: [1, 2, 3, 4] }],
      });
    });

    const polylineAfter = root.querySelector('polyline');
    expect(polylineAfter).not.toBeNull();
    const ptsAfter = polylineAfter!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean);
    expect(ptsAfter).toHaveLength(4);

    // Step 3: Another STATE_DELTA replaces with 2 points
    await act(async () => {
      handler({
        type: 'STATE_DELTA',
        surfaceId: 's1',
        patch: [{ op: 'replace', path: '/series', value: [5, 6] }],
      });
    });

    const polylineFinal = root.querySelector('polyline');
    const ptsFinal = polylineFinal!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean);
    expect(ptsFinal).toHaveLength(2);

    document.body.removeChild(root);
  });

  it('renders chart with props.data static fallback when state is empty', () => {
    const entry = catalog['chart']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render(
      { id: 'cs1', props: { dataKey: 'missing', kind: 'line', data: [1, 2, 3] } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    const pts = polyline!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean);
    expect(pts).toHaveLength(3);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('prefers live state over props.data when both present', () => {
    const entry = catalog['chart']!;
    const ctx = { state: { series: [10, 20] }, emit: () => {} };
    const node = entry.render(
      { id: 'cs2', props: { dataKey: 'series', kind: 'bar', data: [1, 2, 3, 4, 5] } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    // Live state has 2 points, static data has 5 — expect 2 bars
    const rects = container.querySelectorAll('rect');
    expect(rects.length).toBe(2);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('AgUiClient state updates correctly with STATE_DELTA for chart data', () => {
    const client = new AgUiClient();
    client.handle({ type: 'RENDER', doc: chartDoc as any });

    // Simulate STATE_DELTA adding series data
    client.handle({
      type: 'STATE_DELTA',
      surfaceId: 's1',
      patch: [{ op: 'add', path: '/series', value: [10, 20, 30] }],
    });

    expect((client.state as any).series).toEqual([10, 20, 30]);

    // Simulate STATE_DELTA replacing series data (live update)
    client.handle({
      type: 'STATE_DELTA',
      surfaceId: 's1',
      patch: [{ op: 'replace', path: '/series', value: [1, 2] }],
    });

    expect((client.state as any).series).toEqual([1, 2]);

    // Assert chart render function produces 2 points for updated state
    const chartEntry = catalog['chart']!;
    const node = chartEntry.render(
      { id: 'chart1', props: { dataKey: 'series', kind: 'line' } },
      { state: client.state, emit: () => {} } as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const polyline = container.querySelector('polyline');
    const pts = polyline!.getAttribute('points')!.trim().split(/\s+/).filter(Boolean);
    expect(pts).toHaveLength(2);

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
