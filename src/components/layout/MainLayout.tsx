import { Suspense } from 'react';
import { MotionConfig } from 'framer-motion';
import { PageTransition } from '../../shared/motion/PageTransition';
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

function Workspace() {
  const { collapsed, isLargeScreen, mobileOpen, openMobile } =
    useSidebarState();

  const margin = isLargeScreen
    ? collapsed
      ? SIDEBAR_MINI_WIDTH
      : SIDEBAR_EXPANDED_WIDTH
    : 0;

  return (
    <div className="lw-app min-h-screen bg-canvas text-slate-900">
      <a
        href="#main-content"
        className="sidebar-focus sr-only fixed left-3 top-3 z-50 rounded-lg bg-white px-4 py-3 text-sm text-primary focus:not-sr-only"
      >
        Ir al contenido
      </a>
      <AppSidebar />
      <main
        id="main-content"
        tabIndex={-1}
        style={{ marginLeft: margin }}
        className="sidebar-motion flex min-h-screen min-w-0 flex-col transition-[margin] duration-[240ms] ease-out focus:outline-none"
      >
        <TopBar
          onOpenMobileSidebar={openMobile}
          mobileSidebarOpen={mobileOpen}
        />
        <div className="lw-workspace min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div className="space-y-6 py-4" role="status">
                <div className="flex items-center gap-2.5 text-sm font-medium text-slate-500">
                  <LoaderCircle
                    className="size-4 animate-spin text-primary motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                  <span>Cargando sección…</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-28 rounded-2xl border border-slate-200/70 skeleton-shimmer"
                    />
                  ))}
                </div>
                <div className="h-72 rounded-2xl border border-slate-200/70 skeleton-shimmer" />
              </div>
            }
          >
            <PageTransition />
          </Suspense>
        </div>
      </main>
      <ToastContainer />
    </div>
  );
}

export function MainLayout() {
  return (
    <MotionConfig reducedMotion="user">
      <SidebarProvider>
        <PageTitleProvider>
          <Workspace />
        </PageTitleProvider>
      </SidebarProvider>
    </MotionConfig>
  );
}
