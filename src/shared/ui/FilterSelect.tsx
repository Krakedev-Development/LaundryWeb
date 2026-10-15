import type { ReactNode } from 'react';
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
  return (
    <div>
      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-sky-500"
      >
        {children}
      </select>
    </div>
  );
}
