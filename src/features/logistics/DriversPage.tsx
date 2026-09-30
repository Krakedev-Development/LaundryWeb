import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { Driver, DriverStatus } from '../../types';
import {
  Car,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  Star,
  MapPin,
  Phone,
  Mail,
  Edit2,
  X,
  Gauge,
} from 'lucide-react';

export const DriversPage: React.FC = () => {
  const { drivers, facilities, createDriver, updateDriver, currentUser } = useApp();
  const isAdmin = currentUser.role === 'ADMIN';

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [vehicleType, setVehicleType] = useState<'VAN' | 'MOTO' | 'CAMIONETA'>('VAN');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || 'FAC-01');
  const [zoneId, setZoneId] = useState('ZONA-NORTE');
  const [maxOrders, setMaxOrders] = useState(5);
  const [status, setStatus] = useState<DriverStatus>('AVAILABLE');

  // KPIs
  const availableCount = drivers.filter((d) => d.status === 'AVAILABLE').length;
  const onDutyCount = drivers.filter((d) => d.status === 'ON_DUTY' || d.status === 'BUSY').length;
  const offlineCount = drivers.filter((d) => d.status === 'OFFLINE').length;
  const avgLoad = (
    drivers.reduce((acc, d) => acc + d.activeOrders, 0) / (drivers.length || 1)
  ).toFixed(1);

  const handleOpenCreate = () => {
    setEditingDriver(null);
    setName('');
    setPhone('+51 980 000 000');
    setEmail('chofer@laundryweb.com');
    setVehicleType('VAN');
    setVehiclePlate('ABC-000');
    setFacilityId(facilities[0]?.id || 'FAC-01');
    setZoneId('ZONA-NORTE');
    setMaxOrders(5);
    setStatus('AVAILABLE');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setEmail(driver.email);
    setVehicleType(driver.vehicleType);
    setVehiclePlate(driver.vehiclePlate);
    setFacilityId(driver.facilityId);
    setZoneId(driver.zoneId);
    setMaxOrders(driver.maxOrders);
    setStatus(driver.status);
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const facility = facilities.find((f) => f.id === facilityId);
    const facilityName = facility?.name || 'Sede Central Norte';
    const zoneName =
      zoneId === 'ZONA-NORTE'
        ? 'Zona Norte & Centro'
        : zoneId === 'ZONA-SUR'
        ? 'Zona Sur & Bahía'
        : 'Zona Financiera & Residencial';

    if (editingDriver) {
      updateDriver({
        ...editingDriver,
        name,
        phone,
        email,
        vehicleType,
        vehiclePlate: vehiclePlate.toUpperCase(),
        facilityId,
        facilityName,
        zoneId,
        zoneName,
        maxOrders,
        status,
      });
    } else {
      createDriver({
        name,
        phone,
        email,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
        vehicleType,
        vehiclePlate: vehiclePlate.toUpperCase(),
        facilityId,
        facilityName,
        zoneId,
        zoneName,
        status,
        maxOrders,
        location: {
          lat: -12.0464,
          lng: -77.0428,
          address: 'Base Sede',
          lastUpdated: 'Reciente',
        },
      });
    }

    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Gestión de Choferes y Flota"
        subtitle={
          isAdmin
            ? 'Administración de conductores, unidades de transporte, asignación de sedes y estados.'
            : 'Consulta de flota operativa, zonas de cobertura y carga activa (Modo Supervisor).'
        }
        actions={
          isAdmin ? (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Chofer</span>
            </button>
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Disponibles"
          value={availableCount}
          subtitle="Listos para despacho"
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="En Servicio"
          value={onDutyCount}
          subtitle="En ruta de recogida o entrega"
          variant="aqua"
          icon={<Truck className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Offline / Taller"
          value={offlineCount}
          subtitle="Fuera de turno operativo"
          icon={<Clock className="w-5 h-5 text-slate-400" />}
        />
        <MetricCard
          title="Carga Promedio"
          value={`${avgLoad} pedidos`}
          subtitle="Capacidad utilizada"
          icon={<Gauge className="w-5 h-5 text-sky-600" />}
        />
      </div>

      {/* Table per spec #40 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Chofer</th>
                <th className="py-3.5 px-4">Vehículo / Placa</th>
                <th className="py-3.5 px-4">Contacto</th>
                <th className="py-3.5 px-4">Sede Asignada</th>
                <th className="py-3.5 px-4">Zona Cobertura</th>
                <th className="py-3.5 px-4 text-center">Carga Activa</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4">Ubicación Actual</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => {
                const loadPercent = Math.round((driver.activeOrders / driver.maxOrders) * 100);
                return (
                  <tr key={driver.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">{driver.name}</span>
                          <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500" /> {driver.rating} ({driver.completedTripsToday} viajes hoy)
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">{driver.vehicleType}</span>
                      <span className="block font-mono text-[11px] font-bold text-sky-800">
                        {driver.vehiclePlate}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div>{driver.phone}</div>
                      <div className="text-[11px] text-slate-400">{driver.email}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                      {driver.facilityName}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {driver.zoneName}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-bold text-slate-800 tabular-nums">
                          {driver.activeOrders} / {driver.maxOrders}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              loadPercent >= 100 ? 'bg-red-500' : loadPercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${loadPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                          driver.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : driver.status === 'ON_DUTY'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : driver.status === 'BUSY'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {driver.status === 'AVAILABLE'
                          ? 'Disponible'
                          : driver.status === 'ON_DUTY'
                          ? 'En Servicio'
                          : driver.status === 'BUSY'
                          ? 'Carga Llena'
                          : 'Offline'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-slate-500 truncate max-w-[150px]">
                      {driver.location.address}
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {driver.location.lastUpdated}
                      </span>
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(driver)}
                          className="p-1.5 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar chofer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Crear / Editar Chofer (Solo Admin) */}
      {isAdmin && isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingDriver ? `Editar: ${editingDriver.name}` : 'Registrar Nuevo Chofer'}
                </h3>
                <p className="text-xs text-slate-500">Asignación vehicular, sede base y límites de carga</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Carlos Ruiz"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teléfono móvil *</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Correo corporativo</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Vehículo</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="VAN">VAN de carga</option>
                    <option value="MOTO">Moto Courier</option>
                    <option value="CAMIONETA">Camioneta</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Placa Vehicular *</label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="ABC-123"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sede Base</label>
                  <select
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  >
                    {facilities.map((fac) => (
                      <option key={fac.id} value={fac.id}>{fac.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zona Cobertura</label>
                  <select
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="ZONA-NORTE">Zona Norte & Centro</option>
                    <option value="ZONA-SUR">Zona Sur & Bahía</option>
                    <option value="ZONA-FINANCIERA">Zona Financiera</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Capacidad Máx. Pedidos</label>
                  <input
                    type="number"
                    value={maxOrders}
                    onChange={(e) => setMaxOrders(parseInt(e.target.value) || 5)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estado Operativo</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as DriverStatus)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="AVAILABLE">Disponible</option>
                    <option value="ON_DUTY">En Servicio / En ruta</option>
                    <option value="BUSY">Carga Completa (Ocupado)</option>
                    <option value="OFFLINE">Offline / Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingDriver ? 'Guardar Cambios' : 'Registrar Chofer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
