import { HandoffsPage } from './features/handoffs/HandoffsPage';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './features/auth/LoginPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { OrdersListPage } from './features/orders/OrdersListPage';
import { OrderDetailPage } from './features/orders/OrderDetailPage';
import { DispatchPage } from './features/dispatch/DispatchPage';
import { PlantKanbanPage } from './features/plant/PlantKanbanPage';
import { DeliveriesPage } from './features/deliveries/DeliveriesPage';
import { IncidentsPage } from './features/incidents/IncidentsPage';
import { CustomersPage } from './features/customers/CustomersPage';
import { KycPage } from './features/customers/KycPage';
import { CatalogPage } from './features/commercial/CatalogPage';
import { PromotionsPage } from './features/commercial/PromotionsPage';
import { RewardsPage } from './features/commercial/RewardsPage';
import { DriversPage } from './features/logistics/DriversPage';
import { FacilitiesPage } from './features/logistics/FacilitiesPage';
import { OperationalMapPage } from './features/logistics/OperationalMapPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { SettingsPage } from './features/settings/SettingsPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated workspace layout */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Operations */}
            <Route path="operations/orders" element={<OrdersListPage />} />
            <Route path="operations/orders/:id" element={<OrderDetailPage />} />
            <Route path="operations/handoffs" element={<HandoffsPage />} />
            <Route path="operations/dispatch" element={<DispatchPage />} />
            <Route path="operations/plant" element={<PlantKanbanPage />} />
            <Route path="operations/deliveries" element={<DeliveriesPage />} />
            <Route path="operations/incidents" element={<IncidentsPage />} />
            <Route
              path="operations/incidents/:id"
              element={<IncidentsPage />}
            />

            {/* Customers */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomersPage />} />
            <Route path="customers/kyc" element={<KycPage />} />

            {/* Commercial (Admin) */}
            <Route path="commercial/catalog" element={<CatalogPage />} />
            <Route path="commercial/promotions" element={<PromotionsPage />} />
            <Route path="commercial/rewards" element={<RewardsPage />} />

            {/* Logistics */}
            <Route path="logistics/drivers" element={<DriversPage />} />
            <Route path="logistics/facilities" element={<FacilitiesPage />} />
            <Route path="logistics/map" element={<OperationalMapPage />} />

            {/* Management */}
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
