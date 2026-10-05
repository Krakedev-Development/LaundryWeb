import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

export function SidebarUserCard({
  compact,
  onNavigate,
}: {
  compact: boolean;
  onNavigate: () => void;
}) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const initials = currentUser.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  const role = currentUser.role === 'ADMIN' ? 'Administrador' : 'Supervisor';
  return (
    <div
      className={`h-24 border-t border-white/15 ${compact ? 'flex flex-col items-center justify-center gap-1 px-2 py-2' : 'grid grid-cols-[36px_minmax(0,1fr)_32px] items-center gap-x-2 gap-y-1 px-3 py-3'}`}
    >
      <span
        role="img"
        title={`${currentUser.name} · ${role} · ${currentUser.email}`}
        aria-label={`${currentUser.name}, ${role}, ${currentUser.email}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8EEF5] text-xs font-semibold text-[#143F73] ring-2 ring-white"
      >
        {initials}
      </span>
      {!compact && (
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold text-white"
            title={currentUser.name}
          >
            {currentUser.name}
          </p>
          <p
            className="mt-1 break-all text-[11px] leading-4 text-blue-100"
            title={currentUser.email}
          >
            {currentUser.email}
          </p>
          <span className="mt-1 inline-flex rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-100">
            {role}
          </span>
        </div>
      )}
      <button
        type="button"
        title="Cerrar sesión"
        aria-label="Cerrar sesión"
        onClick={() => {
          logout();
          onNavigate();
          navigate('/login');
        }}
        className={`sidebar-focus flex shrink-0 items-center justify-center rounded-xl text-blue-100 transition-colors hover:bg-white/10 hover:text-white ${compact ? 'size-10' : 'size-8'}`}
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
