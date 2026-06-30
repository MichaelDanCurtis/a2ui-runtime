import type { HostToInsetMessage } from './protocol';
import type { A2uiDocument } from './types';
import { validateDocument } from './validate';
import { applyStateDelta } from './state';

export class AgUiClient {
  private _doc?: A2uiDocument;
  private _state: Record<string, unknown> = {};
  private _subs = new Set<() => void>();
  get doc() { return this._doc; }
  get state() { return this._state; }
  subscribe(cb: () => void) { this._subs.add(cb); }
  private _notify() { for (const cb of this._subs) { cb(); } }
  handle(msg: HostToInsetMessage): void {
    if (msg.type === 'RENDER') {
      if (validateDocument(msg.doc).ok) { this._doc = msg.doc; this._notify(); }
    } else if (msg.type === 'STATE_DELTA') {
      const r = applyStateDelta(this._state, msg.patch);
      if ('state' in r) { this._state = r.state; this._notify(); }
    } else if (msg.type === 'DISPOSE') {
      this._doc = undefined; this._state = {}; this._notify();
    }
  }
}
