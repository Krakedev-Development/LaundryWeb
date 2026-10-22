import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useSidebarState } from './useSidebarState';

export function SidebarControls({ compact }: { compact: boolean }) {
  const { collapsed, setCollapsed } = useSidebarState();
  return (
    <div
      role="group"
      aria-label="Modo de navegación"
      className={`hidden h-9 items-center lg:flex rounded-xl border border-white/20 bg-black/10 p-0.5 ${compact ? 'mx-auto w-10' : 'mx-3'}`}
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
      ].map(({ value, label, text, Icon }) => (
        <button
          type="button"
          key={label}
          title={label}
          aria-label={label}
          aria-pressed={collapsed === value}
          onClick={() => setCollapsed(value)}
          className={`sidebar-focus flex h-7 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-medium transition-colors ${collapsed === value ? 'bg-white text-[#0F4C81] shadow-sm' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
        >
          <Icon
            className={compact ? 'size-3.5 shrink-0' : 'size-4 shrink-0'}
            aria-hidden="true"
          />
          {!compact && <span>{text}</span>}
        </button>
      ))}
    </div>
  );
}
