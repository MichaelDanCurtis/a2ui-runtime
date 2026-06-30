import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

const imageSchema = z.object({
  src: z.string(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const imageEntry: CatalogEntry = {
  type: 'image',
  schema: imageSchema,
  description: 'Image display. props: { src: string, alt?: string, width?: number, height?: number }. Renders an img tag with max-width:100%; requires img-src https: data: in the host CSP.',
  render: (c, _ctx) => {
    const parsed = imageSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { src, alt = '', width, height } = parsed.data;
    const style: React.CSSProperties = { maxWidth: '100%', display: 'block' };
    return <img src={src} alt={alt} width={width} height={height} style={style} />;
  },
};
