import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Logo } from '../common/Logo';
import {
  LayoutDashboard,
  ClipboardList,
  Send,
  Boxes,
  Truck,
  AlertTriangle,
  Users,
  ShieldCheck,
  FolderKanban,
  Tag,
  Gift,
  Car,
  Building2,
  Map,
  BarChart3,
  Settings,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  badge?: number | string;
  adminOnly?: boolean;
}

interface SidebarGroup {
  category: string;
  items: SidebarItem[];
  adminOnly?: boolean;
}

export const AppSidebar: React.FC<{ isOpenMobile: boolean; onCloseMobile: () => void }> = ({
  isOpenMobile,
  onCloseMobile,
}) => {
  const { currentUser, orders, incidents, customers } = useApp();
  const isAdmin = currentUser.role === 'ADMIN';

  // Badge counts
  const unassignedOrdersCount = orders.filter((o) => o.status === 'PICKUP_PENDING').length;
  const activeIncidentsCount = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS').length;
  const pendingKycCount = customers.filter((c) => c.kycStatus === 'PENDING').length;

  const navigationGroups: SidebarGroup[] = [
    {
      category: 'INICIO',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      category: 'OPERACIONES',
      items: [
        {
          name: 'Solicitudes',
          path: '/operations/orders',
          icon: <ClipboardList className="w-4 h-4 shrink-0" />,
          badge: orders.length,
        },
        {
          name: 'Despacho',
          path: '/operations/dispatch',
          icon: <Send className="w-4 h-4 shrink-0" />,
          badge: unassignedOrdersCount > 0 ? unassignedOrdersCount : undefined,
        },
        {
          name: 'Planta de lavado',
          path: '/operations/plant',
          icon: <Boxes className="w-4 h-4 shrink-0" />,
        },
        {
          name: 'Entregas',
          path: '/operations/deliveries',
          icon: <Truck className="w-4 h-4 shrink-0" />,
        },
        {
          name: 'Incidencias',
          path: '/operations/incidents',
          icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : undefined,
        },
      ],
    },
    {
      category: 'CLIENTES',
      items: [
        {
          name: 'Clientes',
          path: '/customers',
          icon: <Users className="w-4 h-4 shrink-0" />,
        },
        {
          name: 'Validaciones KYC',
          path: '/customers/kyc',
          icon: <ShieldCheck className="w-4 h-4 shrink-0" />,
          badge: pendingKycCount > 0 ? pendingKycCount : undefined,
          adminOnly: true,
        },
      ],
    },
    {
      category: 'COMERCIAL',
      adminOnly: true,
      items: [
        {
          name: 'Catálogo',
          path: '/commercial/catalog',
          icon: <FolderKanban className="w-4 h-4 shrink-0" />,
          adminOnly: true,
        },
        {
          name: 'Promociones',
          path: '/commercial/promotions',
          icon: <Tag className="w-4 h-4 shrink-0" />,
          adminOnly: true,
        },
        {
          name: 'Recompensas',
          path: '/commercial/rewards',
          icon: <Gift className="w-4 h-4 shrink-0" />,
          adminOnly: true,
        },
      ],
    },
    {
      category: 'LOGÍSTICA',
      items: [
        {
          name: 'Choferes',
          path: '/logistics/drivers',
          icon: <Car className="w-4 h-4 shrink-0" />,
        },
        {
          name: 'Sedes',
          path: '/logistics/facilities',
          icon: <Building2 className="w-4 h-4 shrink-0" />,
        },
        {
          name: 'Mapa operativo',
          path: '/logistics/map',
          icon: <Map className="w-4 h-4 shrink-0" />,
        },
      ],
    },
    {
      category: 'GESTIÓN',
      items: [
        {
          name: 'Reportes',
          path: '/reports',
          icon: <BarChart3 className="w-4 h-4 shrink-0" />,
        },
        {
          name: 'Configuración',
          path: '/settings',
          icon: <Settings className="w-4 h-4 shrink-0" />,
          adminOnly: true,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 lg:hidden backdrop-blur-2xs"
        />
      )}

      {/* Sidebar container in Pure Light Mode */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-white text-slate-800 border-r border-slate-200/90 transition-transform duration-200 ease-in-out shadow-xs ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header with clean light logo */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 shrink-0">
          <NavLink to="/dashboard" onClick={onCloseMobile} className="block">
            <Logo variant="full" size="md" />
          </NavLink>
        </div>

        {/* Navigation items list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
          {navigationGroups.map((group) => {
            if (group.adminOnly && !isAdmin) return null;

            const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.category} className="space-y-1">
                <p className="px-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {group.category}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onCloseMobile}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-[#E8EEF5] text-[#143F73] font-bold border-l-3 border-[#143F73]'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.icon}
                        <span className="truncate">{item.name}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                            item.path === '/operations/incidents'
                              ? 'bg-rose-100 text-rose-800'
                              : item.path === '/operations/dispatch'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Institutional brand block in light mode per spec #9 */}
        <div className="p-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
          <div className="flex items-start gap-2.5">
            <span className="text-xl">🍃</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
                Ropa limpia, un mundo más limpio
              </p>
              <p className="text-[11px] text-slate-500 font-normal leading-snug mt-0.5">
                Operaciones eficientes para un mejor mañana.
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
