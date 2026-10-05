import { X } from 'lucide-react';
import { Logo } from '../common/Logo';
import { PrefetchNavLink } from './PrefetchNavLink';

export function SidebarBrand({
  compact,
  mobile,
  onNavigate,
}: {
  compact: boolean;
  mobile: boolean;
  onNavigate: () => void;
}) {
  return (
    <div
      className={`flex h-24 shrink-0 items-center border-b border-slate-100 ${compact ? 'justify-center' : 'px-4'}`}
    >
      <PrefetchNavLink
        to="/dashboard"
        onClick={onNavigate}
        title="CFL LAUNDRY CLEAN FRESH · Inicio"
        aria-label="CFL LAUNDRY CLEAN FRESH · Inicio"
        className="sidebar-focus flex min-w-0 items-center justify-center rounded-lg"
      >
        <Logo
          variant={compact ? 'icon' : 'full'}
          size={compact ? 'md' : 'lg'}
        />
      </PrefetchNavLink>
      {mobile && (
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Cerrar menú"
          title="Cerrar menú"
          className="sidebar-focus absolute right-2 top-2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
