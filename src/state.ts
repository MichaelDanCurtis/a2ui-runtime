import { applyPatch, deepClone, Operation } from 'fast-json-patch';

/** JSON-Pointer path segments that must never appear in a STATE_DELTA op. */
const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Explicit, belt-and-suspenders prototype-pollution guard. fast-json-patch with
 * validate:true already bans these paths today, but STATE_DELTAs will soon be
 * MCP-sourced — so we own the guarantee locally rather than relying on a
 * dependency default that a version bump or `validate:false` could silently
 * remove. Returns true when the op's path contains a forbidden segment.
 */
function hasForbiddenPath(op: Operation): boolean {
  const paths: string[] = [op.path];
  if ('from' in op && typeof op.from === 'string') {
    paths.push(op.from);
  }
  for (const path of paths) {
    if (typeof path !== 'string') { continue; }
    for (const segment of path.split('/')) {
      // JSON-Pointer escapes: ~1 -> '/', ~0 -> '~'. Decode before comparing.
      const decoded = segment.replace(/~1/g, '/').replace(/~0/g, '~');
      if (FORBIDDEN_SEGMENTS.has(decoded)) { return true; }
    }
  }
  return false;
}

export function applyStateDelta(state: Record<string, unknown>, patch: Operation[]):
  { state: Record<string, unknown> } | { error: string } {
  // Reject the whole patch if any op targets a prototype-pollution path; leave
  // state unchanged (no-op) rather than partially applying.
  if (Array.isArray(patch)) {
    for (const op of patch) {
      if (op && hasForbiddenPath(op)) {
        return { error: `rejected patch op with forbidden path segment: ${op.path}` };
      }
    }
  }
  try {
    const next = applyPatch(deepClone(state), patch, /*validate*/ true).newDocument;
    return { state: next as Record<string, unknown> };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
