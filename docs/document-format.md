# The A2UI document envelope

An A2UI surface is a single JSON object — the **document envelope**. It is a *flat*,
id-wired map of components plus a little top-level metadata. The runtime validates
every envelope with `validateDocument` before rendering (see
[security.md](./security.md) for the caps it enforces).

## Shape

```ts
interface A2uiDocument {
  version: number;                       // envelope version (currently 1)
  surfaceId: string;                     // stable id for this surface / view
  root: ComponentId;                     // id of the top-level component
  components: Record<ComponentId, A2uiComponent>;
  live?: A2uiLiveBinding;                // optional self-updating data feed
  target?: 'inset' | 'panel' | 'both';   // placement hint (default 'inset')
}

interface A2uiComponent {
  id: ComponentId;                       // must equal the map key
  type: string;                          // a catalog entry key (e.g. 'card')
  props: Record<string, unknown>;        // validated against the type's schema
  children?: ComponentId[];              // (containers also carry ids in props.children)
  binding?: { target: 'mcp' | 'agent'; action: string }; // interactive components
}

interface A2uiLiveBinding {
  stateKey: string;                      // state key the feed writes into
  source: 'demo' | 'mcp';                // simulated feed vs. real MCP resource
  name?: string;                         // MCP resource/tool name or demo label
  intervalMs?: number;                   // tick interval (default 1000)
}
```

## Flat and id-wired

The map is **flat** — every component lives at the top level of `components`, keyed
by its `id` (the key must equal `component.id`). Container-ish components
(`card`, `container`, `form`) reference their children **by id** in
`props.children: string[]`. There is no nesting inside the JSON; the tree is
reconstructed by following those id references from `root`.

```json
{
  "version": 1,
  "surfaceId": "hello-card",
  "root": "card-0",
  "components": {
    "card-0": { "id": "card-0", "type": "card", "props": { "title": "Hello from A2UI", "children": ["text-0"] } },
    "text-0": { "id": "text-0", "type": "text", "props": { "value": "Rendered from one JSON document." } }
  }
}
```

Hand-writing id-wired JSON is tedious, so the package ships a typed authoring SDK
(`doc`, `card`, `text`, …) that lets you write a nested tree and flattens it into
exactly this envelope. See the [README quickstart](../README.md) and the
[binding model](./binding-model.md).

## Top-level fields

- **`version`** — envelope version. The SDK defaults it to `1`.
- **`surfaceId`** — a stable identifier for the surface. `STATE_DELTA` and
  `INTERACTION` messages carry this so the host can route them to the right surface.
- **`root`** — the id of the component to render first.
- **`target`** — where the surface renders. `'inset'` (default) is inline in the
  chat bubble; `'panel'` targets a dedicated webview panel; `'both'` renders in each.
  See [capabilities.md](./capabilities.md#panel-surfaces).
- **`live`** — when present, the host starts a self-updating data feed on render and
  tears it down on dispose. Each tick becomes a `STATE_DELTA` targeting `stateKey`;
  any component `bind`-ed to that key animates. See
  [capabilities.md](./capabilities.md#live-mcp-data).

## Display binding vs. interaction binding

Two different concepts share similar names — keep them straight:

- **`bind`** (a prop on display components like `text`, `chart`, `table`,
  `progress`, `grid`) reads a value *out of* live state: `ctx.state[bind]`.
- **`binding`** (`{ target, action }` on interactive components like `button`,
  `form`, `grid`) sends an event *to* the host when the user acts.

The [binding model doc](./binding-model.md) covers both and the full round-trip.
