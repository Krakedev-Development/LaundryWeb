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
      className={`flex h-24 border-t border-slate-100 ${compact ? 'flex-col items-center justify-center gap-1 px-2 py-2' : 'items-center gap-2.5 px-4 py-4'}`}
    >
      <span
        role="img"
        title={`${currentUser.name} · ${role}`}
        aria-label={`${currentUser.name}, ${role}`}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8EEF5] text-xs font-semibold text-[#143F73] ring-2 ring-white"
      >
        {initials}
      </span>
      {!compact && (
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold text-slate-800"
            title={currentUser.name}
          >
            {currentUser.name}
          </p>
          <span className="mt-1 inline-flex rounded-md border border-[#143F73]/10 bg-[#143F73]/5 px-1.5 py-0.5 text-[10px] font-medium text-[#143F73]">
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
        className="sidebar-focus flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
