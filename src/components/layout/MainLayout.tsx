import { Suspense, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { SidebarProvider, useSidebarState } from './useSidebarState';
import {
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_MINI_WIDTH,
} from './sidebar.constants';
import { ToastContainer } from '../common/ToastContainer';
import { GlobalSearchModal } from '../common/GlobalSearchModal';

function Workspace() {
  const { collapsed, isLargeScreen, mobileOpen, openMobile } =
    useSidebarState();
  const [searchOpen, setSearchOpen] = useState(false);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, []);
  const margin = isLargeScreen
    ? collapsed
      ? SIDEBAR_MINI_WIDTH
      : SIDEBAR_EXPANDED_WIDTH
    : 0;
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <a
        href="#main-content"
        className="sidebar-focus sr-only fixed left-3 top-3 z-50 rounded-lg bg-white px-4 py-3 text-sm text-[#143F73] focus:not-sr-only"
      >
        Ir al contenido
      </a>
      <AppSidebar />
      <main
        id="main-content"
        tabIndex={-1}
        style={{ marginLeft: margin }}
        className="sidebar-motion flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ease-out focus:outline-none"
      >
        <TopBar
          onOpenMobileSidebar={openMobile}
          mobileSidebarOpen={mobileOpen}
          onOpenSearch={() => setSearchOpen(true)}
        />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Suspense
            fallback={
              <div
                role="status"
                className="flex items-center gap-2 py-12 text-sm text-slate-500"
              >
                <LoaderCircle
                  className="size-4 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Cargando sección…
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      <ToastContainer />
    </div>
  );
}

export function MainLayout() {
  return (
    <SidebarProvider>
      <Workspace />
    </SidebarProvider>
  );
}
