# Security & the trust model

A2UI documents and state deltas are **untrusted** — they may be authored by an LLM or
arrive over MCP. The runtime treats every `RENDER` and `STATE_DELTA` as hostile input
and constrains what it can do. Values below are the constants in `src/validate.ts`,
`src/catalog/*`, and `src/state.ts`.

## Trust model

- **Documents are data, never code.** A document is a JSON envelope; components are
  looked up by type in a fixed catalog. There is no `eval`, no arbitrary HTML, no
  script injection surface — an unknown component type is rejected, not executed.
- **Props are validated per component.** `validateDocument` runs each component's
  props through its Zod schema *and* a defensive recursive bounds scan before the
  runtime renders it. The `RENDER` handler in `AgUiClient` drops any document that
  fails validation.
- **State only changes via JSON-Patch.** `STATE_DELTA` is the sole way to mutate
  surface state, applied with validation and a prototype-pollution guard.

## Document validation caps (DoS / OOM guard)

`validateDocument` rejects a document that exceeds any of these hard bounds, so a
hallucinated or malicious document can't force unbounded rendering work:

| Cap | Limit | Constant |
| --- | --- | --- |
| Total components | 500 | `MAX_COMPONENTS` |
| Any string prop length | 10,000 | `MAX_STRING_LENGTH` |
| Any array length (props) | 5,000 | `MAX_ARRAY_LENGTH` |
| Child-reference nesting depth | 32 | `MAX_NESTING_DEPTH` |

The depth check also detects **reference cycles** (a component graph that loops is
treated as exceeding depth). It additionally verifies `root` exists, every map key
equals its `component.id`, every referenced child exists, and every component type is
in the catalog.

### Per-component render caps

Individual components cap the DOM they can produce:

| Component | Cap |
| --- | --- |
| `grid` | `rows` and `cols` each ≤ 50 (≤ 2500 cells) |
| `table` | `rows` ≤ 1000 |
| `chart` | `data` ≤ 5000 points |

## `STATE_DELTA` — JSON-Patch prototype-pollution guard

`applyStateDelta` (`src/state.ts`) rejects the **entire** patch (no partial apply) if
any op's `path` or `from` contains a forbidden segment — `__proto__`, `constructor`,
or `prototype` — decoding JSON-Pointer escapes (`~0`, `~1`) before comparing. This is
an explicit local guarantee layered on top of `fast-json-patch`'s `validate: true`,
so a dependency change can't silently remove it. A rejected or failed patch leaves
state unchanged.

## Image `src` scheme allowlist

`image` accepts only `https:`, `http:`, or `data:image/` URLs (`isAllowedImageSrc` in
`src/catalog/image.tsx`). `javascript:`, `data:text/html`, `blob:`, `file:`,
`vscode-resource:`, etc. are rejected at schema validation, so a document cannot
smuggle a script-bearing or local-resource src through an image.

## Webview CSP

The runtime is designed to run under a **strict** webview Content-Security-Policy: no
inline scripts beyond the bundle, `img-src` restricted to `https:` and `data:` (which
is why the image allowlist matches), and no arbitrary remote origins. Styles are
injected as a single known `<style>` block per component family (guarded by a fixed
element id), not as inline attributes on untrusted values. The CSP is enforced by the
extension host that mounts the webview; the allowlists above are chosen to be
satisfiable under it.

## What the host still owns

The runtime validates and renders; it does **not** decide whether an `INTERACTION`'s
`action` is allowed to run. Routing an `INTERACTION` to an MCP tool or agent intent —
and any authorization on that — is the extension host's responsibility. Treat the
`action` string as untrusted on the host side too.
