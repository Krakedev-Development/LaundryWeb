import {
  ChartNoAxesCombined,
  ClipboardList,
  Gift,
  LayoutDashboard,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarItem {
  label: string;
  path: string;
  adminOnly?: boolean;
  badge?: 'dispatch' | 'incidents' | 'kyc';
}
export interface SidebarModule {
  id: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  items: SidebarItem[];
}

export const SIDEBAR_MODULES: readonly SidebarModule[] = [
  {
    id: 'home',
    label: 'INICIO',
    icon: LayoutDashboard,
    items: [{ label: 'Dashboard', path: '/dashboard' }],
  },
  {
    id: 'operations',
    label: 'OPERACIONES',
    icon: ClipboardList,
    items: [
      { label: 'Solicitudes', path: '/operations/orders' },
      { label: 'Recepción y retiros', path: '/operations/handoffs' },
      { label: 'Despacho', path: '/operations/dispatch', badge: 'dispatch' },
      { label: 'Planta de lavado', path: '/operations/plant' },
      { label: 'Entregas', path: '/operations/deliveries' },
      {
        label: 'Incidencias',
        path: '/operations/incidents',
        badge: 'incidents',
      },
    ],
  },
  {
    id: 'customers',
    label: 'CLIENTES',
    icon: Users,
    items: [
      { label: 'Clientes', path: '/customers' },
      {
        label: 'Validaciones KYC',
        path: '/customers/kyc',
        adminOnly: true,
        badge: 'kyc',
      },
    ],
  },
  {
    id: 'commercial',
    label: 'COMERCIAL',
    icon: Gift,
    adminOnly: true,
    items: [
      { label: 'Catálogo', path: '/commercial/catalog' },
      { label: 'Promociones', path: '/commercial/promotions' },
      { label: 'Recompensas', path: '/commercial/rewards' },
    ],
  },
  {
    id: 'logistics',
    label: 'LOGÍSTICA',
    icon: Truck,
    items: [
      { label: 'Choferes', path: '/logistics/drivers' },
      { label: 'Sedes', path: '/logistics/facilities' },
      { label: 'Mapa operativo', path: '/logistics/map' },
    ],
  },
  {
    id: 'management',
    label: 'GESTIÓN',
    icon: ChartNoAxesCombined,
    items: [
      { label: 'Reportes', path: '/reports' },
      { label: 'Configuración', path: '/settings', adminOnly: true },
    ],
  },
];

export function visibleModules(isAdmin: boolean): SidebarModule[] {
  return SIDEBAR_MODULES.filter((module) => !module.adminOnly || isAdmin)
    .map((module) => ({
      ...module,
      items: module.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((module) => module.items.length > 0);
}

export function matchesSidebarRoute(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function activeSidebarPath(
  modules: readonly SidebarModule[],
  pathname: string,
) {
  return modules
    .flatMap((module) => module.items)
    .filter((item) => matchesSidebarRoute(pathname, item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;
}
