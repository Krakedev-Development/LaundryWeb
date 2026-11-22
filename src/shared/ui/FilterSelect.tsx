import { useId, type ReactNode } from 'react';

/** Selector de filtro con su etiqueta asociada (se anuncia al recibir el foco). */
export function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-2 focus:-outline-offset-1 focus:outline-primary"
      >
        {children}
      </select>
    </div>
  );
}
