# Component catalog

The runtime ships **14 components**. Each has a Zod schema (props are validated on
render), a renderer, and a one-line description surfaced to the model. The props
below are cross-checked against the catalog schemas in `src/catalog/*`.

Two prop families recur:

- **`bind: string`** — display components read their value live from
  `ctx.state[bind]` and re-render on every `STATE_DELTA` touching that key.
- **`binding: { target: 'mcp' | 'agent'; action: string }`** — interactive
  components post an `INTERACTION` to the host on user action.

Examples below use the authoring SDK builders; every builder also accepts an
optional `id`.

## Layout

### `container`
Flex layout. Renders its children in a column (default) or row.
`props: { direction?: 'vertical' | 'horizontal'; gap?: number; children: string[] }`

```ts
container({ direction: 'horizontal', gap: 12 }, status({ state: 'info', label: 'A' }), status({ state: 'info', label: 'B' }))
```

### `card`
Bordered panel with an optional title header.
`props: { title?: string; children: string[] }`

```ts
card({ title: 'Summary' }, text({ value: 'Body' }))
```

## Text & data display

### `text`
Text display. With `bind` set, shows the live `ctx.state[bind]` value; otherwise the
static `value`.
`props: { value?: string; bind?: string }`

```ts
text({ value: 'Static line' })          // or: text({ bind: 'status' })
```

### `chart`
Line / bar / area chart. Set `bind` (or its alias `dataKey`) to a state key for a
live series; falls back to `data` when the bound state is absent or empty. `data` is
capped at 5000 points.
`props: { kind: 'line' | 'bar' | 'area'; bind?: string; dataKey?: string; title?: string; data?: number[] }`
(requires one of `bind`, `dataKey`, or `data`)

```ts
chart({ kind: 'area', title: 'req/s', bind: 'series', data: [4, 8, 6, 12] })
```

### `table`
Themed data table. With `bind` set, rows come from `ctx.state[bind]` (an empty bound
array renders an empty table — no stale fallback); otherwise inline `rows`. `rows` is
capped at 1000.
`props: { columns: string[]; rows?: Array<Array<string | number>>; bind?: string }`

```ts
table({ columns: ['Region', 'Replicas'], rows: [['us-east', 6], ['eu-west', 4]] })
```

### `progress`
Labeled progress bar. `value` (or live `ctx.state[bind]` when set) is clamped to
`0..max`.
`props: { value: number; max?: number; label?: string; bind?: string }` (max default 100)

```ts
progress({ value: 72, max: 100, label: 'Rollout 72%' })
```

### `status`
Status pill with a colored dot; the `running` state pulses.
`props: { state: 'success' | 'warning' | 'error' | 'info' | 'running'; label: string }`

```ts
status({ state: 'running', label: 'Deploying' })
```

### `image`
Image display (`max-width: 100%`). `src` must be an `https:`, `http:`, or
`data:image/` URL (enforced by schema; see [security.md](./security.md)).
`props: { src: string; alt?: string; width?: number; height?: number }`

```ts
image({ src: 'https://example.com/banner.png', alt: 'Banner', width: 320, height: 80 })
```

### `sketch`
Hand-drawn SVG paths with a sequential draw-on animation.
`props: { strokes: string[]; viewBox?: string; color?: string; strokeWidth?: number; durationMs?: number; staggerMs?: number }`
(viewBox default `'0 0 400 150'`, strokeWidth 3, durationMs 700, staggerMs 350)

```ts
sketch({ strokes: ['M 30 120 C 60 40, 140 40, 170 120', 'M 30 120 L 170 120'] })
```

## Interactive

### `button`
Emits an `INTERACTION` on click when `binding` is present (payload `{}`); render-only
without one.
`props: { label: string; binding?: { target: 'mcp' | 'agent'; action: string } }`

```ts
button({ label: 'Refresh', binding: { target: 'mcp', action: 'refresh' } })
```

### `textField`
Local-value text input. Emits `INTERACTION` with `{ value }` on blur when `binding`
is present. Inside a `form` it contributes to the form's submit payload instead.
`props: { name: string; label?: string; placeholder?: string; binding?: { target: 'mcp' | 'agent'; action: string } }`

```ts
textField({ name: 'email', label: 'Email', placeholder: 'you@example.com' })
```

### `select`
Dropdown. Emits `INTERACTION` with `{ value }` on change when `binding` is present.
`props: { name: string; options: Array<{ value: string; label: string }>; binding?: { target: 'mcp' | 'agent'; action: string } }`

```ts
select({ name: 'env', options: [{ value: 'dev', label: 'Dev' }, { value: 'prod', label: 'Prod' }] })
```

### `form`
Gathers child field values and emits `INTERACTION` with `{ values }` on submit.
Children must be `textField` or `select` ids. `binding` is **required**.
`props: { submitLabel?: string; children: string[]; binding: { target: 'mcp' | 'agent'; action: string } }`

```ts
form({ submitLabel: 'Save', binding: { target: 'mcp', action: 'save' } },
  textField({ name: 'title', label: 'Title' }),
  select({ name: 'env', options: [{ value: 'dev', label: 'Dev' }] }),
)
```

### `grid`
Clickable `rows × cols` grid of cells (e.g. theatre seats). Cell ids are `r{row}c{col}`
(0-based, row-major). With `bind` set, `ctx.state[bind]` maps cell id →
`'available' | 'taken' | 'selected'` (absent cells default to available). `available`
and `selected` cells are clickable and emit `INTERACTION` with `{ cellId }` when
`binding` is present; `taken` cells are disabled. Clicking optimistically selects the
cell locally until bound state confirms. `rows`/`cols` are capped at 50.
`props: { rows: number; cols: number; bind?: string; binding?: { target: 'mcp' | 'agent'; action: string }; cellLabels?: string[] }`

```ts
grid({ rows: 3, cols: 6, bind: 'seats', binding: { target: 'agent', action: 'selectSeat' } })
```

## Adding your own

See [extending.md](./extending.md) to add a catalog component (schema + renderer +
registration).
