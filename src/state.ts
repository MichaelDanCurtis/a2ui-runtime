import { applyPatch, deepClone, Operation } from 'fast-json-patch';

export function applyStateDelta(state: Record<string, unknown>, patch: Operation[]):
  { state: Record<string, unknown> } | { error: string } {
  try {
    const next = applyPatch(deepClone(state), patch, /*validate*/ true).newDocument;
    return { state: next as Record<string, unknown> };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
