import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { focusRing } from './controls';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** Contador junto a la etiqueta (p. ej. prendas o incidencias abiertas). */
  badge?: number;
  /** `alert` resalta el contador (incidencias); por defecto es neutro. */
  badgeTone?: 'neutral' | 'alert';
  /** Texto para lectores de pantalla en lugar del número solo, p. ej. "6 prendas". */
  badgeLabel?: string;
}

/**
 * Pestañas accesibles (patrón WAI-ARIA): `tablist`/`tab`/`tabpanel`, la pestaña activa anunciada
 * con `aria-selected`, flechas izquierda/derecha, Inicio y Fin para moverse, y solo la pestaña
 * activa en el orden de tabulación. La fila hace scroll propio: nunca desborda la página.
 * Acompáñalas con `TabPanel` usando el mismo `idPrefix`.
 */
export function Tabs<T extends string>({
  label,
  idPrefix,
  items,
  value,
  onChange,
  className = '',
}: {
  /** Nombre accesible del grupo, p. ej. "Secciones de la solicitud". */
  label: string;
  idPrefix: string;
  items: TabItem<T>[];
  value: T;
  onChange(id: T): void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = items.length - 1;
    const next =
      e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : -1;
    if (next < 0) return;
    e.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div className={`border-b border-slate-200/80 ${className}`}>
      <div role="tablist" aria-label={label} className="-mb-px flex gap-1.5 overflow-x-auto">
        {items.map((item, index) => {
          const selected = item.id === value;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.id}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`${idPrefix}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={selected ? `${idPrefix}-panel-${item.id}` : undefined}
              tabIndex={selected ? 0 : -1}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`relative inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-t-xl px-3.5 py-3 text-sm font-semibold transition-colors ${focusRing} focus-visible:outline-offset-[-2px] ${
                selected
                  ? 'text-primary'
                  : 'text-slate-500 hover:text-ink'
              }`}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                    item.badgeTone === 'alert'
                      ? 'bg-rose-100 text-rose-700'
                      : selected
                        ? 'bg-primary-soft text-primary'
                        : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <span aria-hidden={item.badgeLabel ? true : undefined}>{item.badge}</span>
                  {item.badgeLabel && <span className="sr-only">{item.badgeLabel}</span>}
                </span>
              )}
              {selected && (
                <motion.span
                  layoutId={`${idPrefix}-active-tab`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                  className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** Contenido de la pestaña activa, enlazado a su pestaña. */
export function TabPanel({
  idPrefix,
  id,
  children,
  className,
}: {
  idPrefix: string;
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      className={className}
    >
      {children}
    </motion.div>
  );
}
