import { AnimatePresence, motion } from 'motion/react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebarState } from './useSidebarState';

export function SidebarControls({ compact }: { compact: boolean }) {
  const { collapsed, setCollapsed } = useSidebarState();
  return (
    <div
      role="group"
      aria-label="Modo de navegación"
      className={`hidden h-9 items-center lg:flex rounded-xl border border-white/15 bg-black/15 p-0.5 ${compact ? 'mx-auto w-10' : 'mx-3'}`}
    >
      {[
        {
          value: false,
          label: 'Fijar menú expandido',
          text: 'Expandido',
          Icon: PanelLeftOpen,
        },
        {
          value: true,
          label: 'Usar menú compacto',
          text: 'Mini',
          Icon: PanelLeftClose,
        },
      ].map(({ value, label, text, Icon }) => {
        const active = collapsed === value;
        return (
          <motion.button
            type="button"
            key={label}
            title={label}
            aria-label={label}
            aria-pressed={active}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCollapsed(value)}
            className={`sidebar-focus relative flex h-7 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg text-xs font-medium transition-colors ${active ? 'text-primary' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
          >
            {active && (
              <motion.span
                layoutId="sidebar-mode-pill"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                className="absolute inset-0 rounded-lg bg-white shadow-sm"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Icon
                className={compact ? 'size-3.5 shrink-0' : 'size-4 shrink-0'}
                aria-hidden="true"
              />
              <AnimatePresence initial={false}>
                {!compact && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                  >
                    {text}
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
