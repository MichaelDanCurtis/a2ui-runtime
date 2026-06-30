import { z } from 'zod';
import { useState } from 'react';
import type { CatalogEntry, RenderContext } from './catalogEntry';

// ─── button ──────────────────────────────────────────────────────────────────

const buttonSchema = z.object({
  label: z.string(),
  binding: z.object({ target: z.enum(['mcp', 'agent']), action: z.string() }).optional(),
});

export const buttonEntry: CatalogEntry = {
  type: 'button',
  schema: buttonSchema,
  description:
    'Clickable button that emits an INTERACTION event. props: { label: string, binding?: { target: mcp|agent, action: string } }.' +
    ' If binding is present, clicking posts an INTERACTION message to the host; without binding the button is render-only.',
  render: (c, ctx: RenderContext) => {
    const parsed = buttonSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { label, binding } = parsed.data;
    const handleClick = () => {
      if (binding) {
        ctx.emit(c.id, binding, {});
      }
    };
    return (
      <button type="button" className="a2ui-button" onClick={handleClick}>
        {label}
      </button>
    );
  },
};

// ─── textField ───────────────────────────────────────────────────────────────

const textFieldSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  binding: z.object({ target: z.enum(['mcp', 'agent']), action: z.string() }).optional(),
});

function TextField({
  id,
  name,
  label,
  placeholder,
  binding,
  ctx,
}: {
  id: string;
  name: string;
  label?: string;
  placeholder?: string;
  binding?: { target: 'mcp' | 'agent'; action: string };
  ctx: RenderContext;
}) {
  const [value, setValue] = useState('');
  const inputId = `a2ui-tf-${id}`;
  return (
    <div className="a2ui-textfield">
      {label && <label htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        type="text"
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={() => {
          if (binding) {
            ctx.emit(id, binding, { value });
          }
        }}
      />
    </div>
  );
}

export const textFieldEntry: CatalogEntry = {
  type: 'textField',
  schema: textFieldSchema,
  description:
    'Text input field. props: { name: string, label?: string, placeholder?: string, binding?: { target: mcp|agent, action: string } }.' +
    ' Holds local value; emits INTERACTION with { value } on blur when binding is present.' +
    ' Use inside a form component to emit on submit instead.',
  render: (c, ctx: RenderContext) => {
    const parsed = textFieldSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { name, label, placeholder, binding } = parsed.data;
    return (
      <TextField
        id={c.id}
        name={name}
        label={label}
        placeholder={placeholder}
        binding={binding}
        ctx={ctx}
      />
    );
  },
};

// ─── select ──────────────────────────────────────────────────────────────────

const selectSchema = z.object({
  name: z.string(),
  options: z.array(z.object({ value: z.string(), label: z.string() })),
  binding: z.object({ target: z.enum(['mcp', 'agent']), action: z.string() }).optional(),
});

export const selectEntry: CatalogEntry = {
  type: 'select',
  schema: selectSchema,
  description:
    'Dropdown select input. props: { name: string, options: Array<{ value: string, label: string }>, binding?: { target: mcp|agent, action: string } }.' +
    ' Emits INTERACTION with { value } on change when binding is present.',
  render: (c, ctx: RenderContext) => {
    const parsed = selectSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { name, options, binding } = parsed.data;
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      if (binding) {
        ctx.emit(c.id, binding, { value: e.target.value });
      }
    };
    return (
      <select className="a2ui-select" name={name} onChange={handleChange}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  },
};

// ─── form ────────────────────────────────────────────────────────────────────

const formSchema = z.object({
  submitLabel: z.string().optional(),
  children: z.array(z.string()),
  binding: z.object({ target: z.enum(['mcp', 'agent']), action: z.string() }),
});

function FormComponent({
  id,
  submitLabel,
  children,
  binding,
  ctx,
}: {
  id: string;
  submitLabel?: string;
  children: string[];
  binding: { target: 'mcp' | 'agent'; action: string };
  ctx: RenderContext;
}) {
  // Local controlled state: field name → value
  // Initialize from each child field's default so unmodified fields are present on submit.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const childId of children) {
      const child = ctx.getComponent(childId);
      if (!child) continue;
      if (child.type === 'textField') {
        const parsed = textFieldSchema.safeParse(child.props);
        if (parsed.success) {
          init[parsed.data.name] = '';
        }
      } else if (child.type === 'select') {
        const parsed = selectSchema.safeParse(child.props);
        if (parsed.success) {
          init[parsed.data.name] = parsed.data.options[0]?.value ?? '';
        }
      }
    }
    return init;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    ctx.emit(id, binding, { values });
  };

  return (
    <form className="a2ui-form" onSubmit={handleSubmit}>
      {children.map(childId => {
        const child = ctx.getComponent(childId);
        if (!child) return null;

        if (child.type === 'textField') {
          const parsed = textFieldSchema.safeParse(child.props);
          if (!parsed.success) return null;
          const { name, label, placeholder } = parsed.data;
          const inputId = `a2ui-form-tf-${childId}`;
          return (
            <div key={childId} className="a2ui-textfield">
              {label && <label htmlFor={inputId}>{label}</label>}
              <input
                id={inputId}
                type="text"
                name={name}
                placeholder={placeholder}
                value={values[name] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [name]: e.target.value }))}
              />
            </div>
          );
        }

        if (child.type === 'select') {
          const parsed = selectSchema.safeParse(child.props);
          if (!parsed.success) return null;
          const { name, options } = parsed.data;
          return (
            <select
              key={childId}
              className="a2ui-select"
              name={name}
              value={values[name] ?? options[0]?.value ?? ''}
              onChange={e => setValues(prev => ({ ...prev, [name]: e.target.value }))}
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        console.warn(`[a2ui] form "${id}": unsupported child type "${child.type}" (id: ${childId}) — skipping`);
        return null;
      })}
      <button type="submit" className="a2ui-button">
        {submitLabel ?? 'Submit'}
      </button>
    </form>
  );
}

export const formEntry: CatalogEntry = {
  type: 'form',
  schema: formSchema,
  description:
    'Form container that gathers child field values and emits INTERACTION on submit.' +
    ' props: { submitLabel?: string, children: string[], binding: { target: mcp|agent, action: string } }.' +
    ' children is an array of component ids (textField or select). On submit emits { values: Record<string,string> }.',
  render: (c, ctx: RenderContext) => {
    const parsed = formSchema.safeParse(c.props);
    if (!parsed.success) return null;
    const { submitLabel, children, binding } = parsed.data;
    return (
      <FormComponent
        id={c.id}
        submitLabel={submitLabel}
        children={children}
        binding={binding}
        ctx={ctx}
      />
    );
  },
};
