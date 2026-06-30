import { createRoot } from 'react-dom/client';
import { createElement, Fragment } from 'react';
import { AgUiClient } from './agUiClient';
import { catalog } from './catalog';
import type { HostToInsetMessage, InsetToHostMessage } from './protocol';

export function mountRuntime(
  root: HTMLElement,
  transport: { postMessage(m: InsetToHostMessage): void; onMessage(cb: (m: HostToInsetMessage) => void): void },
) {
  const client = new AgUiClient();
  const reactRoot = createRoot(root);
  const surfaceId = () => client.doc?.surfaceId ?? '';
  const ctx = {
    get state() { return client.state; },
    emit: (componentId: string, binding: { target: 'mcp' | 'agent'; action: string }, payload: unknown) =>
      transport.postMessage({ type: 'INTERACTION', surfaceId: surfaceId(), componentId, binding: binding.target, payload }),
    getComponent: (id: string) => client.doc?.components[id],
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
