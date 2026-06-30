import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const statusSchema = z.object({
  state: z.enum(['success', 'warning', 'error', 'info', 'running']),
  label: z.string(),
});

const STATUS_STYLE_ID = 'a2ui-status-styles';
const STATUS_CSS = `
@keyframes a2ui-pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
.a2ui-status { display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--vscode-widget-border, #454545); color: var(--vscode-foreground); }
.a2ui-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.a2ui-status--success .a2ui-status-dot { background: #3fb950; }
.a2ui-status--warning .a2ui-status-dot { background: #d29922; }
.a2ui-status--error .a2ui-status-dot { background: #f85149; }
.a2ui-status--info .a2ui-status-dot { background: #58a6ff; }
.a2ui-status--running .a2ui-status-dot { background: #58a6ff; animation: a2ui-pulse 1.2s ease-in-out infinite; }
`;

function injectStatusStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STATUS_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STATUS_STYLE_ID;
  style.textContent = STATUS_CSS;
  document.head.appendChild(style);
}

export const statusEntry: CatalogEntry = {
  type: 'status',
  schema: statusSchema,
  description: 'Status pill badge with colored dot. props: { state: success|warning|error|info|running, label: string }. The dot color encodes the state; running state pulses.',
  render: (c, _ctx) => {
    const parsed = statusSchema.safeParse(c.props);
    if (!parsed.success) return null;
    injectStatusStyles();
    const { state, label } = parsed.data;
    return (
      <span className={`a2ui-status a2ui-status--${state}`}>
        <span className="a2ui-status-dot" aria-hidden="true" />
        {label}
      </span>
    );
  },
};
