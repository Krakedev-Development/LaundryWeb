import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import { SIDEBAR_MODULES, matchesSidebarRoute } from '../components/layout/sidebar.navigation';

interface PageHeaderState {
  title: string;
  subtitle: string;
}

interface PageTitleContextValue extends PageHeaderState {
  setPageHeader: (pathname: string, header: PageHeaderState) => void;
}

const PageTitleContext = createContext<PageTitleContextValue>({
  title: '',
  subtitle: '',
  setPageHeader: () => undefined,
});

/** Derive a title from the current route via sidebar navigation map. */
function deriveTitleFromRoute(pathname: string): string {
  const all = SIDEBAR_MODULES.flatMap((m) => m.items);
  const match = all
    .filter((item) => matchesSidebarRoute(pathname, item.path))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return match?.label ?? '';
}

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  // El texto de la página se guarda junto a su ruta: al navegar deja de aplicar
  // solo, sin depender del orden de los efectos entre página y proveedor.
  const [override, setOverride] = useState<(PageHeaderState & { pathname: string }) | null>(null);

  const setPageHeader = useCallback((path: string, header: PageHeaderState) => {
    setOverride({ pathname: path, ...header });
  }, []);

  const value = useMemo<PageTitleContextValue>(() => {
    const active = override && override.pathname === pathname ? override : null;
    return {
      title: active?.title || deriveTitleFromRoute(pathname),
      subtitle: active?.subtitle ?? '',
      setPageHeader,
    };
  }, [override, pathname, setPageHeader]);

  return <PageTitleContext.Provider value={value}>{children}</PageTitleContext.Provider>;
}

/** Cada página declara aquí el título y la descripción que se muestran en el header. */
export function useSetPageHeader(opts: { title: string; subtitle?: string }) {
  const { setPageHeader } = useContext(PageTitleContext);
  const { pathname } = useLocation();
  const { title, subtitle = '' } = opts;
  useEffect(() => {
    setPageHeader(pathname, { title, subtitle });
  }, [setPageHeader, pathname, title, subtitle]);
}

export function usePageHeader() {
  const { title, subtitle } = useContext(PageTitleContext);
  return { title, subtitle };
}
