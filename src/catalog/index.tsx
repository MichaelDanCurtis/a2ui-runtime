import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const textEntry: CatalogEntry = {
  type: 'text',
  schema: z.object({ value: z.string() }),
  description: 'Static text. props: { value: string }.',
  render: (c) => <span className="a2ui-text">{String(c.props.value ?? '')}</span>,
};

export const catalog: Record<string, CatalogEntry> = { text: textEntry };

export function getCatalogDescriptions() {
  return Object.values(catalog).map(e => ({ type: e.type, description: e.description }));
}
