import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Driver, Facility, Order, Incident } from '../../types';
import {
  MapPin,
  Truck,
  Building2,
  AlertTriangle,
  Layers,
  X,
  Phone,
  ArrowRight,
  Navigation,
  Compass,
} from 'lucide-react';

export const OperationalMapPage: React.FC = () => {
  const { facilities, drivers, orders, incidents } = useApp();
  const navigate = useNavigate();

  // Layer toggles per spec #42
  const [showDrivers, setShowDrivers] = useState(true);
  const [showPickups, setShowPickups] = useState(true);
  const [showDeliveries, setShowDeliveries] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  // Selected item popover
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'DRIVER' | 'PICKUP' | 'DELIVERY' | 'FACILITY' | 'INCIDENT';
    data: any;
  } | null>(null);

  // Filtered dataset for map pins
  const pickupOrders = orders.filter((o) => o.status === 'PICKUP_PENDING' || o.status === 'PICKUP_ASSIGNED');
  const deliveryOrders = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY' || o.status === 'DELIVERY_ASSIGNED');
  const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mapa Operativo Logístico"
        subtitle="Visualización en tiempo real de sedes de lavado, rutas de choferes, recogidas y entregas activas."
      />

      {/* Main Map Viewport */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col lg:flex-row h-[720px] relative">
        {/* Layer Controls Panel (Left or overlay) */}
        <div className="w-full lg:w-72 bg-slate-50/70 border-b lg:border-b-0 lg:border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 text-xs">
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 pb-2 border-b border-slate-200">
              <Layers className="w-4 h-4 text-sky-700" />
              <span>Capas Operacionales</span>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <span className="flex items-center gap-2 text-slate-800 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-sky-700" /> Sedes de Planta
                </span>
                <input
                  type="checkbox"
                  checked={showFacilities}
                  onChange={(e) => setShowFacilities(e.target.checked)}
                  className="rounded text-sky-700 w-4 h-4 focus:ring-sky-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-800 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-teal-500" /> Choferes en Flota
                </span>
                <input
                  type="checkbox"
                  checked={showDrivers}
                  onChange={(e) => setShowDrivers(e.target.checked)}
                  className="rounded text-teal-600 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-800 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-amber-500" /> Recogidas Pendientes
                </span>
                <input
                  type="checkbox"
                  checked={showPickups}
                  onChange={(e) => setShowPickups(e.target.checked)}
                  className="rounded text-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-800 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Entregas en Ruta
                </span>
                <input
                  type="checkbox"
                  checked={showDeliveries}
                  onChange={(e) => setShowDeliveries(e.target.checked)}
                  className="rounded text-emerald-600 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:bg-slate-50">
                <span className="flex items-center gap-2 text-slate-800 font-semibold">
                  <span className="w-3 h-3 rounded-full bg-rose-500" /> Incidencias Activas
                </span>
                <input
                  type="checkbox"
                  checked={showIncidents}
                  onChange={(e) => setShowIncidents(e.target.checked)}
                  className="rounded text-rose-600 w-4 h-4"
                />
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center gap-1 font-bold text-slate-700">
              <Compass className="w-3.5 h-3.5" /> Ciudad Metropolitana
            </p>
            <p>Monitoreo geográfico continuo de vehículos y paradas.</p>
          </div>
        </div>

        {/* Map Canvas Area */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
          {/* Subtle Grid styling */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'linear-gradient(to right, #0F4C81 1px, transparent 1px), linear-gradient(to bottom, #0F4C81 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />

          {/* District boundaries representation */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full border border-sky-500/20 pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full border border-blue-500/20 pointer-events-none" />

          {/* FACILITY MARKERS */}
          {showFacilities &&
            facilities.map((fac, idx) => (
              <button
                key={fac.id}
                onClick={() => setSelectedEntity({ type: 'FACILITY', data: fac })}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 p-2 bg-[#0F4C81] text-white rounded-xl shadow-md hover:scale-105 transition-transform flex items-center gap-1.5 border-2 border-white ring-4 ring-[#0F4C81]/15 cursor-pointer"
                style={{
                  top: `${28 + idx * 24}%`,
                  left: `${30 + idx * 18}%`,
                }}
              >
                <Building2 className="w-4 h-4" />
                <span className="text-[11px] font-bold pr-1">{fac.code}</span>
              </button>
            ))}

          {/* DRIVER MARKERS */}
          {showDrivers &&
            drivers.map((drv, idx) => (
              <button
                key={drv.id}
                onClick={() => setSelectedEntity({ type: 'DRIVER', data: drv })}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full shadow-md hover:scale-110 transition-transform border-2 border-white cursor-pointer ${
                  drv.status === 'AVAILABLE'
                    ? 'bg-teal-600 text-white ring-4 ring-teal-400/20'
                    : 'bg-amber-600 text-white ring-4 ring-amber-400/20'
                }`}
                style={{
                  top: `${20 + (idx % 4) * 18}%`,
                  left: `${20 + (idx % 3) * 26 + (idx * 5)}%`,
                }}
                title={drv.name}
              >
                <Truck className="w-4 h-4" />
              </button>
            ))}

          {/* PICKUP MARKERS */}
          {showPickups &&
            pickupOrders.map((ord, idx) => (
              <button
                key={ord.id}
                onClick={() => setSelectedEntity({ type: 'PICKUP', data: ord })}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 p-1.5 bg-amber-500 text-slate-900 font-bold rounded-lg shadow-md hover:scale-110 transition-transform border border-white ring-3 ring-amber-300/40 text-[10px] cursor-pointer"
                style={{
                  top: `${35 + idx * 14}%`,
                  left: `${55 + (idx % 2) * 16}%`,
                }}
              >
                <MapPin className="w-3.5 h-3.5 text-slate-900 inline mr-0.5" />
                {ord.id.replace('SOL-', '')}
              </button>
            ))}

          {/* DELIVERY MARKERS */}
          {showDeliveries &&
            deliveryOrders.map((ord, idx) => (
              <button
                key={ord.id}
                onClick={() => setSelectedEntity({ type: 'DELIVERY', data: ord })}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:scale-110 transition-transform border border-white ring-3 ring-emerald-300/40 text-[10px] cursor-pointer"
                style={{
                  top: `${50 - idx * 16}%`,
                  left: `${65 - (idx % 2) * 20}%`,
                }}
              >
                <Navigation className="w-3.5 h-3.5 text-white inline mr-0.5" />
                {ord.id.replace('SOL-', '')}
              </button>
            ))}

          {/* INCIDENT MARKERS */}
          {showIncidents &&
            openIncidents.map((inc, idx) => (
              <button
                key={inc.id}
                onClick={() => setSelectedEntity({ type: 'INCIDENT', data: inc })}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 p-1.5 bg-rose-600 text-white rounded-full shadow-md hover:scale-115 transition-transform border-2 border-white ring-4 ring-rose-400/30 animate-pulse cursor-pointer"
                style={{
                  top: `${42 + idx * 20}%`,
                  left: `${45 + idx * 15}%`,
                }}
                title={inc.id}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
              </button>
            ))}

          {/* Popover on selected entity per spec #42 */}
          {selectedEntity && (
            <div className="absolute bottom-6 right-6 max-w-sm w-full bg-white rounded-2xl border border-slate-200/90 shadow-xl p-4 z-20 animate-in fade-in slide-in-from-bottom-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-[10px] text-sky-800 uppercase tracking-wider bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {selectedEntity.type}
                </span>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Driver info */}
              {selectedEntity.type === 'DRIVER' && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={selectedEntity.data.avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{selectedEntity.data.name}</h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Placa: {selectedEntity.data.vehiclePlate} ({selectedEntity.data.vehicleType})
                      </p>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estado:</span>
                      <strong className="text-emerald-700">{selectedEntity.data.status}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carga activa:</span>
                      <strong className="font-mono">{selectedEntity.data.activeOrders} / {selectedEntity.data.maxOrders} pedidos</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sede asignada:</span>
                      <span>{selectedEntity.data.facilityName}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/logistics/drivers')}
                    className="w-full py-2 text-center text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-xl transition-colors cursor-pointer"
                  >
                    Ver Chofer en Flota →
                  </button>
                </div>
              )}

              {/* Order Pickup or Delivery */}
              {(selectedEntity.type === 'PICKUP' || selectedEntity.type === 'DELIVERY') && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-sky-900 font-mono">
                      {selectedEntity.data.id}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                      {selectedEntity.data.status}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{selectedEntity.data.customerName}</p>
                  <p className="text-[11px] text-slate-500">
                    {selectedEntity.data.customerAddress.street} #{selectedEntity.data.customerAddress.number}, {selectedEntity.data.customerAddress.neighborhood}
                  </p>
                  <div className="p-2 bg-slate-50 rounded-lg text-[11px] flex justify-between font-mono">
                    <span>SLA: {selectedEntity.data.slaDeadline}</span>
                    <span>Total: ${selectedEntity.data.pricing.total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/operations/orders/${selectedEntity.data.id}`)}
                    className="w-full py-2 text-center text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl transition-colors flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                  >
                    <span>Abrir Detalle 360°</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Facility */}
              {selectedEntity.type === 'FACILITY' && (
                <div className="mt-2.5 space-y-2">
                  <h4 className="font-bold text-sm text-slate-900">{selectedEntity.data.name}</h4>
                  <p className="text-[11px] text-slate-500">{selectedEntity.data.address}</p>
                  <div className="p-2.5 bg-slate-50 rounded-lg text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Capacidad:</span>
                      <strong className="font-mono">{selectedEntity.data.capacityMaxKgDay} kg/día</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carga actual:</span>
                      <strong className="font-mono">{selectedEntity.data.currentLoadKgDay} kg</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/logistics/facilities')}
                    className="w-full py-2 text-center text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 rounded-xl transition-colors cursor-pointer"
                  >
                    Gestionar Sede →
                  </button>
                </div>
              )}

              {/* Incident */}
              {selectedEntity.type === 'INCIDENT' && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-700 font-mono">{selectedEntity.data.id}</span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      {selectedEntity.data.severity}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">{selectedEntity.data.type}</p>
                  <p className="text-[11px] text-slate-600 line-clamp-2">{selectedEntity.data.description}</p>
                  <button
                    onClick={() => navigate('/operations/incidents')}
                    className="w-full py-2 text-center text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors shadow-xs cursor-pointer"
                  >
                    Abrir Incidencia →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
