import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Menu,
  AlertTriangle,
  Clock,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePendingKyc } from '../../services/api/kycApi';
import { usePageHeader } from '../../context/PageTitleContext';
import { SIDEBAR_ID } from './sidebar.constants';

interface TopBarProps {
  onOpenMobileSidebar: () => void;
  mobileSidebarOpen: boolean;
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
}: TopBarProps) {
  const { currentUser, orders, incidents } = useApp();
  const pendingKyc = usePendingKyc(currentUser.role === 'ADMIN');
  const { title: pageTitle, subtitle: pageSubtitle } = usePageHeader();
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
      ? pendingKyc.map((request) => ({
            id: request.id,
            title: 'Validación de identidad pendiente',
            detail: request.user.name,
            path: '/customers/kyc',
            Icon: ShieldCheck,
            tone: 'bg-sky-50 text-sky-700',
          }))
      : []),
  ];

  return (
    <header className="sticky top-0 z-20 flex h-24 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-4 sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex min-w-0 items-center gap-3">
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
        {pageTitle && (
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-[#102A43] sm:text-2xl lg:text-[1.65rem]">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="mt-1 hidden truncate text-sm leading-snug text-[#6B7280] sm:block">
                {pageSubtitle}
              </p>
            )}
          </div>
        )}
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
              className="fixed inset-x-4 top-[104px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[360px]"
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
      </div>
    </header>
  );
}
