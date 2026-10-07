import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { Facility } from '../../types';
import {
  Building2,
  Boxes,
  Truck,
  Plus,
  Edit2,
  CheckCircle2,
  X,
  Phone,
  User,
  MapPin,
} from 'lucide-react';

export const FacilitiesPage: React.FC = () => {
  const { facilities, createFacility, updateFacility, currentUser, showToast } =
    useApp();
  const isAdmin = currentUser.role === 'ADMIN';

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Metropolitana');
  const [zone, setZone] = useState('Zona Norte & Centro');
  const [capacityMaxKgDay, setCapacityMaxKgDay] = useState(1200);
  const [phone, setPhone] = useState('+51 1 555-0100');
  const [managerName, setManagerName] = useState('Roberto Gómez');
  const [status, setStatus] = useState<'ACTIVE' | 'MAINTENANCE'>('ACTIVE');

  const [acceptsCustomerDropoff, setAcceptsCustomerDropoff] = useState(true);
  const [allowsCustomerPickup, setAllowsCustomerPickup] = useState(true);
  const [days, setDays] = useState([1, 2, 3, 4, 5, 6]);
  const [open, setOpen] = useState('08:00'),
    [close, setClose] = useState('18:00');
  const [lat, setLat] = useState(-2.1229),
    [lng, setLng] = useState(-79.8682);
  // KPIs
  const totalFacilities = facilities.length;
  const totalCapacityKg = facilities.reduce(
    (acc, f) => acc + f.capacityMaxKgDay,
    0,
  );
  const currentTotalLoadKg = facilities.reduce(
    (acc, f) => acc + f.currentLoadKgDay,
    0,
  );
  const avgUtilization = Math.round(
    (currentTotalLoadKg / (totalCapacityKg || 1)) * 100,
  );

  const handleOpenCreate = () => {
    setEditingFacility(null);
    setAcceptsCustomerDropoff(true);
    setAllowsCustomerPickup(true);
    setDays([1, 2, 3, 4, 5, 6]);
    setOpen('08:00');
    setClose('18:00');
    setLat(-2.1229);
    setLng(-79.8682);
    setName('');
    setCode('HUB-NUEVO');
    setAddress('Av. Los Fresnos 450');
    setCity('Metropolitana');
    setZone('Zona Norte & Centro');
    setCapacityMaxKgDay(1000);
    setPhone('+51 1 555-0100');
    setManagerName('Admin Responsable');
    setStatus('ACTIVE');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (facility: Facility) => {
    setEditingFacility(facility);
    setAcceptsCustomerDropoff(facility.acceptsCustomerDropoff !== false);
    setAllowsCustomerPickup(facility.allowsCustomerPickup !== false);
    setDays(facility.operatingSchedule?.days ?? [1, 2, 3, 4, 5, 6]);
    setOpen(facility.operatingSchedule?.open ?? '08:00');
    setClose(facility.operatingSchedule?.close ?? '18:00');
    setLat(facility.coordinates.lat);
    setLng(facility.coordinates.lng);
    setName(facility.name);
    setCode(facility.code);
    setAddress(facility.address);
    setCity(facility.city);
    setZone(facility.zone);
    setCapacityMaxKgDay(facility.capacityMaxKgDay);
    setPhone(facility.phone);
    setManagerName(facility.managerName);
    setStatus(facility.status);
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      if (editingFacility) {
        updateFacility({
          ...editingFacility,
          name,
          code,
          address,
          city,
          zone,
          capacityMaxKgDay,
          phone,
          managerName,
          status,
          acceptsCustomerDropoff,
          allowsCustomerPickup,
          operatingSchedule: { days, open, close },
          coordinates: { lat, lng },
        });
      } else {
        createFacility({
          name,
          code,
          address,
          city,
          zone,
          capacityMaxKgDay,
          phone,
          managerName,
          status,
          acceptsCustomerDropoff,
          allowsCustomerPickup,
          operatingSchedule: { days, open, close },
          coordinates: { lat, lng },
        });
      }

      setIsDrawerOpen(false);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'No se pudo guardar la sede',
        message: error instanceof Error ? error.message : 'Revisa los datos.',
      });
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sedes Operativas y Plantas de Lavado"
        subtitle={
          isAdmin
            ? 'Gestión de hubs de procesamiento, capacidad instalada en kg/día y cobertura geográfica.'
            : 'Consulta de capacidad operativa y carga de sedes en tiempo real (Modo Supervisor).'
        }
        actions={
          isAdmin ? (
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Sede</span>
            </button>
          ) : undefined
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Sedes Totales"
          value={totalFacilities}
          subtitle="Hubs en red activa"
          icon={<Building2 className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Capacidad Instalada"
          value={`${totalCapacityKg.toLocaleString()} kg/día`}
          subtitle="Máximo de procesamiento"
          variant="aqua"
          icon={<Boxes className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Carga Actual"
          value={`${currentTotalLoadKg.toLocaleString()} kg/día`}
          subtitle="Volumen en túneles"
          icon={<Truck className="w-4 h-4 text-emerald-600" />}
        />
        <MetricCard
          title="Ocupación Global"
          value={`${avgUtilization}%`}
          subtitle="Eficiencia de planta"
          variant={avgUtilization > 85 ? 'warning' : 'success'}
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
      </div>

      {/* Facilities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {facilities.map((fac) => {
          const loadPct = Math.round(
            (fac.currentLoadKgDay / fac.capacityMaxKgDay) * 100,
          );
          return (
            <div
              key={fac.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    {fac.code}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                      fac.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {fac.status === 'ACTIVE' ? 'Operativa' : 'Mantenimiento'}
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900">
                  {fac.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{fac.address}</span>
                </p>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Zona: {fac.zone}
                </p>

                <p className="text-xs text-slate-600 mt-2">
                  {fac.acceptsCustomerDropoff
                    ? 'Ingreso habilitado'
                    : 'Sin ingreso directo'}{' '}
                  ·{' '}
                  {fac.allowsCustomerPickup
                    ? 'Retiro habilitado'
                    : 'Sin retiro directo'}
                </p>
                {fac.operatingSchedule && (
                  <p className="text-xs text-slate-500">
                    {fac.operatingSchedule.open}–{fac.operatingSchedule.close} ·{' '}
                    {fac.operatingSchedule.days
                      .map(
                        (day) =>
                          ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][
                            day
                          ],
                      )
                      .join(', ')}
                  </p>
                )}
                {/* Capacity Bar */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Carga del día:</span>
                    <strong className="text-slate-800">
                      {fac.currentLoadKgDay} / {fac.capacityMaxKgDay} kg
                    </strong>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        loadPct >= 85 ? 'bg-rose-500' : 'bg-sky-600'
                      }`}
                      style={{ width: `${loadPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                    <span>{fac.activeOrders} órdenes en proceso</span>
                    <span className="font-bold text-slate-700">
                      {loadPct}% utilizado
                    </span>
                  </div>
                </div>

                {/* Contact and Manager */}
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Jefe de Planta: <strong>{fac.managerName}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{fac.phone}</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(fac)}
                    className="text-xs font-bold text-sky-800 hover:text-sky-900 flex items-center gap-1.5 hover:underline cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Sede</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Drawer Crear / Editar Sede */}
      {isAdmin && isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingFacility
                    ? `Editar: ${editingFacility.name}`
                    : 'Registrar Nueva Sede'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configuración de planta y capacidad industrial diaria
                </p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
            >
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nombre de la Sede *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Sede Central Norte - Clean Hub"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Código Identificador *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="HUB-01"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Capacidad Máx (kg/día)
                  </label>
                  <input
                    type="number"
                    value={capacityMaxKgDay}
                    onChange={(e) =>
                      setCapacityMaxKgDay(parseInt(e.target.value) || 0)
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Dirección completa
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Zona de Cobertura
                  </label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  >
                    <option value="ACTIVE">Activa / Operando</option>
                    <option value="MAINTENANCE">En Mantenimiento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Jefe de Planta
                  </label>
                  <input
                    type="text"
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Teléfono Directo
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <fieldset className="space-y-3 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <legend className="font-bold">Recepción y horarios</legend>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={acceptsCustomerDropoff}
                    onChange={(e) =>
                      setAcceptsCustomerDropoff(e.target.checked)
                    }
                  />
                  Permite ingreso del cliente
                </label>
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    checked={allowsCustomerPickup}
                    onChange={(e) => setAllowsCustomerPickup(e.target.checked)}
                  />
                  Permite retiro del cliente
                </label>
                <div className="flex flex-wrap gap-3">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(
                    (name, index) => (
                      <label key={name} className="flex gap-1">
                        <input
                          type="checkbox"
                          checked={days.includes(index)}
                          onChange={(e) =>
                            setDays(
                              e.target.checked
                                ? [...days, index]
                                : days.filter((d) => d !== index),
                            )
                          }
                        />
                        {name}
                      </label>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    Apertura
                    <input
                      aria-label="Apertura"
                      type="time"
                      required
                      value={open}
                      onChange={(e) => setOpen(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </label>
                  <label>
                    Cierre
                    <input
                      aria-label="Cierre"
                      type="time"
                      required
                      value={close}
                      onChange={(e) => setClose(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label>
                    Latitud
                    <input
                      aria-label="Latitud de la sede"
                      type="number"
                      step="any"
                      required
                      value={lat}
                      onChange={(e) => setLat(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </label>
                  <label>
                    Longitud
                    <input
                      aria-label="Longitud de la sede"
                      type="number"
                      step="any"
                      required
                      value={lng}
                      onChange={(e) => setLng(Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg"
                    />
                  </label>
                </div>
                <p className="text-slate-500">
                  Las franjas se configuran dentro de estos horarios. La
                  cobertura depende de las zonas autorizadas del módulo
                  geográfico.
                </p>
              </fieldset>
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
                  {editingFacility ? 'Guardar Cambios' : 'Registrar Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
