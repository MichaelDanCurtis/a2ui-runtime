import { z } from 'zod';
import type { CatalogEntry, RenderContext } from './catalogEntry';

const gridSchema = z.object({
  rows: z.number(),
  cols: z.number(),
  bind: z.string().optional(),
  binding: z.object({ target: z.enum(['mcp', 'agent']), action: z.string() }).optional(),
  cellLabels: z.array(z.string()).optional(),
});

type CellState = 'available' | 'taken' | 'selected';

const GRID_STYLE_ID = 'a2ui-grid-styles';
const GRID_CSS = `
.a2ui-grid { display: grid; gap: 4px; }
.a2ui-grid-cell { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; min-height: 28px; padding: 4px; border-radius: 4px; font-size: 12px; border: 1px solid var(--vscode-widget-border, #454545); background: var(--vscode-editorWidget-background, #252526); color: var(--vscode-foreground); box-sizing: border-box; }
.a2ui-grid-cell--available { cursor: pointer; }
.a2ui-grid-cell--available:hover { border-color: var(--vscode-focusBorder, #58a6ff); }
.a2ui-grid-cell--taken { opacity: 0.4; cursor: not-allowed; background: var(--vscode-editor-inactiveSelectionBackground, #3a3d41); }
.a2ui-grid-cell--selected { cursor: pointer; background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #fff); border-color: var(--vscode-button-background, #0e639c); }
`;

function injectGridStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GRID_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GRID_STYLE_ID;
  style.textContent = GRID_CSS;
  document.head.appendChild(style);
}

export const gridEntry: CatalogEntry = {
  type: 'grid',
  schema: gridSchema,
  description:
    'Clickable rows x cols grid of cells (e.g. theatre seats). props: { rows: number, cols: number, bind?: string, binding?: { target: mcp|agent, action: string }, cellLabels?: string[] }. Cell ids follow r{row}c{col} 0-based (e.g. r0c0 top-left). When bind is set, ctx.state[bind] is an object mapping cellId to available|taken|selected (cells absent default to available, re-renders on STATE_DELTA); unset means all available. cellLabels[i] labels cell i (row-major) else the cellId. available and selected cells are clickable and emit an INTERACTION with { cellId } when binding is present; taken cells are disabled.',
  render: (c, ctx: RenderContext) => {
    const parsed = gridSchema.safeParse(c.props);
    if (!parsed.success) return null;
    injectGridStyles();
    const { rows, cols, bind, binding, cellLabels } = parsed.data;

    const stateMapRaw = bind !== undefined ? ctx.state[bind] : undefined;
    const stateMap: Record<string, unknown> =
      stateMapRaw && typeof stateMapRaw === 'object' ? (stateMapRaw as Record<string, unknown>) : {};

    const cells: React.ReactNode[] = [];
    let index = 0;
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const cellId = `r${r}c${col}`;
        const raw = stateMap[cellId];
        const state: CellState =
          raw === 'taken' || raw === 'selected' ? (raw as CellState) : 'available';
        const label = cellLabels?.[index] ?? cellId;
        const clickable = state === 'available' || state === 'selected';
        cells.push(
          <button
            key={cellId}
            type="button"
            data-cell-id={cellId}
            className={`a2ui-grid-cell a2ui-grid-cell--${state}`}
            disabled={state === 'taken'}
            onClick={() => {
              if (clickable && binding) {
                ctx.emit(cellId, binding, { cellId });
              }
            }}
          >
            {label}
          </button>,
        );
        index++;
      }
    }

    return (
      <div
        className="a2ui-grid"
        style={{ gridTemplateColumns: `repeat(${cols}, max-content)` }}
        role="grid"
      >
        {cells}
      </div>
    );
  },
};
