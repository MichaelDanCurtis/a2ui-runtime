import { z } from 'zod';
import type { CatalogEntry, RenderContext } from './catalogEntry';

// ─── container ───────────────────────────────────────────────────────────────

const containerSchema = z.object({
  direction: z.enum(['vertical', 'horizontal']).optional(),
  gap: z.number().optional(),
  children: z.array(z.string()),
});

export const containerEntry: CatalogEntry = {
  type: 'container',
  schema: containerSchema,
  description:
    'Flex layout container. props: { direction?: vertical|horizontal, gap?: number, children: string[] }.' +
    ' Renders children in a flex column (default) or row with optional gap. Class a2ui-container.',
  render: (c, ctx: RenderContext) => {
    const parsed = containerSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { direction = 'vertical', gap = 8, children } = parsed.data;
    const dirClass = direction === 'horizontal' ? 'a2ui-container--horizontal' : 'a2ui-container--vertical';
    return (
      <div className={`a2ui-container ${dirClass}`} style={{ gap }}>
        {children.map(id => ctx.renderChild(id))}
      </div>
    );
  },
};

// ─── card ─────────────────────────────────────────────────────────────────────

const cardSchema = z.object({
  title: z.string().optional(),
  children: z.array(z.string()),
});

export const cardEntry: CatalogEntry = {
  type: 'card',
  schema: cardSchema,
  description:
    'Bordered card panel with optional title header. props: { title?: string, children: string[] }.' +
    ' Renders children inside a rounded padded card. Class a2ui-card.',
  render: (c, ctx: RenderContext) => {
    const parsed = cardSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { title, children } = parsed.data;
    return (
      <div className="a2ui-card">
        {title && <div className="a2ui-card-title">{title}</div>}
        {children.map(id => ctx.renderChild(id))}
      </div>
    );
  },
};
