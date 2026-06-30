import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

// `rows` is capped at 1000 so an untrusted document cannot force millions of
// <td> nodes into the DOM.
const tableSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(z.union([z.string(), z.number()]))).max(1000).optional(),
  bind: z.string().optional(),
});

const TABLE_STYLE_ID = 'a2ui-table-styles';
const TABLE_CSS = `
.a2ui-table { border-collapse: collapse; width: 100%; font-size: 13px; }
.a2ui-table th, .a2ui-table td { padding: 4px 8px; text-align: left; border: 1px solid var(--vscode-widget-border, #454545); }
.a2ui-table th { background: var(--vscode-editorWidget-background, #252526); color: var(--vscode-foreground); font-weight: 600; }
.a2ui-table td { color: var(--vscode-foreground); }
`;

function injectTableStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(TABLE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TABLE_STYLE_ID;
  style.textContent = TABLE_CSS;
  document.head.appendChild(style);
}

export const tableEntry: CatalogEntry = {
  type: 'table',
  schema: tableSchema,
  description: 'Themed data table. props: { columns: string[], rows?: Array<Array<string|number>>, bind?: string }. When bind is set, rows come from ctx.state[bind] (re-renders on STATE_DELTA); falls back to inline rows.',
  render: (c, ctx) => {
    const parsed = tableSchema.safeParse(c.props);
    if (!parsed.success) return null;
    injectTableStyles();
    const { columns, rows: inlineRows, bind } = parsed.data;
    const liveRows = bind !== undefined ? ctx.state[bind] : undefined;
    // When bound, trust the live array even if empty: a STATE_DELTA clearing the
    // table to [] must render an empty table, not fall back to stale inline rows.
    // Only fall back to inline rows when there is no binding or the bound state
    // value is not (yet) an array.
    const rows: Array<Array<string | number>> = bind !== undefined && Array.isArray(liveRows)
      ? (liveRows as Array<Array<string | number>>)
      : (inlineRows ?? []);
    return (
      <table className="a2ui-table">
        <thead>
          <tr>{columns.map((col, i) => <th key={i}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>{row.map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  },
};
