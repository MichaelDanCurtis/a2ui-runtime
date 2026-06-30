import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const chartSchema = z.object({
  dataKey: z.string(),
  kind: z.enum(['line', 'bar']),
  title: z.string().optional(),
});

const W = 300;
const H = 100;
const PAD = 8;

function toNumbers(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is number => typeof v === 'number');
}

function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => (v - min) / range);
}

function LineChart({ values, title }: { values: number[]; title?: string }) {
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const norm = normalize(values);

  const points =
    norm.length === 0
      ? ''
      : norm
          .map((v, i) => {
            const x = PAD + (i / Math.max(norm.length - 1, 1)) * innerW;
            const y = PAD + (1 - v) * innerH;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(' ');

  return (
    <div className="a2ui-chart a2ui-chart--line">
      {title && <div className="a2ui-chart-title">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-label={title ?? 'line chart'}>
        {points ? (
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          />
        ) : null}
      </svg>
    </div>
  );
}

function BarChart({ values, title }: { values: number[]; title?: string }) {
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const norm = normalize(values);
  const n = norm.length;
  const gap = 2;
  const barW = n === 0 ? 0 : Math.max(1, (innerW - gap * (n - 1)) / n);

  return (
    <div className="a2ui-chart a2ui-chart--bar">
      {title && <div className="a2ui-chart-title">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-label={title ?? 'bar chart'}>
        {norm.map((v, i) => {
          const barH = Math.max(1, v * innerH);
          const x = PAD + i * (barW + gap);
          const y = PAD + innerH - barH;
          return (
            <rect
              key={i}
              x={x.toFixed(1)}
              y={y.toFixed(1)}
              width={barW.toFixed(1)}
              height={barH.toFixed(1)}
              fill="currentColor"
            />
          );
        })}
      </svg>
    </div>
  );
}

export const chartEntry: CatalogEntry = {
  type: 'chart',
  schema: chartSchema,
  description:
    'Data visualization chart. props: { dataKey: string, kind: "line"|"bar", title?: string }.' +
    ' Data comes from ctx.state[props.dataKey] (an array of numbers) — populated live by STATE_DELTA patches,' +
    ' so the chart updates automatically as MCP streams new values with no model involvement.',
  render: (c, ctx) => {
    const parsed = chartSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { dataKey, kind, title } = parsed.data;
    const raw = ctx.state[dataKey];
    const values = toNumbers(raw);
    return kind === 'bar'
      ? <BarChart values={values} title={title} />
      : <LineChart values={values} title={title} />;
  },
};
