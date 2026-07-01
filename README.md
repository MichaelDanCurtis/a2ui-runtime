# `@copilot/a2ui-runtime`

A small, self-contained runtime that renders **A2UI documents** — declarative JSON UI
surfaces — inside a VS Code webview. An agent (or MCP tool) emits a document; the
runtime renders it into a chat inset or a panel, streams live data into it, and posts
user interactions back to the host.

## What it is

- A **document format**: a flat, id-wired JSON envelope of components
  ([docs/document-format.md](docs/document-format.md)).
- A **component catalog** of 14 themed, validated components
  ([docs/components.md](docs/components.md)).
- A **webview runtime** that mounts a document, applies live `STATE_DELTA`s, and
  round-trips interactions ([docs/capabilities.md](docs/capabilities.md)).
- A typed **authoring SDK** so you write a nested tree instead of hand-wiring ids.

Every document — whoever authored it — is validated against hard caps before it
renders ([docs/security.md](docs/security.md)).

## How to consume it

The webview bundle is built to `dist/runtime.iife.js` and exposes a global
`A2uiRuntime`. The extension/core side hosts a webview, loads that bundle, and calls
`A2uiRuntime.mountRuntime(rootEl, transport)` — where `transport` is
`{ postMessage(msg), onMessage(cb) }` — then feeds the runtime `RENDER` /
`STATE_DELTA` messages and listens for the `READY` / `INTERACTION` / `RESIZE`
messages it posts back (in VS Code the transport is just `acquireVsCodeApi()`, wired
automatically by `bootstrapFromVsCodeApi` when a `#root` element and
`acquireVsCodeApi` are present). Author-side code imports the SDK from the package
(`@copilot/a2ui-runtime`) to build documents, which are the payload of those `RENDER`
messages.

## Quickstart

Author a document with the SDK:

```ts
import { doc, card, text } from '@copilot/a2ui-runtime';

const surface = doc(
  { surfaceId: 'hello-card', target: 'inset' },
  card({ title: 'Hello from A2UI' },
    text({ value: 'This card and its text were rendered from a single JSON document.' })),
);
// `doc(...)` throws if the assembled envelope is invalid; use `safeDoc(...)` for a
// { ok, doc | errors } result instead.
```

`surface` is exactly this validated envelope (the same thing you'd send in a
`RENDER`):

```json
{
  "version": 1,
  "surfaceId": "hello-card",
  "target": "inset",
  "root": "card-0",
  "components": {
    "card-0": { "id": "card-0", "type": "card", "props": { "title": "Hello from A2UI", "children": ["text-0"] } },
    "text-0": { "id": "text-0", "type": "text", "props": { "value": "This card and its text were rendered from a single JSON document." } }
  }
}
```

Send it to a mounted runtime:

```ts
transport.postMessage({ type: 'RENDER', doc: surface });
```

## Docs

- [Document format](docs/document-format.md) — the envelope, flat + id-wired.
- [Components](docs/components.md) — all 14 components with props and examples.
- [Binding model](docs/binding-model.md) — `bind` (display) vs. `binding`
  (interaction), and the round-trip.
- [Capabilities](docs/capabilities.md) — in-bubble render, interaction round-trip,
  live MCP data, panel surfaces + `target`.
- [Extending](docs/extending.md) — add your own catalog component.
- [Security](docs/security.md) — validation caps and trust model.
- [Accessibility](docs/accessibility.md) — how insets are announced + authoring guidance.

## Live gallery

A no-build page that mounts the real runtime against a fake host transport and shows
every canonical example rendering, interacting, and animating. Build once, then open
the page:

```bash
npm run build            # produces dist/runtime.iife.js
open gallery/index.html  # or: npx serve gallery
```

See [gallery/README.md](gallery/README.md). The examples it uses live in
`gallery/examples.js` and are validation-tested in
`gallery/examples.validate.test.ts`.
