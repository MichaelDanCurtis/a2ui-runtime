import type { A2uiDocument } from './types';
import type { Operation } from 'fast-json-patch';

export type HostToInsetMessage =
  | { type: 'RENDER'; doc: A2uiDocument }
  | { type: 'STATE_DELTA'; surfaceId: string; patch: Operation[] }
  | { type: 'DISPOSE'; surfaceId: string };

export type InsetToHostMessage =
  | { type: 'READY'; surfaceId: string }
  | { type: 'INTERACTION'; surfaceId: string; componentId: string; binding: 'mcp' | 'agent'; payload: unknown }
  | { type: 'RESIZE'; surfaceId: string; height: number };

const HOST_TYPES = new Set(['RENDER', 'STATE_DELTA', 'DISPOSE']);
const INSET_TYPES = new Set(['READY', 'INTERACTION', 'RESIZE']);

export function isHostToInset(m: unknown): m is HostToInsetMessage {
  return !!m && typeof m === 'object' && HOST_TYPES.has((m as any).type);
}
export function isInsetToHost(m: unknown): m is InsetToHostMessage {
  return !!m && typeof m === 'object' && INSET_TYPES.has((m as any).type);
}
