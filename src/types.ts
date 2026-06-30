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

export interface A2uiDocument {
  version: number;
  surfaceId: string;
  root: ComponentId;
  components: Record<ComponentId, A2uiComponent>;
}
