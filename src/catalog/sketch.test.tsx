import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { catalog } from './index.tsx';

// Tell React 18 that this is an act()-aware test environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const SAMPLE_STROKES = ['M20,40 L20,120', 'M50,40 L50,120', 'M20,80 L50,80'];

describe('sketch catalog entry', () => {
  it('is registered in the catalog', () => {
    expect(catalog['sketch']).toBeDefined();
    expect(catalog['sketch']!.type).toBe('sketch');
    expect(catalog['sketch']!.description.length).toBeGreaterThan(0);
  });

  it('renders 3 path elements with pathLength=1 for 3 strokes', () => {
    const entry = catalog['sketch']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render({ id: 's1', props: { strokes: SAMPLE_STROKES } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
    paths.forEach(p => {
      expect(p.getAttribute('pathLength')).toBe('1');
    });

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders zero path elements for empty strokes array', () => {
    const entry = catalog['sketch']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render({ id: 's2', props: { strokes: [] } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(0);

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('returns null without throwing when required strokes prop is missing', () => {
    const entry = catalog['sketch']!;
    const ctx = { state: {}, emit: () => {} };
    let result: any;
    expect(() => {
      result = entry.render({ id: 's3', props: {} }, ctx as any);
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it('returns null without throwing when props are invalid types', () => {
    const entry = catalog['sketch']!;
    const ctx = { state: {}, emit: () => {} };
    let result: any;
    expect(() => {
      result = entry.render({ id: 's4', props: { strokes: 'not-an-array' } }, ctx as any);
    }).not.toThrow();
    expect(result).toBeNull();
  });

  it('applies custom color and strokeWidth', () => {
    const entry = catalog['sketch']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render(
      { id: 's5', props: { strokes: SAMPLE_STROKES, color: '#ff0000', strokeWidth: 5 } },
      ctx as any,
    );

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(3);
    paths.forEach(p => {
      expect(p.getAttribute('stroke')).toBe('#ff0000');
      expect(p.getAttribute('stroke-width')).toBe('5');
    });

    act(() => root.unmount());
    document.body.removeChild(container);
  });

  it('renders an svg with the a2ui-sketch class', () => {
    const entry = catalog['sketch']!;
    const ctx = { state: {}, emit: () => {} };
    const node = entry.render({ id: 's6', props: { strokes: SAMPLE_STROKES } }, ctx as any);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const { createRoot } = require('react-dom/client');
    let root: any;
    act(() => { root = createRoot(container); root.render(node); });

    const svg = container.querySelector('svg.a2ui-sketch');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-label')).toBe('sketch');

    act(() => root.unmount());
    document.body.removeChild(container);
  });
});
