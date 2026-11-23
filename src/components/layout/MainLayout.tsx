import { Suspense } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { motion } from 'motion/react';
import { LoaderCircle } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { SidebarProvider, useSidebarState } from './useSidebarState';
import {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_MINI_WIDTH,
} from './sidebar.constants';
import { ToastContainer } from '../common/ToastContainer';
import { PageTitleProvider } from '../../context/PageTitleContext';
import { PageTransition } from '../ui/PageTransition';

function Workspace() {
  const { collapsed, isLargeScreen, mobileOpen, openMobile } =
    useSidebarState();
  const location = useLocation();
  const outlet = useOutlet();

  const margin = isLargeScreen
    ? collapsed
      ? SIDEBAR_MINI_WIDTH
      : SIDEBAR_EXPANDED_WIDTH
    : 0;

  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <a
        href="#main-content"
        className="sidebar-focus sr-only fixed left-3 top-3 z-50 rounded-xl bg-white px-4 py-3 text-sm font-medium text-primary shadow-lg focus:not-sr-only"
      >
        Ir al contenido
      </a>
      <AppSidebar />
      <motion.main
        id="main-content"
        tabIndex={-1}
        initial={false}
        animate={{ marginLeft: margin }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="sidebar-motion flex min-h-screen min-w-0 flex-col focus:outline-none"
      >
        <TopBar
          onOpenMobileSidebar={openMobile}
          mobileSidebarOpen={mobileOpen}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <Suspense
            fallback={
              <div className="space-y-6 py-2" role="status">
                <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-500 shadow-2xs">
                  <LoaderCircle
                    className="size-3.5 animate-spin text-primary motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span>Cargando sección…</span>
                </div>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-32 rounded-2xl border border-slate-200/70 skeleton-shimmer"
                    />
                  ))}
                </div>
                <div className="h-80 rounded-3xl border border-slate-200/70 skeleton-shimmer" />
              </div>
            }
          >
            <PageTransition routeKey={location.pathname}>
              {outlet}
            </PageTransition>
          </Suspense>
        </div>
      </motion.main>
      <ToastContainer />
    </div>
  );
}

export function MainLayout() {
  return (
    <SidebarProvider>
      <PageTitleProvider>
        <Workspace />
      </PageTitleProvider>
    </SidebarProvider>
  );
}
