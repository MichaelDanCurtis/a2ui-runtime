import type { A2uiDocument } from './types';
import { catalog } from './catalog';

export function validateDocument(doc: A2uiDocument): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!doc.components[doc.root]) { errors.push(`root '${doc.root}' not found in components`); }
  for (const [id, comp] of Object.entries(doc.components)) {
    if (id !== comp.id) { errors.push(`component key '${id}' != component.id '${comp.id}'`); }
    const entry = catalog[comp.type];
    if (!entry) { errors.push(`unknown component type '${comp.type}' (id ${id})`); continue; }
    const res = entry.schema.safeParse(comp.props);
    if (!res.success) { errors.push(`props invalid for '${id}' (${comp.type}): ${res.error.issues.map(i => i.message).join(', ')}`); }
    for (const child of comp.children ?? []) {
      if (!doc.components[child]) { errors.push(`child '${child}' of '${id}' not found`); }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
