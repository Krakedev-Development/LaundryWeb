import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  SIDEBAR_DESKTOP_QUERY,
  SIDEBAR_STORAGE_KEY,
} from './sidebar.constants';

interface SidebarState {
  collapsed: boolean;
  isLargeScreen: boolean;
  mobileOpen: boolean;
  setCollapsed: (collapsed: boolean) => void;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

function readCollapsed() {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, updateCollapsed] = useState(readCollapsed);
  const [isLargeScreen, setIsLargeScreen] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(SIDEBAR_DESKTOP_QUERY).matches,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const setCollapsed = useCallback((next: boolean) => {
    updateCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {
      // Navigation still works when browser storage is unavailable.
    }
  }, []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  useEffect(() => {
    const media = window.matchMedia(SIDEBAR_DESKTOP_QUERY);
    const onChange = () => {
      setIsLargeScreen(media.matches);
      setMobileOpen(false);
    };
    media.addEventListener('change', onChange);
    const onStorage = (event: StorageEvent) => {
      if (event.key === SIDEBAR_STORAGE_KEY || event.key === null)
        updateCollapsed(readCollapsed());
    };
    window.addEventListener('storage', onStorage);
    return () => {
      media.removeEventListener('change', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const value = useMemo(
    () => ({
      collapsed,
      isLargeScreen,
      mobileOpen,
      setCollapsed,
      openMobile,
      closeMobile,
    }),
    [
      collapsed,
      isLargeScreen,
      mobileOpen,
      setCollapsed,
      openMobile,
      closeMobile,
    ],
  );
  return createElement(SidebarContext.Provider, { value }, children);
}

export function useSidebarState() {
  const state = useContext(SidebarContext);
  if (!state) throw new Error('useSidebarState requires SidebarProvider');
  return state;
}
