/**
 * Typed AUTHORING SDK for A2UI documents.
 *
 * The wire format is a FLAT map keyed by component id:
 *   { version, surfaceId, root, components: { <id>: { id, type, props } }, target?, live? }
 * where container-ish components reference their children BY ID inside
 * `props.children: string[]`.
 *
 * Hand-writing that id-wired JSON is tedious and error-prone. This module lets a
 * developer author a NESTED, typed tree with per-component builder functions and
 * flatten it into the envelope, wiring child ids automatically and validating the
 * result with the very same `validateDocument` the extension host runs on
 * untrusted documents.
 *
 * This module is author-facing (a build-time helper). It is NOT part of the
 * webview IIFE bundle (that entry is host.tsx) — it only depends on `zod`, the
 * catalog schemas, the shared types, and `validateDocument`.
 */
import { z } from 'zod';
import type { A2uiDocument, A2uiLiveBinding, A2uiComponent, Binding } from './types';
import { validateDocument } from './validate';

// ─── Node descriptor ───────────────────────────────────────────────────────────

/**
 * The nested tree node produced by every builder function. `children` is only
 * present on container-ish nodes (card / container / form). During flattening the
 * children are hoisted out into the flat map and replaced by their ids in
 * `props.children`.
 */
export interface Node {
  type: string;
  props: Record<string, unknown>;
  id?: string;
  children?: Node[];
}

// ─── Prop types (inferred from the catalog Zod schemas) ─────────────────────────
// These mirror the exact catalog schemas so authored props get autocomplete +
// compile-time checking. Schemas that carry a `children: string[]` field (card,
// container, form) are omitted here because the builder wires children from the
// nested Node args instead of the caller passing ids.

const bindingSchema = z.object({ target: z.enum(['mcp', 'agent']), action: z.string() });

const textSchema = z.object({ value: z.string().optional(), bind: z.string().optional() });
const chartSchema = z.object({
  bind: z.string().optional(),
  dataKey: z.string().optional(),
  kind: z.enum(['line', 'bar', 'area']),
  title: z.string().optional(),
  data: z.array(z.number()).max(5000).optional(),
});
const gridSchema = z.object({
  rows: z.number().int().min(0).max(50),
  cols: z.number().int().min(0).max(50),
  bind: z.string().optional(),
  binding: bindingSchema.optional(),
  cellLabels: z.array(z.string()).optional(),
});
const tableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).max(1000).optional(),
  bind: z.string().optional(),
});
const buttonSchema = z.object({ label: z.string(), binding: bindingSchema.optional() });
const textFieldSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  binding: bindingSchema.optional(),
});
const selectSchema = z.object({
  name: z.string(),
  options: z.array(z.object({ value: z.string(), label: z.string() })),
  binding: bindingSchema.optional(),
});
const progressSchema = z.object({
  value: z.number(),
  max: z.number().optional(),
  label: z.string().optional(),
  bind: z.string().optional(),
});
const statusSchema = z.object({
  state: z.enum(['success', 'warning', 'error', 'info', 'running']),
  label: z.string(),
});
const imageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});
const sketchSchema = z.object({
  strokes: z.array(z.string()),
  viewBox: z.string().optional(),
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  durationMs: z.number().optional(),
  staggerMs: z.number().optional(),
});
// Container-ish prop shapes WITHOUT the `children: string[]` field — children are
// supplied as nested Node args and wired by the builder.
const cardPropsSchema = z.object({ title: z.string().optional() });
const containerPropsSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']).optional(),
  gap: z.number().optional(),
});
const formPropsSchema = z.object({ submitLabel: z.string().optional(), binding: bindingSchema });

export type TextProps = z.infer<typeof textSchema>;
export type ChartProps = z.infer<typeof chartSchema>;
export type GridProps = z.infer<typeof gridSchema>;
export type TableProps = z.infer<typeof tableSchema>;
export type ButtonProps = z.infer<typeof buttonSchema>;
export type TextFieldProps = z.infer<typeof textFieldSchema>;
export type SelectProps = z.infer<typeof selectSchema>;
export type ProgressProps = z.infer<typeof progressSchema>;
export type StatusProps = z.infer<typeof statusSchema>;
export type ImageProps = z.infer<typeof imageSchema>;
export type SketchProps = z.infer<typeof sketchSchema>;
export type CardProps = z.infer<typeof cardPropsSchema>;
export type ContainerProps = z.infer<typeof containerPropsSchema>;
export type FormProps = z.infer<typeof formPropsSchema>;

export type { Binding, A2uiLiveBinding };

/** Every builder accepts an optional explicit id via `{ id }` alongside its props. */
type WithId<P> = P & { id?: string };

function leaf<P extends Record<string, unknown>>(type: string, props: WithId<P>): Node {
  const { id, ...rest } = props as WithId<P> & { id?: string };
  return { type, props: rest as Record<string, unknown>, ...(id !== undefined ? { id } : {}) };
}

