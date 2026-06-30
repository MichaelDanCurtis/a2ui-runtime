export type ComponentId = string;

export interface Binding {
  target: 'mcp' | 'agent';
  /** MCP tool name or agent intent keyword the extension routes on. */
  action: string;
}

export interface A2uiComponent {
  id: ComponentId;
  type: string;                       // must match a catalog entry key
  props: Record<string, unknown>;
  children?: ComponentId[];
  binding?: Binding;                  // present only on interactive components
}

/**
 * Optional document-level live-data binding.
 *
 * When present, the host starts a pluggable data feed on render and tears it
 * down when the surface is disposed. Each tick the feed produces a snapshot
 * which the McpDataPipe diffs into a STATE_DELTA targeting `stateKey`; a chart
 * (or text) bound to that key animates with no user interaction.
 *
 *  - `source: 'demo'` → a simulated IntervalSnapshotSource (evolving series).
 *  - `source: 'mcp'`  → a real McpResourceSnapshotSource polling `name` on an
 *                       MCP client; falls back to demo when no client is wired.
 */
export interface A2uiLiveBinding {
  /** State key the feed writes into (the chart's `bind` should match this). */
  stateKey: string;
  /** Which data source backs the feed. */
  source: 'demo' | 'mcp';
  /** MCP tool/resource name (source === 'mcp') or demo generator label. */
  name?: string;
  /** Tick interval in milliseconds (default 1000). */
  intervalMs?: number;
}

export interface A2uiDocument {
  version: number;
  surfaceId: string;
  root: ComponentId;
  components: Record<ComponentId, A2uiComponent>;
  /** Optional live-data binding; starts a self-updating feed on render. */
  live?: A2uiLiveBinding;
  /**
   * Optional surface placement hint. Absent is treated as 'inset' (rendered
   * inline in the chat). 'panel' targets a dedicated webview panel; 'both'
   * renders in the inset and the panel.
   */
  target?: 'inset' | 'panel' | 'both';
}
