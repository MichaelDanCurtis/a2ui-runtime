import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';
import { chartEntry } from './dataviz';
import { buttonEntry, textFieldEntry, selectEntry, formEntry } from './primitives';

const textEntry: CatalogEntry = {
  type: 'text',
  schema: z.object({ value: z.string() }),
  description: 'Static text. props: { value: string }.',
  render: (c) => <span className="a2ui-text">{String(c.props.value ?? '')}</span>,
};

export const catalog: Record<string, CatalogEntry> = {
  text: textEntry,
  chart: chartEntry,
  button: buttonEntry,
  textField: textFieldEntry,
  select: selectEntry,
  form: formEntry,
};

export function getCatalogDescriptions() {
  return Object.values(catalog).map(e => ({ type: e.type, description: e.description }));
}
