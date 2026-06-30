import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { mountRuntime } from '../host';

// Tell React 18 that this is an act()-aware test environment
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── button ──────────────────────────────────────────────────────────────────

describe('button: with binding', () => {
  it('clicking emits an INTERACTION message via transport', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });

    const doc = {
      version: 1,
      surfaceId: 's1',
      root: 'btn1',
      components: {
        btn1: {
          id: 'btn1',
          type: 'button',
          props: { label: 'Click me', binding: { target: 'mcp', action: 'refresh' } },
        },
      },
    };

    await act(async () => { t.send({ type: 'RENDER', doc }); });

    const btn = root.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn!.textContent).toBe('Click me');

    const before = t.posts.filter(p => p.type === 'INTERACTION').length;
    await act(async () => { btn!.click(); });

    const interactions = t.posts.filter(p => p.type === 'INTERACTION');
    expect(interactions.length).toBe(before + 1);
    const msg = interactions[interactions.length - 1];
    expect(msg.componentId).toBe('btn1');
    expect(msg.binding).toBe('mcp');
    expect(msg.action).toBe('refresh');

    document.body.removeChild(root);
  });
});

describe('button: without binding', () => {
  it('clicking does NOT emit an INTERACTION message', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });

    const doc = {
      version: 1,
      surfaceId: 's2',
      root: 'btn2',
      components: {
        btn2: {
          id: 'btn2',
          type: 'button',
          props: { label: 'No binding' },
        },
      },
    };

    await act(async () => { t.send({ type: 'RENDER', doc }); });

    const btn = root.querySelector('button');
    expect(btn).not.toBeNull();

    const before = t.posts.filter(p => p.type === 'INTERACTION').length;
    await act(async () => { btn!.click(); });

    const after = t.posts.filter(p => p.type === 'INTERACTION').length;
    expect(after).toBe(before);

    document.body.removeChild(root);
  });
});

// ─── select ──────────────────────────────────────────────────────────────────

describe('select: with binding', () => {
  it('changing selection emits INTERACTION with { value }', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });

    const doc = {
      version: 1,
      surfaceId: 's3',
      root: 'sel1',
      components: {
        sel1: {
          id: 'sel1',
          type: 'select',
          props: {
            name: 'color',
            options: [
              { value: 'red', label: 'Red' },
              { value: 'blue', label: 'Blue' },
            ],
            binding: { target: 'mcp', action: 'pick-color' },
          },
        },
      },
    };

    await act(async () => { t.send({ type: 'RENDER', doc }); });

    const sel = root.querySelector('select') as HTMLSelectElement;
    expect(sel).not.toBeNull();

    await act(async () => {
      // Simulate change to 'blue'
      sel.value = 'blue';
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const interactions = t.posts.filter(p => p.type === 'INTERACTION');
    expect(interactions.length).toBeGreaterThan(0);
    const msg = interactions[interactions.length - 1];
    expect(msg.componentId).toBe('sel1');
    expect(msg.binding).toBe('mcp');
    expect((msg.payload as any).value).toBe('blue');

    document.body.removeChild(root);
  });
});

// ─── form ────────────────────────────────────────────────────────────────────

describe('form: submit gathers child field values', () => {
  it('emits INTERACTION with payload.values containing child textField values', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });

    const doc = {
      version: 1,
      surfaceId: 's4',
      root: 'form1',
      components: {
        form1: {
          id: 'form1',
          type: 'form',
          props: {
            submitLabel: 'Send',
            children: ['field1', 'field2'],
            binding: { target: 'mcp', action: 'submit-form' },
          },
        },
        field1: {
          id: 'field1',
          type: 'textField',
          props: { name: 'username', label: 'Username' },
        },
        field2: {
          id: 'field2',
          type: 'textField',
          props: { name: 'email', placeholder: 'email@example.com' },
        },
      },
    };

    await act(async () => { t.send({ type: 'RENDER', doc }); });

    // Fill in text fields using the native value setter so React's synthetic onChange fires
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;

    await act(async () => {
      const usernameInput = root.querySelector('input[name="username"]') as HTMLInputElement;
      nativeSetter.call(usernameInput, 'alice');
      usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await act(async () => {
      const emailInput = root.querySelector('input[name="email"]') as HTMLInputElement;
      nativeSetter.call(emailInput, 'alice@example.com');
      emailInput.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Submit the form
    const form = root.querySelector('form') as HTMLFormElement;
    expect(form).not.toBeNull();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const interactions = t.posts.filter(p => p.type === 'INTERACTION');
    expect(interactions.length).toBeGreaterThan(0);
    const msg = interactions[interactions.length - 1];
    expect(msg.componentId).toBe('form1');
    expect(msg.binding).toBe('mcp');
    expect(msg.payload).toHaveProperty('values');
    const values = (msg.payload as any).values;
    expect(values).toHaveProperty('username', 'alice');
    expect(values).toHaveProperty('email', 'alice@example.com');

    document.body.removeChild(root);
  });

  it('unmodified select child still appears in payload.values with first option value', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });

    const doc = {
      version: 1,
      surfaceId: 's6',
      root: 'form3',
      components: {
        form3: {
          id: 'form3',
          type: 'form',
          props: {
            submitLabel: 'Go',
            children: ['sel2'],
            binding: { target: 'mcp', action: 'submit-select-form' },
          },
        },
        sel2: {
          id: 'sel2',
          type: 'select',
          props: {
            name: 'priority',
            options: [
              { value: 'low', label: 'Low' },
              { value: 'high', label: 'High' },
            ],
          },
        },
      },
    };

    await act(async () => { t.send({ type: 'RENDER', doc }); });

    // Submit without changing the select
    const form = root.querySelector('form') as HTMLFormElement;
    expect(form).not.toBeNull();

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const interactions = t.posts.filter(p => p.type === 'INTERACTION');
    expect(interactions.length).toBeGreaterThan(0);
    const msg = interactions[interactions.length - 1];
    expect(msg.componentId).toBe('form3');
    expect(msg.payload).toHaveProperty('values');
    const values = (msg.payload as any).values;
    // The select was never touched — its first option value must still be present
    expect(values).toHaveProperty('priority', 'low');

    document.body.removeChild(root);
  });

  it('forwards the form binding in INTERACTION message', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const t = makeTransport();

    await act(async () => { mountRuntime(root, t); });

    const doc = {
      version: 1,
      surfaceId: 's5',
      root: 'form2',
      components: {
        form2: {
          id: 'form2',
          type: 'form',
          props: {
            children: ['f1'],
            binding: { target: 'agent', action: 'do-thing' },
          },
        },
        f1: {
          id: 'f1',
          type: 'textField',
          props: { name: 'msg' },
        },
      },
    };

    await act(async () => { t.send({ type: 'RENDER', doc }); });

    const form = root.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const interactions = t.posts.filter(p => p.type === 'INTERACTION');
    expect(interactions.length).toBeGreaterThan(0);
    const msg = interactions[interactions.length - 1];
    expect(msg.componentId).toBe('form2');
    expect(msg.binding).toBe('agent');

    document.body.removeChild(root);
  });
});
