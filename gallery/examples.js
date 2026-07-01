// Canonical A2UI example documents.
//
// This is the SINGLE source of truth for the examples shown in BOTH the developer
// docs and the live gallery. Each entry is a *literal* flat A2uiDocument envelope
// (the exact shape `validateDocument` accepts and the runtime renders) — NOT the
// authoring-SDK nested form. The gallery loads the runtime IIFE which has no SDK,
// so these must be plain, already-flattened doc objects.
//
// Envelope shape (see src/types.ts):
//   { version, surfaceId, root, components: { <id>: { id, type, props, binding? } },
//     target?: 'inset'|'panel'|'both', live?: { stateKey, source, name?, intervalMs? } }
// Container-ish components (card/container/form) reference children BY ID in
// props.children. Each example is validated by gallery/examples.validate.test.ts.
//
// Plain ESM so it loads with no build step: `import { examples } from './examples.js'`.

/** @typedef {import('../src/types').A2uiDocument} A2uiDocument */

// ─── 1. Simple card + text ──────────────────────────────────────────────────────
const cardText = {
  version: 1,
  surfaceId: 'hello-card',
  target: 'inset',
  root: 'card-0',
  components: {
    'card-0': { id: 'card-0', type: 'card', props: { title: 'Hello from A2UI', children: ['text-0'] } },
    'text-0': { id: 'text-0', type: 'text', props: { value: 'This card and its text were rendered from a single JSON document.' } },
  },
};

// ─── 2. Full component-kit showcase (table + progress + 2 status + image + area) ──
const componentKit = {
  version: 1,
  surfaceId: 'component-kit',
  target: 'inset',
  root: 'card-0',
  components: {
    'card-0': {
      id: 'card-0',
      type: 'card',
      props: { title: 'Deployment overview', children: ['status-0', 'status-1', 'progress-0', 'table-0', 'chart-0', 'image-0'] },
    },
    'status-0': { id: 'status-0', type: 'status', props: { state: 'success', label: 'Build passing' } },
    'status-1': { id: 'status-1', type: 'status', props: { state: 'running', label: 'Deploying' } },
    'progress-0': { id: 'progress-0', type: 'progress', props: { value: 72, max: 100, label: 'Rollout 72%' } },
    'table-0': {
      id: 'table-0',
      type: 'table',
      props: {
        columns: ['Region', 'Replicas', 'Status'],
        rows: [
          ['us-east', 6, 'healthy'],
          ['eu-west', 4, 'healthy'],
          ['ap-south', 2, 'draining'],
        ],
      },
    },
    'chart-0': { id: 'chart-0', type: 'chart', props: { kind: 'area', title: 'Requests / min', data: [12, 18, 15, 22, 30, 28, 35, 40, 38, 44] } },
    'image-0': { id: 'image-0', type: 'image', props: { src: 'https://placehold.co/320x80/1f2937/e5e7eb?text=A2UI', alt: 'Banner', width: 320, height: 80 } },
  },
};

// ─── 3. Interaction counter (button + bound text) ─────────────────────────────────
// The button emits an INTERACTION; the host is expected to reply with a STATE_DELTA
// that updates `clicks` / `lastAction`, which the bound text components display.
const counter = {
  version: 1,
  surfaceId: 'counter',
  target: 'inset',
  root: 'card-0',
  components: {
    'card-0': { id: 'card-0', type: 'card', props: { title: 'Interaction round-trip', children: ['text-0', 'text-1', 'button-0'] } },
    'text-0': { id: 'text-0', type: 'text', props: { bind: 'clicks' } },
    'text-1': { id: 'text-1', type: 'text', props: { bind: 'lastAction' } },
    'button-0': { id: 'button-0', type: 'button', props: { label: 'Increment', binding: { target: 'mcp', action: 'increment' } } },
  },
};

// ─── 4. Live area chart (demo feed) ───────────────────────────────────────────────
// `live` declares a self-updating feed writing into stateKey `series`; the chart is
// bound to that key and re-renders on every STATE_DELTA touching it.
const liveChart = {
  version: 1,
  surfaceId: 'live-chart',
  target: 'inset',
  live: { stateKey: 'series', source: 'demo', name: 'throughput', intervalMs: 1000 },
  root: 'card-0',
  components: {
    'card-0': { id: 'card-0', type: 'card', props: { title: 'Live throughput', children: ['chart-0'] } },
    'chart-0': { id: 'chart-0', type: 'chart', props: { kind: 'area', title: 'req/s', bind: 'series', data: [10, 12, 11, 14] } },
  },
};

// ─── 5. Seat grid (grid, panel target, agent binding) ─────────────────────────────
const seatGrid = {
  version: 1,
  surfaceId: 'seat-grid',
  target: 'panel',
  root: 'card-0',
  components: {
    'card-0': { id: 'card-0', type: 'card', props: { title: 'Pick a seat', children: ['text-0', 'grid-0'] } },
    'text-0': { id: 'text-0', type: 'text', props: { value: 'Green seats are free; dimmed seats are taken. Click to select.' } },
    'grid-0': {
      id: 'grid-0',
      type: 'grid',
      props: {
        rows: 3,
        cols: 6,
        bind: 'seats',
        binding: { target: 'agent', action: 'selectSeat' },
      },
    },
  },
};

// ─── 6. Sketch ────────────────────────────────────────────────────────────────────
const sketchDoc = {
  version: 1,
  surfaceId: 'sketch',
  target: 'inset',
  root: 'card-0',
  components: {
    'card-0': { id: 'card-0', type: 'card', props: { title: 'Animated sketch', children: ['sketch-0'] } },
    'sketch-0': {
      id: 'sketch-0',
      type: 'sketch',
      props: {
        viewBox: '0 0 400 150',
        strokeWidth: 3,
        durationMs: 700,
        staggerMs: 350,
        strokes: [
          'M 30 120 C 60 40, 140 40, 170 120',
          'M 30 120 L 170 120',
          'M 210 40 L 210 120',
          'M 210 40 C 260 40, 260 80, 210 80',
          'M 300 120 L 300 40 L 370 40',
          'M 300 80 L 355 80',
        ],
      },
    },
  },
};

/**
 * Ordered example set. Each entry:
 *   { id, title, blurb, doc, live? }
 * `live` mirrors doc.live for the gallery's fake feed (which stateKey to animate).
 * @type {Array<{ id: string; title: string; blurb: string; doc: A2uiDocument; live?: { stateKey: string; intervalMs?: number } }>}
 */
export const examples = [
  { id: 'card-text', title: 'Card + text', blurb: 'The smallest useful document: a titled card wrapping a line of text.', doc: cardText },
  { id: 'component-kit', title: 'Component kit', blurb: 'Table, progress, status pills, image, and an area chart in one card.', doc: componentKit },
  { id: 'counter', title: 'Interaction counter', blurb: 'A button emits INTERACTION; bound text updates from the reply STATE_DELTA.', doc: counter },
  { id: 'live-chart', title: 'Live area chart', blurb: 'A live feed pushes STATE_DELTAs into a bound series; the chart animates.', doc: liveChart, live: { stateKey: 'series', intervalMs: 1000 } },
  { id: 'seat-grid', title: 'Seat grid', blurb: 'A selectable cell grid (target: panel) that emits agent-routed selections.', doc: seatGrid },
  { id: 'sketch', title: 'Animated sketch', blurb: 'SVG strokes drawn on sequentially with a stagger.', doc: sketchDoc },
];

export default examples;
