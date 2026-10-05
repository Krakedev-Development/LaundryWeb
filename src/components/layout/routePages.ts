import { lazy, type ComponentType } from 'react';

// Both navigation and the router share these loaders; preview warms the actual page chunk.
const pageLoaders: Record<string, () => Promise<{ default: ComponentType }>> = {
  '/dashboard': () =>
    import('../../features/dashboard/DashboardPage').then((module) => ({
      default: module.DashboardPage,
    })),
  '/operations/orders': () =>
    import('../../features/orders/OrdersListPage').then((module) => ({
      default: module.OrdersListPage,
    })),
  '/operations/orders/:id': () =>
    import('../../features/orders/OrderDetailPage').then((module) => ({
      default: module.OrderDetailPage,
    })),
  '/operations/handoffs': () =>
    import('../../features/handoffs/HandoffsPage').then((module) => ({
      default: module.HandoffsPage,
    })),
  '/operations/dispatch': () =>
    import('../../features/dispatch/DispatchPage').then((module) => ({
      default: module.DispatchPage,
    })),
  '/operations/plant': () =>
    import('../../features/plant/PlantKanbanPage').then((module) => ({
      default: module.PlantKanbanPage,
    })),
  '/operations/deliveries': () =>
    import('../../features/deliveries/DeliveriesPage').then((module) => ({
      default: module.DeliveriesPage,
    })),
  '/operations/incidents': () =>
    import('../../features/incidents/IncidentsPage').then((module) => ({
      default: module.IncidentsPage,
    })),
  '/customers': () =>
    import('../../features/customers/CustomersPage').then((module) => ({
      default: module.CustomersPage,
    })),
  '/customers/kyc': () =>
    import('../../features/customers/KycPage').then((module) => ({
      default: module.KycPage,
    })),
  '/commercial/catalog': () =>
    import('../../features/commercial/CatalogPage').then((module) => ({
      default: module.CatalogPage,
    })),
  '/commercial/promotions': () =>
    import('../../features/commercial/PromotionsPage').then((module) => ({
      default: module.PromotionsPage,
    })),
  '/commercial/rewards': () =>
    import('../../features/commercial/RewardsPage').then((module) => ({
      default: module.RewardsPage,
    })),
  '/logistics/drivers': () =>
    import('../../features/logistics/DriversPage').then((module) => ({
      default: module.DriversPage,
    })),
  '/logistics/facilities': () =>
    import('../../features/logistics/FacilitiesPage').then((module) => ({
      default: module.FacilitiesPage,
    })),
  '/logistics/map': () =>
    import('../../features/logistics/OperationalMapPage').then((module) => ({
      default: module.OperationalMapPage,
    })),
  '/reports': () =>
    import('../../features/reports/ReportsPage').then((module) => ({
      default: module.ReportsPage,
    })),
  '/settings': () =>
    import('../../features/settings/SettingsPage').then((module) => ({
      default: module.SettingsPage,
    })),
};

export const DashboardPage = lazy(pageLoaders['/dashboard']);
export const OrdersListPage = lazy(pageLoaders['/operations/orders']);
export const OrderDetailPage = lazy(pageLoaders['/operations/orders/:id']);
export const HandoffsPage = lazy(pageLoaders['/operations/handoffs']);
export const DispatchPage = lazy(pageLoaders['/operations/dispatch']);
export const PlantKanbanPage = lazy(pageLoaders['/operations/plant']);
export const DeliveriesPage = lazy(pageLoaders['/operations/deliveries']);
export const IncidentsPage = lazy(pageLoaders['/operations/incidents']);
export const CustomersPage = lazy(pageLoaders['/customers']);
export const KycPage = lazy(pageLoaders['/customers/kyc']);
export const CatalogPage = lazy(pageLoaders['/commercial/catalog']);
export const PromotionsPage = lazy(pageLoaders['/commercial/promotions']);
export const RewardsPage = lazy(pageLoaders['/commercial/rewards']);
export const DriversPage = lazy(pageLoaders['/logistics/drivers']);
export const FacilitiesPage = lazy(pageLoaders['/logistics/facilities']);
export const OperationalMapPage = lazy(pageLoaders['/logistics/map']);
export const ReportsPage = lazy(pageLoaders['/reports']);
export const SettingsPage = lazy(pageLoaders['/settings']);

export function prefetchRoute(path: string) {
  // A failed speculative request must not interrupt navigation.
  void pageLoaders[path]?.().catch(() => undefined);
}
