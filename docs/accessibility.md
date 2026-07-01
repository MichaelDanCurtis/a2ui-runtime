# Accessibility

A2UI insets render inside the chat transcript as interactive webview surfaces. This page describes how they are announced to assistive technology, how to author accessible documents, and the current limitations.

## What the runtime does

- Each inset container carries `role="group"` and a localized `aria-label` ("Interactive generative UI") so a screen reader announces it as a distinct interactive region within the chat response.
- Interactive components use native, focusable elements: `button` → `<button>`, `textField` → `<input>`, `select` → `<select>`, and `grid` cells are `<button>`s (marked `disabled` when `taken`). These are keyboard-focusable and announced with their labels.
- Text alternatives are first-class: `image` accepts `alt`; `status` renders its `label` as text (state is never conveyed by color alone); `text` is real text, not an image.

## Authoring guidance

- Always set `alt` on `image`, a `label` on `button` / `textField` / `select` / `status`, and a `title` on `chart` / `grid`.
- Never rely on color alone to convey meaning (e.g. seat available/taken, status success/error) — pair it with a label or text so it is perceivable without color vision.
- Keep interactive targets keyboard-reachable. The built-in components are; any custom catalog component you add (see [extending.md](extending.md)) should render focusable, labeled controls too.
- For a `chart` or `sketch` that carries important data, provide a `title` and consider a companion `text`/`table` summary of the underlying numbers.

## Known limitations / follow-ups

- There is not yet a **non-webview accessible alternative view** for users who cannot interact with embedded webviews, nor an entry in VS Code's chat accessibility-help that describes how to discover and navigate insets. The webview content itself is keyboard- and screen-reader-navigable, but a first-class accessible-view path is future work (tracked in the core PR discussion).
