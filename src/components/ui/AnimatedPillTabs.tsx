import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { focusRing } from '../../shared/ui/controls';

export interface PillTabItem<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  alert?: boolean;
}

interface AnimatedPillTabsProps<T extends string> {
  items: PillTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  layoutId: string;
  ariaLabel?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/** Segmented pill tabs with sliding spring indicator powered by layoutId. */
export function AnimatedPillTabs<T extends string>({
  items,
  value,
  onChange,
  layoutId,
  ariaLabel = 'Filtros',
  size = 'md',
  className = '',
}: AnimatedPillTabsProps<T>) {
  const padding = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-xs';

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100/90 p-1 ${className}`}
    >
      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(item.id)}
            className={`relative inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl font-semibold transition-colors ${padding} ${focusRing} ${
              active
                ? 'text-ink'
                : 'text-slate-600 hover:text-ink'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                className="absolute inset-0 rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {Icon && (
                <Icon
                  className={`size-3.5 shrink-0 ${active ? 'text-primary' : 'text-slate-500'}`}
                  aria-hidden="true"
                />
              )}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums transition-colors ${
                    active
                      ? 'bg-primary-soft text-primary'
                      : item.alert
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
