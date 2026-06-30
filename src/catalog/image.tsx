import { z } from 'zod';
import type { CatalogEntry } from './catalogEntry';

/**
 * Allow only https:, http:, and data:image/ URLs for an untrusted image src.
 * Rejects javascript:, data:text/html, blob:, file:, vscode-resource:, etc. so
 * a model-authored doc cannot smuggle a script-bearing or local-resource src.
 */
export function isAllowedImageSrc(src: string): boolean {
  const trimmed = src.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('https:') || lower.startsWith('http:')) { return true; }
  if (lower.startsWith('data:image/')) { return true; }
  return false;
}

const imageSchema = z.object({
  src: z.string().refine(isAllowedImageSrc, {
    message: 'image src must be an https:, http:, or data:image/ URL',
  }),
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
