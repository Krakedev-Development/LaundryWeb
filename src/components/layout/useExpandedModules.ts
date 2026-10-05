import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { activeSidebarPath, type SidebarModule } from './sidebar.navigation';

export function useExpandedModules(modules: readonly SidebarModule[]) {
  const { pathname } = useLocation();
  const activePath = activeSidebarPath(modules, pathname);
  const activeModuleId = modules.find((module) =>
    module.items.some((item) => item.path === activePath),
  )?.id;
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activeModuleId ? [activeModuleId] : []),
  );

  useEffect(() => {
    // A new route opens its parent, but users can still collapse the current parent.
    if (activeModuleId)
      setExpanded((previous) => new Set([...previous, activeModuleId]));
  }, [pathname, activeModuleId]);

  const toggleModule = useCallback(
    (id: string) =>
      setExpanded((previous) => {
        const next = new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    [],
  );
  const openModule = useCallback(
    (id: string) => setExpanded((previous) => new Set([...previous, id])),
    [],
  );
  return useMemo(
    () => ({ expanded, activePath, activeModuleId, toggleModule, openModule }),
    [expanded, activePath, activeModuleId, toggleModule, openModule],
  );
}
