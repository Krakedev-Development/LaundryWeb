import {
  INCIDENT_SEVERITY_LABEL,
  incidentTypeLabel,
  isIncidentActive,
  useServerIncidents,
} from '../../services/api/incidentsApi';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
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
  const { currentUser, orders } = useApp();
  const { incidents } = useServerIncidents();
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
      .filter(isIncidentActive)
      .map((incident) => ({
        id: incident.id,
        title: `Incidencia · ${incidentTypeLabel(incident.type)}`,
        detail: `Severidad ${(INCIDENT_SEVERITY_LABEL[incident.severity] ?? incident.severity).toLowerCase()}`,
        path: `/operations/incidents/${incident.id}`,
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
    <header className="fintech-glass sticky top-0 z-20 flex h-24 shrink-0 items-center justify-between gap-3 border-b border-slate-200/75 px-4 sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="flex min-w-0 items-center gap-3">
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onOpenMobileSidebar}
          aria-label="Abrir menú"
          aria-controls={SIDEBAR_ID}
          aria-expanded={mobileSidebarOpen}
          className="sidebar-focus flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-primary hover:bg-slate-100 lg:hidden"
        >
          <Menu className="size-5" aria-hidden="true" />
        </motion.button>
        {pageTitle && (
          <motion.div
            key={pageTitle}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="min-w-0"
          >
            <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-ink sm:text-2xl lg:text-[1.65rem]">
              {pageTitle}
            </h1>
            {pageSubtitle && (
              <p className="mt-1 hidden truncate text-sm leading-snug text-subtle sm:block">
                {pageSubtitle}
              </p>
            )}
          </motion.div>
        )}
      </div>
      <div ref={menus} className="flex shrink-0 items-center gap-2 sm:gap-3">
        <p className="mr-1 hidden rounded-full border border-slate-200/80 bg-slate-50/90 px-3.5 py-1.5 text-xs font-medium first-letter:uppercase text-slate-600 xl:block">
          {date}
        </p>
        <div className="relative">
          <motion.button
            ref={notificationButton}
            type="button"
            aria-label="Notificaciones"
            title="Notificaciones"
            aria-expanded={showNotifications}
            aria-controls="operational-notifications"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setShowNotifications((previous) => !previous);
            }}
            className="sidebar-focus relative flex size-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200/75 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-ink"
          >
            <Bell className="size-[18px]" aria-hidden="true" />
            {notices.length > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-4.5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white tabular-nums">
                {notices.length > 99 ? '99+' : notices.length}
              </span>
            )}
          </motion.button>
          <AnimatePresence>
            {showNotifications && (
              <motion.section
                id="operational-notifications"
                aria-label="Notificaciones operativas"
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-x-4 top-[104px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[360px]"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <h2 className="text-sm font-bold tracking-tight text-ink">
                    Notificaciones
                  </h2>
                  <span className="rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                    {notices.length} pendientes
                  </span>
                </div>
                <div className="sidebar-nav-scroll max-h-80 overflow-y-auto p-2">
                  {notices.map(({ id, title, detail, path, Icon, tone }) => (
                    <motion.button
                      type="button"
                      key={id}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        navigate(path);
                        setShowNotifications(false);
                      }}
                      className="sidebar-focus flex w-full cursor-pointer items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-slate-50"
                    >
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${tone}`}
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
                    </motion.button>
                  ))}
                  {notices.length === 0 && (
                    <p className="px-3 py-6 text-center text-sm text-slate-500">
                      No hay alertas operativas pendientes.
                    </p>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
