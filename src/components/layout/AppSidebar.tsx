import { isIncidentActive, useServerIncidents } from '../../services/api/incidentsApi';
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { operationalStage } from '../../services/fulfillment';
import { usePendingKyc } from '../../services/api/kycApi';
import {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_ID,
  SIDEBAR_MINI_WIDTH,
} from './sidebar.constants';
import { visibleModules } from './sidebar.navigation';
import { useSidebarState } from './useSidebarState';
import { useSidebarHover } from './useSidebarHover';
import { useExpandedModules } from './useExpandedModules';
import { SidebarBrand } from './SidebarBrand';
import { SidebarControls } from './SidebarControls';
import { SidebarUserCard } from './SidebarUserCard';
import { PrefetchNavLink } from './PrefetchNavLink';
import './sidebar.css';

export function AppSidebar() {
  const { currentUser, orders } = useApp();
  const { incidents } = useServerIncidents();
  const pendingKyc = usePendingKyc(currentUser.role === 'ADMIN', true);
  const { collapsed, isLargeScreen, mobileOpen, closeMobile } =
    useSidebarState();
  const { pathname } = useLocation();
  const root = useRef<HTMLElement>(null);
  const hover = useSidebarHover(isLargeScreen && collapsed, root);
  const compact = isLargeScreen && collapsed && !hover.previewOpen;
  const modules = useMemo(
    () => visibleModules(currentUser.role === 'ADMIN'),
    [currentUser.role],
  );
  const accordion = useExpandedModules(modules);
  const badges = {
    dispatch: orders.filter(
      (order) => operationalStage(order) === 'PICKUP_PENDING',
    ).length,
    incidents: incidents.filter(isIncidentActive).length,
    kyc: pendingKyc.length,
  };

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!compact) return;
    // Escape may hide the focused sublink. Return focus to its still-visible module.
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      focused.hasAttribute('data-sidebar-subitem')
    ) {
      focused
        .closest('[data-sidebar-module]')
        ?.querySelector<HTMLButtonElement>('[data-sidebar-module-button]')
        ?.focus();
    }
  }, [compact]);

  useEffect(() => {
    if (isLargeScreen || !mobileOpen) return;
    const returnFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex="0"]',
        ) ?? [],
      ).filter(
        (element) =>
          !element.closest('[inert]') && element.getClientRects().length > 0,
      );
    root.current
      ?.querySelector<HTMLButtonElement>('[aria-label="Cerrar menú"]')
      ?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMobile();
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      if (returnFocus?.isConnected) returnFocus.focus();
    };
  }, [isLargeScreen, mobileOpen, closeMobile]);

  return (
    <>
      <AnimatePresence>
        {!isLargeScreen && mobileOpen && (
          <motion.div
            data-testid="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeMobile}
            aria-hidden="true"
            className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs"
          />
        )}
      </AnimatePresence>
      <motion.aside
        ref={root}
        id={SIDEBAR_ID}
        aria-label={isLargeScreen ? 'Menú lateral' : 'Menú de navegación'}
        role={isLargeScreen ? undefined : 'dialog'}
        aria-modal={!isLargeScreen && mobileOpen ? true : undefined}
        aria-hidden={!isLargeScreen && !mobileOpen ? true : undefined}
        inert={!isLargeScreen && !mobileOpen}
        data-mode={
          !isLargeScreen
            ? 'drawer'
            : hover.previewOpen
              ? 'preview'
              : collapsed
                ? 'mini'
                : 'pinned'
        }
        initial={false}
        animate={{ width: compact ? SIDEBAR_MINI_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className={`sidebar-motion fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/15 bg-primary-hover text-white transition-transform duration-200 ease-out ${isLargeScreen || mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${hover.previewOpen ? 'shadow-2xl ring-1 ring-white/15' : 'shadow-xs'}`}
        onPointerEnter={hover.onPointerEnter}
        onPointerLeave={hover.onPointerLeave}
        onFocusCapture={hover.onFocusCapture}
        onBlurCapture={hover.onBlurCapture}
      >
        <SidebarBrand
          compact={compact}
          mobile={!isLargeScreen}
          onNavigate={closeMobile}
        />
        <nav
          aria-label="Navegación principal"
          className={`sidebar-nav-scroll min-h-0 flex-1 overflow-y-auto py-5 ${compact ? 'px-2.5' : 'px-3'}`}
        >
          <div className={compact ? 'space-y-2.5' : 'space-y-1.5'}>
            {modules.map((module) => {
              const Icon = module.icon;
              const active = module.id === accordion.activeModuleId;
              const expanded = !compact && accordion.expanded.has(module.id);
              const moduleStyle = `sidebar-focus relative flex items-center rounded-xl border text-xs font-semibold tracking-wide transition-colors active:scale-[0.99] ${compact ? 'mx-auto size-10 justify-center' : 'min-h-11 w-full gap-3 px-3'} ${active ? 'border-white/20 bg-white/14 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]' : 'border-transparent text-blue-100/90 hover:bg-white/10 hover:text-white'}`;
              return (
                <div key={module.id} data-sidebar-module={module.id}>
                  {module.id === 'home' ? (
                    <PrefetchNavLink
                      to={module.items[0].path}
                      title={module.label}
                      aria-label={module.label}
                      onClick={closeMobile}
                      className={moduleStyle}
                    >
                      <Icon
                        className="size-[18px] shrink-0"
                        aria-hidden="true"
                      />
                      <AnimatePresence initial={false}>
                        {!compact && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.15 }}
                            className="flex-1 truncate text-left"
                          >
                            {module.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </PrefetchNavLink>
                  ) : (
                    <>
                      <button
                        type="button"
                        title={module.label}
                        aria-label={module.label}
                        aria-expanded={expanded}
                        aria-controls={`sidebar-module-${module.id}`}
                        data-sidebar-module-button
                        data-active={active}
                        onClick={() => {
                          if (compact) {
                            hover.openPreview();
                            accordion.openModule(module.id);
                          } else accordion.toggleModule(module.id);
                        }}
                        className={moduleStyle}
                      >
                        <Icon
                          className="size-[18px] shrink-0"
                          aria-hidden="true"
                        />
                        <AnimatePresence initial={false}>
                          {!compact && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.15 }}
                              className="flex min-w-0 flex-1 items-center gap-2"
                            >
                              <span className="flex-1 truncate text-left">
                                {module.label}
                              </span>
                              <ChevronRight
                                aria-hidden="true"
                                className={`size-3.5 shrink-0 transition-transform duration-200 ease-out ${expanded ? 'rotate-90' : ''}`}
                              />
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                      <motion.div
                        id={`sidebar-module-${module.id}`}
                        aria-hidden={!expanded}
                        inert={!expanded}
                        initial={false}
                        animate={
                          expanded
                            ? { height: 'auto', opacity: 1 }
                            : { height: 0, opacity: 0 }
                        }
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="ml-5 mt-1 space-y-0.5 border-l border-white/15 pb-1 pl-3">
                          {module.items.map((item) => {
                            const itemActive =
                              item.path === accordion.activePath;
                            const count = item.badge ? badges[item.badge] : 0;
                            return (
                              <PrefetchNavLink
                                key={item.path}
                                to={item.path}
                                end={
                                  item.path === '/customers' && !itemActive
                                }
                                data-sidebar-subitem
                                title={item.label}
                                onClick={closeMobile}
                                aria-current={itemActive ? 'page' : false}
                                className={`sidebar-focus relative flex min-h-10 items-center gap-2 rounded-xl px-3 text-[13px] transition-colors ${itemActive ? 'font-semibold text-white' : 'text-blue-100/85 hover:bg-white/10 hover:text-white'}`}
                              >
                                {itemActive && (
                                  <motion.span
                                    layoutId="sidebar-active-item"
                                    transition={{
                                      type: 'spring',
                                      bounce: 0.2,
                                      duration: 0.4,
                                    }}
                                    className="absolute inset-0 rounded-xl bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                                    aria-hidden="true"
                                  />
                                )}
                                <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
                                  {itemActive && (
                                    <span
                                      className="size-1.5 shrink-0 rounded-full bg-brand-lime shadow-[0_0_8px_rgba(165,205,57,0.85)]"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="min-w-0 flex-1 truncate">
                                    {item.label}
                                  </span>
                                  {count > 0 && (
                                    <span
                                      aria-label={`${count} pendientes`}
                                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${item.badge === 'incidents' ? 'bg-amber-50 text-amber-800' : 'bg-white/15 text-white'}`}
                                    >
                                      {count}
                                    </span>
                                  )}
                                </span>
                              </PrefetchNavLink>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </nav>
        <div className="shrink-0 space-y-3 pt-3">
          <SidebarControls compact={compact} />
          <SidebarUserCard compact={compact} onNavigate={closeMobile} />
        </div>
      </motion.aside>
    </>
  );
}
