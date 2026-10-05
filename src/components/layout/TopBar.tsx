import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Bell,
  Menu,
  Settings,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Command,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SIDEBAR_ID } from './sidebar.constants';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  mobileSidebarOpen: boolean;
  onOpenSearch: () => void;
}
interface OperationalNotice {
  id: string;
  title: string;
  detail: string;
  path: string;
  Icon: LucideIcon;
  tone: string;
}

export function TopBar({
  onOpenMobileSidebar,
  mobileSidebarOpen,
  onOpenSearch,
}: TopBarProps) {
  const { currentUser, resetAll, orders, incidents, customers } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const menus = useRef<HTMLDivElement>(null);
  const notificationButton = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const date = new Intl.DateTimeFormat('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  useEffect(() => {
    if (!showNotifications) return;
    const onPointer = (event: PointerEvent) => {
      if (!menus.current?.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showNotifications) notificationButton.current?.focus();
      setShowNotifications(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onEscape);
    };
  }, [showNotifications]);

  const notices: OperationalNotice[] = [
    ...orders
      .filter(
        (order) =>
          order.priority === 'URGENT' &&
          !['COMPLETED', 'CANCELLED', 'CLOSED', 'DELIVERED'].includes(
            order.status,
          ),
      )
      .map((order) => ({
        id: order.id,
        title: `Solicitud urgente · ${order.id}`,
        detail: order.customerName,
        path: `/operations/orders/${order.id}`,
        Icon: Clock,
        tone: 'bg-rose-50 text-rose-700',
      })),
    ...incidents
      .filter((incident) => ['OPEN', 'IN_PROGRESS'].includes(incident.status))
      .map((incident) => ({
        id: incident.id,
        title: `Incidencia · ${incident.id}`,
        detail: `${incident.type} · ${incident.customerName}`,
        path: '/operations/incidents',
        Icon: AlertTriangle,
        tone: 'bg-amber-50 text-amber-700',
      })),
    ...(currentUser.role === 'ADMIN'
      ? customers
          .filter((customer) => customer.kycStatus === 'PENDING')
          .map((customer) => ({
            id: customer.id,
            title: 'Validación de identidad pendiente',
            detail: customer.fullName,
            path: '/customers/kyc',
            Icon: ShieldCheck,
            tone: 'bg-sky-50 text-sky-700',
          }))
      : []),
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          aria-label="Abrir menú"
          aria-controls={SIDEBAR_ID}
          aria-expanded={mobileSidebarOpen}
          className="sidebar-focus flex size-10 shrink-0 items-center justify-center rounded-xl text-[#143F73] hover:bg-slate-100 lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowNotifications(false);
            onOpenSearch();
          }}
          aria-label="Abrir búsqueda global"
          className="sidebar-focus flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-xs text-slate-500 transition-colors hover:border-[#61BFC7]"
        >
          <Search
            className="size-4 shrink-0 text-[#143F73]"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">
            <span className="hidden sm:inline">
              Buscar solicitudes, clientes o choferes
            </span>
            <span className="sm:hidden">Buscar…</span>
          </span>
          <kbd className="hidden items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline-flex">
            <Command className="size-2.5" aria-hidden="true" />K
          </kbd>
        </button>
      </div>
      <div ref={menus} className="flex shrink-0 items-center gap-2 sm:gap-3">
        <p className="mr-2 hidden text-xs capitalize text-slate-500 xl:block">
          {date}
        </p>
        <div className="relative">
          <button
            ref={notificationButton}
            type="button"
            aria-label="Notificaciones"
            title="Notificaciones"
            aria-expanded={showNotifications}
            aria-controls="operational-notifications"
            onClick={() => {
              setShowNotifications((previous) => !previous);
            }}
            className="sidebar-focus relative flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <Bell className="size-[18px]" aria-hidden="true" />
            {notices.length > 0 && (
              <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-[#143F73] px-1 text-[9px] font-semibold leading-4 text-white">
                {notices.length > 99 ? '99+' : notices.length}
              </span>
            )}
          </button>
          {showNotifications && (
            <section
              id="operational-notifications"
              aria-label="Notificaciones operativas"
              className="fixed inset-x-4 top-[72px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[360px]"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-[#143F73]">
                  Notificaciones
                </h2>
                <span className="text-[11px] text-slate-500">
                  {notices.length} pendientes
                </span>
              </div>
              <div className="sidebar-nav-scroll max-h-80 overflow-y-auto p-2">
                {notices.map(({ id, title, detail, path, Icon, tone }) => (
                  <button
                    type="button"
                    key={id}
                    onClick={() => {
                      navigate(path);
                      setShowNotifications(false);
                    }}
                    className="sidebar-focus flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${tone}`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold leading-5 text-slate-800">
                        {title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {detail}
                      </span>
                    </span>
                  </button>
                ))}
                {notices.length === 0 && (
                  <p className="px-3 py-6 text-center text-sm text-slate-500">
                    No hay alertas operativas pendientes.
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
        {/* MVP only: remove this demo reset control before full development. */}
        <button
          type="button"
          aria-label="Restablecer datos demo"
          title="Restablecer datos demo"
          onClick={() => {
            setShowNotifications(false);
            resetAll();
          }}
          className="sidebar-focus flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
        >
          <Settings className="size-[18px]" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
