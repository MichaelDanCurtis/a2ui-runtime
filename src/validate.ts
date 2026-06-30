import type { A2uiDocument } from './types';
import { catalog } from './catalog';

/**
 * Hard bounds on an untrusted (model/MCP-authored) document. These cap the work
 * the renderer and extension host can be forced to do, preventing DoS/OOM from a
 * hallucinated or malicious document. A document exceeding any cap is rejected.
 */
export const MAX_COMPONENTS = 500;
export const MAX_STRING_LENGTH = 10_000;
export const MAX_ARRAY_LENGTH = 5_000;
export const MAX_NESTING_DEPTH = 32;

/**
 * Recursively scan a single component's props for any string longer than
 * MAX_STRING_LENGTH or any array longer than MAX_ARRAY_LENGTH. Returns the first
 * violation message, or undefined when within bounds. Bounded by the props shape
 * itself (which has already passed schema validation upstream when this is hit
 * after the per-component loop, but we scan defensively regardless).
 */
function scanValueBounds(value: unknown): string | undefined {
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) {
      return `string prop length ${value.length} exceeds max ${MAX_STRING_LENGTH}`;
    }
    return undefined;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_LENGTH) {
      return `array length ${value.length} exceeds max ${MAX_ARRAY_LENGTH}`;
    }
    for (const item of value) {
      const v = scanValueBounds(item);
      if (v !== undefined) { return v; }
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const v = scanValueBounds(item);
      if (v !== undefined) { return v; }
    }
  }
  return undefined;
}

/**
 * Compute the max child-reference nesting depth starting from `id`, bailing out
 * the moment it exceeds `limit` (so a deep/cyclic chain cannot itself hang this
 * check). Returns true when depth stays within `limit`. Cycles are detected via
 * the `seen` path set and treated as exceeding the bound.
 */
function withinDepth(
  doc: A2uiDocument,
  id: string,
  limit: number,
  depth: number,
  seen: Set<string>,
): boolean {
  if (depth > limit) { return false; }
  if (seen.has(id)) { return false; }
  const comp = doc.components[id];
  if (!comp) { return true; }
  const children = comp.children ?? [];
  if (children.length === 0) { return true; }
  seen.add(id);
  for (const child of children) {
    if (!withinDepth(doc, child, limit, depth + 1, seen)) {
      seen.delete(id);
      return false;
    }
  }
  seen.delete(id);
  return true;
}

export function validateDocument(doc: A2uiDocument): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  // ─── Hard size/count/depth caps on untrusted documents (DoS guard) ──────────
  const componentCount = Object.keys(doc.components).length;
  if (componentCount > MAX_COMPONENTS) {
    errors.push(`component count ${componentCount} exceeds max ${MAX_COMPONENTS}`);
  }
  if (!doc.components[doc.root]) { errors.push(`root '${doc.root}' not found in components`); }
  for (const [id, comp] of Object.entries(doc.components)) {
    if (id !== comp.id) { errors.push(`component key '${id}' != component.id '${comp.id}'`); }
    const entry = catalog[comp.type];
    if (!entry) { errors.push(`unknown component type '${comp.type}' (id ${id})`); continue; }
    const res = entry.schema.safeParse(comp.props);
    if (!res.success) { errors.push(`props invalid for '${id}' (${comp.type}): ${res.error.issues.map(i => i.message).join(', ')}`); }
    const boundsViolation = scanValueBounds(comp.props);
    if (boundsViolation !== undefined) { errors.push(`props out of bounds for '${id}' (${comp.type}): ${boundsViolation}`); }
    const childCount = comp.children?.length ?? 0;
    if (childCount > MAX_ARRAY_LENGTH) { errors.push(`children length ${childCount} of '${id}' exceeds max ${MAX_ARRAY_LENGTH}`); }
    for (const child of comp.children ?? []) {
      if (!doc.components[child]) { errors.push(`child '${child}' of '${id}' not found`); }
    }
  }
  if (doc.components[doc.root] && !withinDepth(doc, doc.root, MAX_NESTING_DEPTH, 0, new Set())) {
    errors.push(`component nesting depth exceeds max ${MAX_NESTING_DEPTH} (or contains a cycle)`);
  }
  if (doc.target !== undefined && doc.target !== 'inset' && doc.target !== 'panel' && doc.target !== 'both') {
    errors.push(`target must be 'inset', 'panel', or 'both' when present`);
  }
  if (doc.live !== undefined) {
    const live = doc.live as unknown as Record<string, unknown>;
    if (typeof live.stateKey !== 'string' || live.stateKey.length === 0) {
      errors.push(`live.stateKey must be a non-empty string`);
    }
    if (live.source !== 'demo' && live.source !== 'mcp') {
      errors.push(`live.source must be 'demo' or 'mcp'`);
    }
    if (live.name !== undefined && typeof live.name !== 'string') {
      errors.push(`live.name must be a string when present`);
    }
    if (live.intervalMs !== undefined && (typeof live.intervalMs !== 'number' || live.intervalMs <= 0)) {
      errors.push(`live.intervalMs must be a positive number when present`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
