import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';
import { chartEntry } from './dataviz';

const textEntry: CatalogEntry = {
  type: 'text',
  schema: z.object({ value: z.string() }),
  description: 'Static text. props: { value: string }.',
  render: (c) => <span className="a2ui-text">{String(c.props.value ?? '')}</span>,
};

export const catalog: Record<string, CatalogEntry> = { text: textEntry, chart: chartEntry };

export function getCatalogDescriptions() {
  return Object.values(catalog).map(e => ({ type: e.type, description: e.description }));
}
