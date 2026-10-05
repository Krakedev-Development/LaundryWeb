import { X } from 'lucide-react';
import fullLogo from '../../../assets/logo-laundry-white.png';
import iconLogo from '../../../assets/logo-laundry-lav-white.png';
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
    <div className="relative flex h-24 shrink-0 items-center overflow-hidden border-b border-white/15">
      <PrefetchNavLink
        to="/dashboard"
        onClick={onNavigate}
        title="CFL LAUNDRY CLEAN FRESH · Inicio"
        aria-label="CFL LAUNDRY CLEAN FRESH · Inicio"
        className={`sidebar-focus sidebar-brand absolute left-2.5 flex h-20 items-center rounded-lg ${compact ? 'w-10' : 'w-60'}`}
      >
        {!mobile && (
          <img
            src={iconLogo}
            width={32}
            height={48}
            alt={compact ? 'CFL: lavadora con hoja verde' : ''}
            aria-hidden={!compact}
            className={`absolute left-1 h-12 w-8 max-w-none object-contain ${compact ? 'visible opacity-100' : 'invisible opacity-0'}`}
          />
        )}
        <img
          src={fullLogo}
          width={224}
          height={80}
          alt={compact ? '' : 'CFL LAUNDRY CLEAN FRESH'}
          aria-hidden={compact}
          className={`absolute left-2 h-20 w-56 max-w-none object-contain transition-opacity duration-150 ${compact ? 'invisible opacity-0' : 'visible opacity-100 delay-100'}`}
        />
      </PrefetchNavLink>
      {mobile && (
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Cerrar menú"
          title="Cerrar menú"
          className="sidebar-focus absolute right-2 top-2 rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
