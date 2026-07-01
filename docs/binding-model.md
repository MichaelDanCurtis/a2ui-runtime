# The binding model: `bind` vs. `binding`

A2UI has two directions of data flow, named similarly. Getting them straight is the
key to reading any document.

| Concept | Where | Direction | Purpose |
| --- | --- | --- | --- |
| **`bind`** (prop, a string) | display components: `text`, `chart`, `table`, `progress`, `grid` | host → inset | Read a value *out of* live state (`ctx.state[bind]`) and re-render when it changes. |
| **`binding`** (object `{ target, action }`) | interactive components: `button`, `form`, `grid`, `textField`, `select` | inset → host | Send a user action *to* the host to be routed. |

## `bind` — display binding (host → inset)

A display component with `bind: 'series'` reads `ctx.state['series']` at render time.
The runtime holds that state and re-renders bound components whenever a `STATE_DELTA`
mutates the key. State starts empty and is only ever changed by `STATE_DELTA`
messages from the host (a `RENDER` resets the document but not necessarily state; a
`DISPOSE` clears both).

```ts
chart({ kind: 'area', bind: 'series', data: [1, 2, 3] })
// Before any STATE_DELTA: renders the fallback `data`.
// After STATE_DELTA sets /series: renders the live series and re-renders on each update.
```

`STATE_DELTA` carries a **JSON-Patch** (RFC 6902) array in `patch`, applied to the
surface's state:

```jsonc
{ "type": "STATE_DELTA", "surfaceId": "live-chart",
  "patch": [{ "op": "replace", "path": "/series", "value": [10, 12, 14, 18] }] }
```

## `binding` — interaction binding (inset → host)

An interactive component carries `binding: { target: 'mcp' | 'agent', action: string }`.
On the user action, the runtime posts an `INTERACTION` message:

```ts
{ type: 'INTERACTION', surfaceId, componentId, binding: /* the target */ 'mcp' | 'agent',
  action, payload }
```

- **`target: 'mcp'`** — the host routes `action` to an MCP tool of that name.
- **`target: 'agent'`** — the host routes `action` as an agent intent keyword.

Payload by component:

| Component | Action trigger | `payload` |
| --- | --- | --- |
| `button` | click | `{}` |
| `textField` | blur (standalone) | `{ value }` |
| `select` | change | `{ value }` |
| `form` | submit | `{ values: Record<string, string> }` |
| `grid` | click an available/selected cell | `{ cellId }` |

## The interaction round-trip (reverse channel)

`bind` and `binding` compose into a full loop. The reverse channel is simply: the
host answers an `INTERACTION` with a `STATE_DELTA` that updates the keys the document
is `bind`-ed to. Nothing re-renders the document — only state changes.

```
1. Document renders.  A `button` has binding { target:'mcp', action:'increment' };
   two `text` nodes are bound to `clicks` and `lastAction`.

2. User clicks.  Runtime → host:
     { type:'INTERACTION', surfaceId, componentId:'button-0', binding:'mcp',
       action:'increment', payload:{} }

3. Host runs the tool, then answers on the reverse channel.  Host → runtime:
     { type:'STATE_DELTA', surfaceId,
       patch:[ { op:'add', path:'/clicks', value:'Clicks: 1' },
               { op:'add', path:'/lastAction', value:'Last action: increment' } ] }

4. Runtime applies the patch; the bound `text` nodes re-render.  No new RENDER.
```

The `grid` extends this with **optimistic selection**: clicking an `available` cell
flips it to `selected` locally *immediately*, then still emits the `INTERACTION`.
Authoritative bound state wins — a later `STATE_DELTA` marking that cell `taken` (or
anything else) overrides the local optimism. This keeps clicks feeling instant
without waiting for the round-trip.

You can see every message in this loop live in the [gallery](../gallery/README.md)
message log (the "Interaction counter" and "Seat grid" examples).
