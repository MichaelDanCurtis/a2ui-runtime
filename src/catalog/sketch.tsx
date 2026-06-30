import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const sketchSchema = z.object({
  strokes:     z.array(z.string()),
  viewBox:     z.string().optional(),
  color:       z.string().optional(),
  strokeWidth: z.number().optional(),
  durationMs:  z.number().optional(),
  staggerMs:   z.number().optional(),
});

const SKETCH_STYLE_ID = 'a2ui-sketch-styles';

const SKETCH_CSS = `
@keyframes a2ui-draw { to { stroke-dashoffset: 0; } }
.a2ui-sketch path {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  animation-name: a2ui-draw;
  animation-fill-mode: forwards;
  animation-timing-function: ease-in-out;
}
`;

function injectSketchStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SKETCH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = SKETCH_STYLE_ID;
  style.textContent = SKETCH_CSS;
  document.head.appendChild(style);
}

export const sketchEntry: CatalogEntry = {
  type: 'sketch',
  schema: sketchSchema,
  description: 'Hand-drawn sketch with sequential stroke draw-on animation. props: { strokes: string[], viewBox?: string, color?: string, strokeWidth?: number, durationMs?: number, staggerMs?: number }.',
  render: (c, _ctx) => {
    const parsed = sketchSchema.safeParse(c.props);
    if (!parsed.success) return null;

    injectSketchStyles();

    const {
      strokes,
      viewBox = '0 0 400 150',
      color = 'var(--vscode-foreground)',
      strokeWidth = 3,
      durationMs = 700,
      staggerMs = 350,
    } = parsed.data;

    return (
      <svg viewBox={viewBox} className="a2ui-sketch" aria-label="sketch">
        {strokes.map((stroke, i) => (
          <path
            key={i}
            d={stroke}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              animationDelay: `${i * staggerMs}ms`,
              animationDuration: `${durationMs}ms`,
            }}
          />
        ))}
      </svg>
    );
  },
};
