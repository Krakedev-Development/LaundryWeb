import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { operationalStage } from '../../services/fulfillment';
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
  const { currentUser, orders, incidents, customers } = useApp();
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
      (order) =>
        order.fulfillment?.mode !== 'STORE_STORE' &&
        operationalStage(order) === 'PICKUP_PENDING',
    ).length,
    incidents: incidents.filter((incident) =>
      ['OPEN', 'IN_PROGRESS'].includes(incident.status),
    ).length,
    kyc: customers.filter((customer) => customer.kycStatus === 'PENDING')
      .length,
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
      {!isLargeScreen && mobileOpen && (
        <div
          data-testid="sidebar-backdrop"
          onClick={closeMobile}
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs"
        />
      )}
      <aside
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
        style={{ width: compact ? SIDEBAR_MINI_WIDTH : SIDEBAR_EXPANDED_WIDTH }}
        className={`sidebar-motion fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden border-r border-white/15 bg-[#0A3660] text-white transition-[width,transform] duration-200 ease-out ${isLargeScreen || mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${hover.previewOpen ? 'shadow-2xl ring-1 ring-[#0A3660]/20' : 'shadow-xs'}`}
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
          <div className={compact ? 'space-y-3' : 'space-y-1.5'}>
            {modules.map((module) => {
              const Icon = module.icon;
              const active = module.id === accordion.activeModuleId;
              const expanded = !compact && accordion.expanded.has(module.id);
              const moduleStyle = `sidebar-focus flex items-center rounded-xl border text-xs font-semibold tracking-wide transition-colors ${compact ? 'size-10 justify-center' : 'min-h-11 w-full gap-3 px-3'} ${active ? 'border-white/25 bg-white/15 text-white' : 'border-transparent text-blue-100 hover:bg-white/10 hover:text-white'}`;
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
                      {!compact && (
                        <span className="flex-1 text-left">{module.label}</span>
                      )}
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
                        {!compact && (
                          <>
                            <span className="flex-1 text-left">
                              {module.label}
                            </span>
                            <ChevronRight
                              aria-hidden="true"
                              className={`size-3.5 shrink-0 transition-transform duration-200 ease-out ${expanded ? 'rotate-90' : ''}`}
                            />
                          </>
                        )}
                      </button>
                      <div
                        id={`sidebar-module-${module.id}`}
                        aria-hidden={!expanded}
                        inert={!expanded}
                        className={`grid transition-[grid-template-rows] duration-200 ease-out ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                      >
                        <div className="min-h-0 overflow-hidden">
                          <div className="ml-5 mt-1 space-y-0.5 border-l border-white/20 pb-1 pl-3">
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
                                  className={`sidebar-focus flex min-h-10 items-center gap-2 rounded-lg px-3 text-[13px] transition-colors ${itemActive ? 'bg-white/15 font-semibold text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}
                                >
                                  {itemActive && (
                                    <span
                                      className="size-1.5 shrink-0 rounded-full bg-[#A5CD39]"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="min-w-0 flex-1">
                                    {item.label}
                                  </span>
                                  {count > 0 && (
                                    <span
                                      aria-label={`${count} pendientes`}
                                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${item.badge === 'incidents' ? 'bg-amber-50 text-amber-800' : 'bg-white/15 text-white'}`}
                                    >
                                      {count}
                                    </span>
                                  )}
                                </PrefetchNavLink>
                              );
                            })}
                          </div>
                        </div>
                      </div>
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
      </aside>
    </>
  );
}
