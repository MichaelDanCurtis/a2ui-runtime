import type { ReactNode } from 'react';
import type { ZodType } from 'zod';

export interface RenderContext {
  emit(componentId: string, binding: { target: 'mcp' | 'agent'; action: string }, payload: unknown): void;
  state: Record<string, unknown>;
  getComponent(id: string): { id: string; type: string; props: Record<string, unknown> } | undefined;
}

export interface CatalogEntry {
  type: string;
  schema: ZodType;
  description: string;
  render: (component: { id: string; props: Record<string, unknown> }, ctx: RenderContext) => ReactNode;
}
