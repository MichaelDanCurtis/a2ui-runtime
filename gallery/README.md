# A2UI Live Gallery

A standalone, no-build page that mounts the **real** A2UI webview runtime and drives
it with a **fake host transport** — the same messages VS Code's extension host would
send, implemented in the browser so you can see documents render, interact, and
animate without an editor.

## Run it

The gallery loads the compiled IIFE bundle, so build the package once first:

```bash
cd packages/a2ui-runtime
npm run build          # produces dist/runtime.iife.js (global A2uiRuntime)
```

Then open `gallery/index.html` in a browser (double-click it, or serve the folder
with any static server, e.g. `npx serve gallery`). No bundler or dev server is
required — `index.html` loads `../dist/runtime.iife.js` then `gallery.js`
(an ES module that imports `./examples.js`).

If the render pane shows "A2uiRuntime global not found", the `dist/` bundle is
missing — run `npm run build` and reload.

## What you're looking at

- **Sidebar** — the canonical example set from `examples.js` (also used by the docs).
- **Render pane** — the live runtime, mounted via `A2uiRuntime.mountRuntime`.
- **Document JSON** — toggle to see the exact validated envelope being rendered.
- **Message log** — every `INTERACTION` / `READY` / `RESIZE` the inset posts to the
  host, plus the `RENDER` / `STATE_DELTA` messages the fake host feeds back.

The fake host answers interactions (the counter button, seat-grid clicks) with a
`STATE_DELTA`, and for `live` examples pushes a `STATE_DELTA` on an interval so the
bound chart animates — mirroring the host's SnapshotSource → STATE_DELTA path.

Examples are validated in CI by `examples.validate.test.ts` against the same
`validateDocument` the runtime runs on every `RENDER`.
