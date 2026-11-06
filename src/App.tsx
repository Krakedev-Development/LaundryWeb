import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './components/layout/MainLayout';

import {
  DashboardPage,
  OrdersListPage,
  OrderDetailPage,
  HandoffsPage,
  DispatchPage,
  PlantPage,
  DeliveriesPage,
  IncidentsPage,
  CustomersPage,
  KycPage,
  CatalogPage,
  PromotionsPage,
  RewardsPage,
  MembershipsPage,
  DriversPage,
  FacilitiesPage,
  OperationalMapPage,
  ReportsPage,
  SettingsPage,
} from './components/layout/routePages';

// Public page
import { LoginPage } from './features/auth/LoginPage';
import { session, useSessionStatus } from './services/auth/session';

// Solo se monta el espacio de trabajo (y sus datos) con una sesión válida.
function RequireSession() {
  const status = useSessionStatus();
  if (status === 'checking')
    return (
      <p role="status" className="p-8 text-sm text-slate-500">
        Verificando sesión…
      </p>
    );
  if (status !== 'signed-in') return <Navigate to="/login" replace />;
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default function App() {
  useEffect(() => {
    void session.restore();
  }, []);
  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Public login */}
          <Route path="/login" element={<LoginPage />} />

          {/* Authenticated workspace layout */}
          <Route path="/" element={<RequireSession />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Operations */}
            <Route path="operations/orders" element={<OrdersListPage />} />
            <Route path="operations/orders/:id" element={<OrderDetailPage />} />
            <Route path="operations/handoffs" element={<HandoffsPage />} />
            <Route path="operations/dispatch" element={<DispatchPage />} />
            <Route path="operations/plant" element={<PlantPage />} />
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
            <Route
              path="commercial/memberships"
              element={<MembershipsPage />}
            />

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
    </>
  );
}