function branch<P extends Record<string, unknown>>(
  type: string,
  props: WithId<P>,
  children: Node[],
): Node {
  const { id, ...rest } = props as WithId<P> & { id?: string };
  return {
    type,
    props: rest as Record<string, unknown>,
    children,
    ...(id !== undefined ? { id } : {}),
  };
}

// ─── Leaf builders (props only) ─────────────────────────────────────────────────

export const text = (props: WithId<TextProps> = {}): Node => leaf('text', props);
export const chart = (props: WithId<ChartProps>): Node => leaf('chart', props);
export const grid = (props: WithId<GridProps>): Node => leaf('grid', props);
export const table = (props: WithId<TableProps>): Node => leaf('table', props);
export const button = (props: WithId<ButtonProps>): Node => leaf('button', props);
export const textField = (props: WithId<TextFieldProps>): Node => leaf('textField', props);
export const select = (props: WithId<SelectProps>): Node => leaf('select', props);
export const progress = (props: WithId<ProgressProps>): Node => leaf('progress', props);
export const status = (props: WithId<StatusProps>): Node => leaf('status', props);
export const image = (props: WithId<ImageProps>): Node => leaf('image', props);
export const sketch = (props: WithId<SketchProps>): Node => leaf('sketch', props);

// ─── Container-ish builders (children as rest args) ─────────────────────────────
// The caller does NOT pass `props.children` ids; the builder wires them from the
// child Nodes during flattening.

export const card = (props: WithId<CardProps> = {}, ...children: Node[]): Node =>
  branch('card', props, children);
export const container = (props: WithId<ContainerProps> = {}, ...children: Node[]): Node =>
  branch('container', props, children);
export const form = (props: WithId<FormProps>, ...children: Node[]): Node =>
  branch('form', props, children);

// ─── doc() / safeDoc() ──────────────────────────────────────────────────────────

export interface DocOptions {
  surfaceId: string;
  target?: 'inset' | 'panel' | 'both';
  live?: A2uiLiveBinding;
  version?: number;
}

export type SafeDocResult =
  | { ok: true; doc: A2uiDocument }
  | { ok: false; errors: string[] };

/**
 * Walk the nested tree depth-first, assigning each node a stable id and building
 * the flat components map. Explicit ids win; otherwise a deterministic
 * `${type}-${n}` id is assigned via a per-type counter, so the same tree flattens
 * to the same ids across runs. Container-ish nodes get their `props.children` set
 * to the ordered child id list; the nested `children` field is dropped.
 *
 * Throws on a duplicate id (two nodes sharing an explicit id would collide in the
 * flat map and silently drop one) — this is an authoring error, surfaced eagerly.
 */
function flatten(root: Node): { root: string; components: Record<string, A2uiComponent> } {
  const components: Record<string, A2uiComponent> = {};
  const counters = new Map<string, number>();

  const assignId = (node: Node): string => {
    if (node.id !== undefined) { return node.id; }
    const n = counters.get(node.type) ?? 0;
    counters.set(node.type, n + 1);
    return `${node.type}-${n}`;
  };

  const walk = (node: Node): string => {
    const id = assignId(node);
    if (Object.prototype.hasOwnProperty.call(components, id)) {
      throw new Error(`duplicate component id '${id}' (assign unique explicit ids)`);
    }
    // Reserve the slot so a duplicate is detected even before children recurse.
    const comp: A2uiComponent = { id, type: node.type, props: { ...node.props } };
    components[id] = comp;
    if (node.children !== undefined) {
      comp.props.children = node.children.map(child => walk(child));
    }
    return id;
  };

  const rootId = walk(root);
  return { root: rootId, components };
}

/**
 * Build a validated flat {@link A2uiDocument} from a nested builder tree, returning
 * a discriminated result instead of throwing. Prefer this when you want to handle
 * validation failures inline; use {@link doc} for the throwing convenience.
 */
export function safeDoc(opts: DocOptions, root: Node): SafeDocResult {
  let flat: { root: string; components: Record<string, A2uiComponent> };
  try {
    flat = flatten(root);
  } catch (err) {
    return { ok: false, errors: [(err as Error).message] };
  }
  const assembled: A2uiDocument = {
    version: opts.version ?? 1,
    surfaceId: opts.surfaceId,
    root: flat.root,
    components: flat.components,
    ...(opts.target !== undefined ? { target: opts.target } : {}),
    ...(opts.live !== undefined ? { live: opts.live } : {}),
  };
  const res = validateDocument(assembled);
  if (!res.ok) { return { ok: false, errors: res.errors }; }
  return { ok: true, doc: assembled };
}

/**
 * Build a validated flat {@link A2uiDocument} from a nested builder tree. Throws an
 * Error listing every validation problem when the assembled document is invalid;
 * returns the typed document when valid.
 */
export function doc(opts: DocOptions, root: Node): A2uiDocument {
  const res = safeDoc(opts, root);
  if (!res.ok) {
    throw new Error(`A2UI document invalid:\n- ${res.errors.join('\n- ')}`);
  }
  return res.doc;
}

/** Alias for {@link safeDoc}, for callers who prefer the `buildDoc` name. */
export const buildDoc = safeDoc;
