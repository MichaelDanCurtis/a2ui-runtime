# Extending the catalog

Adding a component is three steps: **schema**, **renderer**, **register**. Every
component follows the `CatalogEntry` contract in `src/catalog/catalogEntry.ts`:

```ts
interface CatalogEntry {
  type: string;
  schema: ZodType;                                   // validates props
  description: string;                               // single-line, model-facing
  render: (component: { id, props }, ctx: RenderContext) => ReactNode;
}

interface RenderContext {
  emit(componentId, binding, payload): void;         // post an INTERACTION
  state: Record<string, unknown>;                    // live state for `bind`
  getComponent(id): { id, type, props } | undefined; // look up another component
  renderChild(id): ReactNode;                        // render a child by id
}
```

## Worked example: a `badge` component

Mirror an existing leaf like `status` (`src/catalog/status.tsx`).

### 1. Schema + renderer — `src/catalog/badge.tsx`

```tsx
import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const badgeSchema = z.object({
  label: z.string(),
  bind: z.string().optional(),   // optional: show live ctx.state[bind] instead
});

export const badgeEntry: CatalogEntry = {
  type: 'badge',
  // Descriptions are injected into the model prompt and searched verbatim, so keep
  // them SINGLE-LINE with no literal newlines or double-quotes.
  description:
    'Small inline badge. props: { label: string, bind?: string }. When bind is set, shows ctx.state[bind] (re-renders on STATE_DELTA); otherwise shows label.',
  schema: badgeSchema,
  render: (c, ctx) => {
    const parsed = badgeSchema.safeParse(c.props);
    if (!parsed.success) return null;               // reject invalid props defensively
    const { label, bind } = parsed.data;
    const text = bind !== undefined ? String(ctx.state[bind] ?? '') : label;
    return <span className="a2ui-badge">{text}</span>;
  },
};
```

Guidelines drawn from the existing catalog:

- Always `safeParse` inside `render` and return `null` on failure — never trust props.
- If you inject CSS, do it once behind a `document.getElementById(STYLE_ID)` guard
  (see `status.tsx` / `table.tsx`), not on every render.
- **Bounds:** cap any array/number that drives DOM node count so an untrusted
  document can't force unbounded work (grid caps `rows`/`cols` at 50, table `rows` at
  1000, chart `data` at 5000). See [security.md](./security.md).
- **Interactive?** Add `binding: z.object({ target: z.enum(['mcp','agent']), action: z.string() }).optional()`
  to the schema and call `ctx.emit(c.id, binding, payload)` on the user action, as
  `button`/`grid` do.
- **Hooks?** `render` is called imperatively, so you cannot call React hooks directly
  in it. Return a small component element and let React own the state — see how
  `grid.tsx` returns `<GridView … />`.

### 2. Register it — `src/catalog/index.tsx`

```ts
import { badgeEntry } from './badge';

export const catalog: Record<string, CatalogEntry> = {
  // …existing entries…
  badge: badgeEntry,
};
```

Registration is all that connects the type name to validation + rendering:
`validateDocument` looks the type up in `catalog` to find its schema, and the runtime
looks it up to find its renderer. `getCatalogDescriptions()` automatically includes
the new entry for the model.

### 3. Optional: an SDK builder — `src/builder.ts`

To author `badge` with the typed SDK, add a schema mirror and a `leaf('badge', …)`
builder alongside the others:

```ts
const badgeSchema = z.object({ label: z.string(), bind: z.string().optional() });
export type BadgeProps = z.infer<typeof badgeSchema>;
export const badge = (props: WithId<BadgeProps>): Node => leaf('badge', props);
```

### 4. Test it

Add a `src/catalog/badge.test.tsx` mirroring an existing component test: assert the
schema accepts valid props and rejects invalid ones, and that `render` produces the
expected DOM. Then wire it into a gallery example if you want it visible.
