import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const chartSchema = z
  .object({
    // `bind` is the canonical live-data prop: the chart's series is read from
    // ctx.state[bind] and re-renders on every STATE_DELTA touching that key.
    // `dataKey` is the original name and remains an accepted alias.
    bind: z.string().optional(),
    dataKey: z.string().optional(),
    kind: z.enum(['line', 'bar', 'area']),
    title: z.string().optional(),
    data: z.array(z.number()).optional(),
  })
  .refine(c => typeof c.bind === 'string' || typeof c.dataKey === 'string' || Array.isArray(c.data), {
    message: 'chart requires one of: bind, dataKey, or data',
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

function AreaChart({ values, title }: { values: number[]; title?: string }) {
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const norm = normalize(values);

  if (norm.length === 0) {
    return (
      <div className="a2ui-chart a2ui-chart--area">
        {title && <div className="a2ui-chart-title">{title}</div>}
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-label={title ?? 'area chart'} />
      </div>
    );
  }

  const pts = norm.map((v, i) => {
    const x = PAD + (i / Math.max(norm.length - 1, 1)) * innerW;
    const y = PAD + (1 - v) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const firstX = (PAD).toFixed(1);
  const lastX = (PAD + innerW).toFixed(1);
  const baseY = (PAD + innerH).toFixed(1);
  const polyPoints = pts.join(' ');
  const areaPath = `M ${firstX},${baseY} L ${pts[0]} ${norm.slice(1).map((_, i) => `L ${pts[i + 1]}`).join(' ')} L ${lastX},${baseY} Z`;

  return (
    <div className="a2ui-chart a2ui-chart--area">
      {title && <div className="a2ui-chart-title">{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-label={title ?? 'area chart'}>
        <path d={areaPath} fill="currentColor" fillOpacity={0.2} stroke="none" />
        <polyline points={polyPoints} fill="none" stroke="currentColor" strokeWidth={2} />
      </svg>
    </div>
  );
}

export const chartEntry: CatalogEntry = {
  type: 'chart',
  schema: chartSchema,
  // Catalog descriptions must be single-line plain text with no literal newlines or double-quotes
  // (they are injected as prompt lines and searched verbatim in JSON-stringified prompt output).
  description:
    'Data visualization chart. props: { bind?: string, dataKey?: string, kind: line|bar|area, title?: string, data?: number[] }.' +
    ' Set bind (or its alias dataKey) to a state key; the series is read live from ctx.state[bind] and re-renders on every STATE_DELTA touching that key. Falls back to props.data when the bound state is absent or empty.',
  render: (c, ctx) => {
    const parsed = chartSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { bind, dataKey, kind, title, data: staticData } = parsed.data;
    const stateKey = bind ?? dataKey;
    const raw = stateKey !== undefined ? ctx.state[stateKey] : undefined;
    const liveValues = toNumbers(raw);
    const values = liveValues.length > 0 ? liveValues : (staticData ?? []);
    if (kind === 'bar') return <BarChart values={values} title={title} />;
    if (kind === 'area') return <AreaChart values={values} title={title} />;
    return <LineChart values={values} title={title} />;
  },
};
