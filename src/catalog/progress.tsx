import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const progressSchema = z.object({
  value: z.number(),
  max: z.number().optional(),
  label: z.string().optional(),
  bind: z.string().optional(),
});

const PROGRESS_STYLE_ID = 'a2ui-progress-styles';
const PROGRESS_CSS = `
.a2ui-progress { width: 100%; }
.a2ui-progress-label { font-size: 12px; margin-bottom: 4px; color: var(--vscode-foreground); }
.a2ui-progress-track { height: 6px; background: var(--vscode-editorWidget-background, #252526); border-radius: 3px; overflow: hidden; border: 1px solid var(--vscode-widget-border, #454545); }
.a2ui-progress-fill { height: 100%; background: var(--vscode-progressBar-background, #0e70c0); border-radius: 3px; transition: width 0.2s ease; }
`;

function injectProgressStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(PROGRESS_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PROGRESS_STYLE_ID;
  style.textContent = PROGRESS_CSS;
  document.head.appendChild(style);
}

export const progressEntry: CatalogEntry = {
  type: 'progress',
  schema: progressSchema,
  description: 'Labeled progress bar. props: { value: number, max?: number (default 100), label?: string, bind?: string }. When bind is set, value is read from ctx.state[bind] (re-renders on STATE_DELTA); value is clamped to 0..max.',
  render: (c, ctx) => {
    const parsed = progressSchema.safeParse(c.props);
    if (!parsed.success) return null;
    injectProgressStyles();
    const { max = 100, label, bind } = parsed.data;
    const rawValue = bind !== undefined && typeof ctx.state[bind] === 'number'
      ? (ctx.state[bind] as number)
      : parsed.data.value;
    const clamped = Math.max(0, Math.min(rawValue, max));
    const pct = max > 0 ? (clamped / max) * 100 : 0;
    return (
      <div className="a2ui-progress">
        {label && <div className="a2ui-progress-label">{label}</div>}
        <div className="a2ui-progress-track">
          <div className="a2ui-progress-fill" style={{ width: `${pct.toFixed(1)}%` }} />
        </div>
      </div>
    );
  },
};
