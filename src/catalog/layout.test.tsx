import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { catalog } from './index.tsx';
import { mountRuntime } from '../host';

// Tell React 18 that this is an act()-aware test environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ─── container ───────────────────────────────────────────────────────────────

describe('container catalog entry', () => {
  it('is registered in the catalog', () => {
    expect(catalog['container']).toBeDefined();
    expect(catalog['container']!.type).toBe('container');
  });

  it('renders children text via renderChild', async () => {
    const doc = {
      version: 1,
      surfaceId: 's',
      root: 'c1',
      components: {
        c1: { id: 'c1', type: 'container', props: { children: ['t1', 't2'] } },
        t1: { id: 't1', type: 'text', props: { value: 'Hello' } },
        t2: { id: 't2', type: 'text', props: { value: 'World' } },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    expect(root.textContent).toContain('Hello');
    expect(root.textContent).toContain('World');
    document.body.removeChild(root);
  });

  it('applies vertical flex class by default', async () => {
    const doc = {
      version: 1,
      surfaceId: 's',
      root: 'c1',
      components: {
        c1: { id: 'c1', type: 'container', props: { children: ['t1'] } },
        t1: { id: 't1', type: 'text', props: { value: 'x' } },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    const containerEl = root.querySelector('.a2ui-container');
    expect(containerEl).not.toBeNull();
    expect(containerEl!.classList.contains('a2ui-container--vertical')).toBe(true);
    document.body.removeChild(root);
  });

  it('applies horizontal flex class when direction=horizontal', async () => {
    const doc = {
      version: 1,
      surfaceId: 's',
      root: 'c1',
      components: {
        c1: { id: 'c1', type: 'container', props: { direction: 'horizontal', children: ['t1'] } },
        t1: { id: 't1', type: 'text', props: { value: 'x' } },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    const containerEl = root.querySelector('.a2ui-container');
    expect(containerEl!.classList.contains('a2ui-container--horizontal')).toBe(true);
    document.body.removeChild(root);
  });
});

// ─── card ─────────────────────────────────────────────────────────────────────

describe('card catalog entry', () => {
  it('is registered in the catalog', () => {
    expect(catalog['card']).toBeDefined();
    expect(catalog['card']!.type).toBe('card');
  });

  it('renders title and children', async () => {
    const doc = {
      version: 1,
      surfaceId: 's',
      root: 'card1',
      components: {
        card1: { id: 'card1', type: 'card', props: { title: 'My Card', children: ['t1'] } },
        t1: { id: 't1', type: 'text', props: { value: 'Card content' } },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    expect(root.textContent).toContain('My Card');
    expect(root.textContent).toContain('Card content');
    const cardEl = root.querySelector('.a2ui-card');
    expect(cardEl).not.toBeNull();
    document.body.removeChild(root);
  });

  it('renders children without title when title is omitted', async () => {
    const doc = {
      version: 1,
      surfaceId: 's',
      root: 'card1',
      components: {
        card1: { id: 'card1', type: 'card', props: { children: ['t1'] } },
        t1: { id: 't1', type: 'text', props: { value: 'No title' } },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    expect(root.textContent).toContain('No title');
    const titleEl = root.querySelector('.a2ui-card-title');
    expect(titleEl).toBeNull();
    document.body.removeChild(root);
  });
});

// ─── renderChild ─────────────────────────────────────────────────────────────

describe('renderChild in RenderContext', () => {
  it('renders a referenced child component', async () => {
    const doc = {
      version: 1,
      surfaceId: 's',
      root: 'card1',
      components: {
        card1: { id: 'card1', type: 'card', props: { title: 'Test', children: ['btn1'] } },
        btn1: { id: 'btn1', type: 'button', props: { label: 'Click me' } },
      },
    };
    const root = document.createElement('div');
    document.body.appendChild(root);
    let handler: (m: any) => void = () => {};
    mountRuntime(root, { postMessage: () => {}, onMessage: cb => { handler = cb; } });
    await act(async () => { handler({ type: 'RENDER', doc }); });
    expect(root.textContent).toContain('Click me');
    document.body.removeChild(root);
  });
});
