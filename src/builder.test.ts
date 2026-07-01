import { describe, it, expect } from 'vitest';
import {
  doc,
  safeDoc,
  buildDoc,
  card,
  container,
  form,
  text,
  chart,
  grid,
  table,
  button,
  textField,
  select,
  progress,
  status,
} from './builder';
import { validateDocument } from './validate';

describe('A2UI authoring SDK — builder', () => {
  it('flattens a nested tree into a valid flat document with wired child ids', () => {
    const result = doc(
      { surfaceId: 's1' },
      card(
        { title: 'Dashboard' },
        chart({ kind: 'line', bind: 'series' }),
        button({ label: 'Refresh', binding: { target: 'mcp', action: 'refresh' } }),
      ),
    );

    // Valid per the same validator the host runs on untrusted docs.
    expect(validateDocument(result)).toEqual({ ok: true });

    // All three nodes present in the flat map.
    const ids = Object.keys(result.components);
    expect(ids).toHaveLength(3);

    // Root is the card.
    const rootComp = result.components[result.root];
    expect(rootComp.type).toBe('card');

    // The card's props.children lists the chart then the button, in order.
    const childIds = rootComp.props.children as string[];
    expect(childIds).toHaveLength(2);
    expect(result.components[childIds[0]].type).toBe('chart');
    expect(result.components[childIds[1]].type).toBe('button');

    // The nested `children` Node field is NOT emitted onto the flat component.
    expect((rootComp as unknown as { children?: unknown }).children).toBeUndefined();

    // Envelope basics.
    expect(result.version).toBe(1);
    expect(result.surfaceId).toBe('s1');
  });

  it('honors explicit ids and assigns deterministic, unique auto ids', () => {
    const build = () =>
      doc(
        { surfaceId: 's' },
        container(
          {},
          text({ value: 'a' }),
          text({ value: 'b' }),
          card({ id: 'my-card' }, status({ state: 'info', label: 'x' })),
        ),
      );

    const d1 = build();
    const d2 = build();

    // Explicit id honored.
    expect(d1.components['my-card']).toBeDefined();
    expect(d1.components['my-card'].type).toBe('card');

    // Auto ids are deterministic across runs for the same tree.
    expect(Object.keys(d1.components).sort()).toEqual(Object.keys(d2.components).sort());

    // Auto ids are of the `${type}-${n}` shape and unique.
    expect(d1.components['container-0']).toBeDefined();
    expect(d1.components['text-0']).toBeDefined();
    expect(d1.components['text-1']).toBeDefined();
    expect(new Set(Object.keys(d1.components)).size).toBe(Object.keys(d1.components).length);
  });

  it('passes bind, binding, target, and live through onto the right places', () => {
    const result = doc(
      {
        surfaceId: 'live-surface',
        target: 'both',
        live: { stateKey: 'series', source: 'demo', intervalMs: 500 },
      },
      container(
        {},
        chart({ id: 'c', kind: 'area', bind: 'series' }),
        grid({ id: 'g', rows: 2, cols: 2, bind: 'seats', binding: { target: 'agent', action: 'pick-seat' } }),
      ),
    );

    expect(validateDocument(result)).toEqual({ ok: true });
    // Display binding.
    expect(result.components['c'].props.bind).toBe('series');
    // Interaction binding lives inside props.
    expect(result.components['g'].props.binding).toEqual({ target: 'agent', action: 'pick-seat' });
    // Document-level target + live.
    expect(result.target).toBe('both');
    expect(result.live).toEqual({ stateKey: 'series', source: 'demo', intervalMs: 500 });
  });

  it('throws from doc() and returns {ok:false} from safeDoc() on an invalid build', () => {
    // grid rows 999 exceeds the catalog cap of 50 → schema rejection.
    const bad = () => grid({ rows: 999, cols: 2 });
    expect(() => doc({ surfaceId: 's' }, bad())).toThrow(/invalid/i);

    const safe = safeDoc({ surfaceId: 's' }, bad());
    expect(safe.ok).toBe(false);
    if (!safe.ok) {
      expect(safe.errors.length).toBeGreaterThan(0);
    }

    // A bad enum (chart.kind) also fails.
    const safeEnum = safeDoc({ surfaceId: 's' }, chart({ kind: 'pie' as never }));
    expect(safeEnum.ok).toBe(false);
  });

  it('rejects duplicate explicit ids (safe + throwing)', () => {
    const tree = () =>
      container({ id: 'dup' }, text({ id: 'dup', value: 'x' }));
    expect(safeDoc({ surfaceId: 's' }, tree()).ok).toBe(false);
    expect(() => doc({ surfaceId: 's' }, tree())).toThrow(/duplicate/i);
  });

  it('buildDoc is the safe (non-throwing) variant', () => {
    const r = buildDoc({ surfaceId: 's' }, text({ value: 'hi' }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.doc.components[r.doc.root].type).toBe('text');
    }
  });

  it('reproduces a seat-grid demo document that validates', () => {
    const seatGrid = doc(
      { surfaceId: 'seat-demo', target: 'inset' },
      card(
        { title: 'Pick your seat' },
        grid({
          id: 'seats',
          rows: 3,
          cols: 4,
          bind: 'seatMap',
          binding: { target: 'mcp', action: 'reserve-seat' },
        }),
        status({ state: 'info', label: 'Available seats highlighted' }),
      ),
    );
    expect(validateDocument(seatGrid)).toEqual({ ok: true });
    expect(seatGrid.components['seats'].props.rows).toBe(3);
    expect(seatGrid.components['seats'].props.cols).toBe(4);
  });

  it('reproduces a sync-counter demo document that validates', () => {
    const counter = doc(
      { surfaceId: 'counter-demo' },
      card(
        { title: 'Live counter' },
        text({ id: 'count', bind: 'count' }),
        progress({ id: 'bar', value: 0, max: 100, bind: 'count' }),
        button({ id: 'inc', label: 'Increment', binding: { target: 'mcp', action: 'increment' } }),
      ),
    );
    expect(validateDocument(counter)).toEqual({ ok: true });
    const childIds = counter.components[counter.root].props.children as string[];
    expect(childIds).toEqual(['count', 'bar', 'inc']);
    expect(counter.components['count'].props.bind).toBe('count');
  });

  it('reproduces a form document (children wired, form binding kept) that validates', () => {
    const signup = doc(
      { surfaceId: 'form-demo' },
      form(
        { submitLabel: 'Sign up', binding: { target: 'mcp', action: 'signup' } },
        textField({ id: 'email', name: 'email', label: 'Email' }),
        select({
          id: 'plan',
          name: 'plan',
          options: [
            { value: 'free', label: 'Free' },
            { value: 'pro', label: 'Pro' },
          ],
        }),
      ),
    );
    expect(validateDocument(signup)).toEqual({ ok: true });
    const root = signup.components[signup.root];
    expect(root.type).toBe('form');
    expect(root.props.binding).toEqual({ target: 'mcp', action: 'signup' });
    expect(root.props.children).toEqual(['email', 'plan']);
  });

  it('accepts a table with columns + inline rows', () => {
    const d = doc(
      { surfaceId: 's' },
      table({ columns: ['Name', 'Score'], rows: [['Alice', 90], ['Bob', 85]] }),
    );
    expect(validateDocument(d)).toEqual({ ok: true });
  });
});
