# Capabilities

What the A2UI runtime can do, and how each capability is wired.

## In-bubble render

The runtime mounts into any host element via `mountRuntime(rootEl, transport)` and
renders a document as soon as it receives a `RENDER` message. In VS Code this element
is an **inset** inside the chat bubble; in the [gallery](../gallery/README.md) it is a
plain `<div>`. The runtime is transport-agnostic: it only knows the message protocol,
not the host.

```
host → inset:  { type: 'RENDER', doc }
```

On mount the runtime posts `READY`; a host typically waits for `READY` before sending
the first `RENDER`. Styles are injected once (theme-aware, reading `--vscode-*` CSS
variables), so surfaces match the surrounding editor theme.

## Interaction round-trip

Interactive components (`button`, `form`, `select`, `textField`, `grid`) post an
`INTERACTION` to the host; the host runs a tool or agent intent and answers with a
`STATE_DELTA` that updates the state the document is bound to. See the full loop in
[binding-model.md](./binding-model.md#the-interaction-round-trip-reverse-channel).

```
inset → host:  { type: 'INTERACTION', surfaceId, componentId, binding, action, payload }
host → inset:  { type: 'STATE_DELTA', surfaceId, patch }   // the reverse channel
```

## Live MCP data

A document with a top-level `live` binding gets a self-updating data feed:

```ts
doc({ surfaceId: 'live-chart', live: { stateKey: 'series', source: 'demo', intervalMs: 1000 } },
  card({ title: 'Live throughput' }, chart({ kind: 'area', bind: 'series' })))
```

On render the host starts a feed and tears it down on dispose. Each tick flows:

```
SnapshotSource (per tick)  →  McpDataPipe (diff into JSON-Patch)  →  STATE_DELTA(stateKey)  →  bound component re-renders
```

- **`source: 'demo'`** — a simulated `IntervalSnapshotSource` producing an evolving
  series (great for previews and the gallery).
- **`source: 'mcp'`** — a real `McpResourceSnapshotSource` polling the named MCP
  resource; falls back to the demo source when no MCP client is wired.

The chart (or any `bind`-ed component) needs no user interaction to animate — it just
reflects the state the feed writes. The gallery reproduces this exactly: for `live`
examples it pushes a `STATE_DELTA` on `intervalMs` that grows the bound series.

## Panel surfaces, multi-view, and `target`

The document's `target` field is a placement hint:

- **`'inset'`** (default when absent) — render inline in the chat bubble.
- **`'panel'`** — render in a dedicated webview panel (more room; good for grids,
  dashboards, multi-view surfaces).
- **`'both'`** — render in the inset *and* the panel; the same `surfaceId` keeps them
  in sync, so a `STATE_DELTA` updates every view of that surface at once.

Because a surface is addressed by `surfaceId`, multiple mounted views of the same
surface all receive the same `RENDER` / `STATE_DELTA` traffic — that is the basis for
multi-view (e.g. an inset summary plus a full panel). The "Seat grid" gallery example
uses `target: 'panel'`.

## Lifecycle summary

| Message | Direction | Effect |
| --- | --- | --- |
| `RENDER` | host → inset | Validate + set the document, paint from `root`. |
| `STATE_DELTA` | host → inset | Apply a JSON-Patch to surface state; re-render bound components. |
| `DISPOSE` | host → inset | Clear the document and state (feed torn down). |
| `READY` | inset → host | Runtime mounted and ready for a `RENDER`. |
| `INTERACTION` | inset → host | A user acted on an interactive component. |
| `RESIZE` | inset → host | Content height changed (host can resize the inset). |
