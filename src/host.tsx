import { createRoot } from 'react-dom/client';
import { createElement, Fragment } from 'react';
import { AgUiClient } from './agUiClient';
import { catalog } from './catalog';
import type { HostToInsetMessage, InsetToHostMessage } from './protocol';

const A2UI_STYLE_ID = 'a2ui-theme-styles';

const A2UI_CSS = `
.a2ui-root {
  font-family: var(--vscode-font-family, sans-serif);
  color: var(--vscode-foreground, #ccc);
  padding: 8px;
  box-sizing: border-box;
}
.a2ui-container {
  display: flex;
  box-sizing: border-box;
}
.a2ui-container--vertical {
  flex-direction: column;
}
.a2ui-container--horizontal {
  flex-direction: row;
}
.a2ui-card {
  border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.35));
  border-radius: 6px;
  padding: 12px 16px;
  background: var(--vscode-editorWidget-background, rgba(0,0,0,0.1));
  box-sizing: border-box;
}
.a2ui-card-title {
  font-weight: bold;
  font-size: 1.05em;
  margin-bottom: 8px;
}
.a2ui-button {
  padding: 4px 12px;
  background: var(--vscode-button-background, #0e639c);
  color: var(--vscode-button-foreground, #fff);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 0.9em;
}
.a2ui-button:hover {
  background: var(--vscode-button-hoverBackground, #1177bb);
}
.a2ui-text {
  font-family: var(--vscode-font-family, sans-serif);
  color: var(--vscode-foreground, #ccc);
}
.a2ui-textfield {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.a2ui-textfield label {
  font-size: 0.85em;
  color: var(--vscode-foreground, #ccc);
}
.a2ui-textfield input {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.35));
  border-radius: 3px;
  padding: 3px 6px;
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 0.9em;
}
.a2ui-select {
  background: var(--vscode-input-background, #3c3c3c);
  color: var(--vscode-input-foreground, #ccc);
  border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.35));
  border-radius: 3px;
  padding: 3px 6px;
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 0.9em;
}
.a2ui-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.a2ui-chart {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.a2ui-chart-title {
  font-size: 0.85em;
  font-weight: bold;
  color: var(--vscode-foreground, #ccc);
}
`;

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(A2UI_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = A2UI_STYLE_ID;
  style.textContent = A2UI_CSS;
  document.head.appendChild(style);
}

export function mountRuntime(
  root: HTMLElement,
  transport: { postMessage(m: InsetToHostMessage): void; onMessage(cb: (m: HostToInsetMessage) => void): void },
) {
  injectStyles();
  const client = new AgUiClient();
  const reactRoot = createRoot(root);
  const surfaceId = () => client.doc?.surfaceId ?? '';
  const ctx = {
    get state() { return client.state; },
    emit: (componentId: string, binding: { target: 'mcp' | 'agent'; action: string }, payload: unknown) =>
      transport.postMessage({ type: 'INTERACTION', surfaceId: surfaceId(), componentId, binding: binding.target, payload }),
    getComponent: (id: string) => client.doc?.components[id],
    renderChild: (id: string) => renderNode(id),
  };
  function renderNode(id: string): any {
    const comp = client.doc?.components[id]; if (!comp) { return null; }
    const entry = catalog[comp.type]; if (!entry) { return null; }
    return createElement(Fragment, { key: id }, entry.render(comp, ctx as any));
  }
  function paint() {
    const r = client.doc?.root;
    reactRoot.render(r ? renderNode(r) : null);
  }
  client.subscribe(paint);
  transport.onMessage(m => client.handle(m));
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => transport.postMessage({ type: 'RESIZE', surfaceId: surfaceId(), height: root.scrollHeight }))
      .observe(root);
  }
  transport.postMessage({ type: 'READY', surfaceId: surfaceId() });
}

export function bootstrapFromVsCodeApi() {
  const vscode = (globalThis as any).acquireVsCodeApi?.();
  const root = document.getElementById('root')!;
  const listeners: ((m: any) => void)[] = [];
  window.addEventListener('message', (e) => listeners.forEach(cb => cb(e.data)));
  mountRuntime(root, { postMessage: m => vscode.postMessage(m), onMessage: cb => listeners.push(cb) });
}
if (typeof document !== 'undefined' && (globalThis as any).acquireVsCodeApi) { bootstrapFromVsCodeApi(); }
