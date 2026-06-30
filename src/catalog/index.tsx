import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';
import { chartEntry } from './dataviz';
import { containerEntry, cardEntry } from './layout';
import { buttonEntry, textFieldEntry, selectEntry, formEntry } from './primitives';
import { sketchEntry } from './sketch';
import { tableEntry } from './table';
import { progressEntry } from './progress';
import { statusEntry } from './status';
import { imageEntry } from './image';

const textSchema = z.object({ value: z.string().optional(), bind: z.string().optional() });

const textEntry: CatalogEntry = {
  type: 'text',
  schema: textSchema,
  description:
    'Text display. props: { value?: string, bind?: string }. When bind is set, shows the live ctx.state[bind] value (re-renders on STATE_DELTA); otherwise shows the static value.',
  render: (c, ctx) => {
    const parsed = textSchema.safeParse(c.props);
    const bind = parsed.success ? parsed.data.bind : undefined;
    const value = parsed.success ? parsed.data.value : undefined;
    const text = bind !== undefined ? String(ctx.state[bind] ?? '') : String(value ?? '');
    return <span className="a2ui-text">{text}</span>;
  },
};

export const catalog: Record<string, CatalogEntry> = {
  text: textEntry,
  chart: chartEntry,
  container: containerEntry,
  card: cardEntry,
  button: buttonEntry,
  textField: textFieldEntry,
  select: selectEntry,
  form: formEntry,
  sketch: sketchEntry,
  table: tableEntry,
  progress: progressEntry,
  status: statusEntry,
  image: imageEntry,
};

export function getCatalogDescriptions() {
  return Object.values(catalog).map(e => ({ type: e.type, description: e.description }));
}
