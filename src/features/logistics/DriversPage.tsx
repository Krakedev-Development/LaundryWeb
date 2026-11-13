import { Modal } from '../../shared/ui/Modal';
import { useZones } from './zones/useZones';
import { IconPlaceholder } from '../../components/common/IconPlaceholder';
import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
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
  Gauge,
  RotateCcw,
  LoaderCircle,
} from 'lucide-react';
import {
  listDrivers,
  createDriver as createDriverApi,
  updateDriver as updateDriverApi,
  mapBackendDriverToDriver,
} from '../../services/api/driversApi';
import { ApiError } from '../../services/api/apiConfig';
import { storageService } from '../../services/storage';

export const DriversPage: React.FC = () => {
  const {
    drivers,
    facilities,
    createDriver,
    updateDriver,
    currentUser,
    showToast,
  } = useApp();
  const isAdmin = currentUser.role === 'ADMIN';
  const pagination = usePagination(drivers);
  const { zones } = useZones();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('Password123!');
  const [vehicleType, setVehicleType] = useState<'VAN' | 'MOTO' | 'CAMIONETA'>(
    'VAN',
  );
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [facilityId, setFacilityId] = useState(facilities[0]?.id || '');
  const [zoneId, setZoneId] = useState('ZONA-NORTE');
  const [maxOrders, setMaxOrders] = useState(0);
  const [status, setStatus] = useState<DriverStatus>('AVAILABLE');

  const refreshDrivers = async () => {
    try {
      setRefreshing(true);
      const backendList = await listDrivers();
      const mapped = backendList.map((raw) =>
        mapBackendDriverToDriver(
          raw,
          drivers.find((d) => d.id === raw.id || d.email === raw.email),
          facilities,
        ),
      );
      if (mapped.length > 0) {
        storageService.saveDrivers(mapped);
      }
    } catch {
      // Offline fallback: maintain stored drivers
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refreshDrivers();
  }, []);

  // KPIs
  const availableCount = drivers.filter((d) => d.status === 'AVAILABLE').length;
  const onDutyCount = drivers.filter((d) => d.status === 'ON_SERVICE').length;
  const offlineCount = drivers.filter((d) => d.status === 'OFFLINE').length;
  const avgLoad = (
    drivers.reduce((acc, d) => acc + d.activeOrders, 0) / (drivers.length || 1)
  ).toFixed(1);

  const handleOpenCreate = () => {
    setEditingDriver(null);
    setName('');
    setPhone('+593 99 000 0000');
    setEmail('chofer@laundryweb.com');
    setTemporaryPassword('Password123!');
    setVehicleType('VAN');
    setVehiclePlate('ABC-1234');
    setFacilityId(facilities[0]?.id || '');
    setZoneId('ZONA-NORTE');
    setMaxOrders(0);
    setStatus('AVAILABLE');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setPhone(driver.phone);
    setEmail(driver.email);
    setTemporaryPassword('');
    setVehicleType(driver.vehicleType);
    setVehiclePlate(driver.vehiclePlate);
    setFacilityId(driver.facilityId);
    setZoneId(driver.zoneId);
    setMaxOrders(driver.maxOrders);
    setStatus(driver.status);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const facility = facilities.find((f) => f.id === facilityId);
    const facilityName = facility?.name || 'Sede Operativa Guayaquil';
    const zoneName =
      zones.find((zone) => zone.id === zoneId)?.name ??
      editingDriver?.zoneName ??
      '';

    setSubmitting(true);
    try {
      if (editingDriver) {
        try {
          await updateDriverApi(editingDriver.id, {
            facilityId,
            vehicle: vehicleType,
            plate: vehiclePlate.toUpperCase(),
            status,
          });
        } catch (apiErr) {
          if (!(apiErr instanceof ApiError && apiErr.status === 0)) {
            throw apiErr;
          }
        }

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
          authorizedZoneIds: [
            ...new Set([
              ...(editingDriver.authorizedZoneIds ?? [editingDriver.zoneId]),
              zoneId,
            ]),
          ],
          maxOrders,
          status,
        });

        showToast({
          type: 'success',
          title: 'Chofer actualizado',
          message: `Los datos de ${name} fueron actualizados exitosamente.`,
        });
        void refreshDrivers();
      } else {
        try {
          await createDriverApi({
            name,
            email,
            phone,
            temporaryPassword,
            facilityId,
            vehicle: vehicleType,
            plate: vehiclePlate.toUpperCase(),
          });

          showToast({
            type: 'success',
            title: 'Chofer registrado',
            message: `El conductor ${name} fue registrado en el sistema exitosamente.`,
          });
          await refreshDrivers();
        } catch (apiErr) {
          if (apiErr instanceof ApiError && apiErr.status === 0) {
            createDriver({
              name,
              phone,
              email,
              avatar: '',
              vehicleType,
              vehiclePlate: vehiclePlate.toUpperCase(),
              facilityId,
              facilityName,
              zoneId,
              zoneName,
              status,
              maxOrders,
              location: {
                lat: facility?.coordinates.lat ?? -2.1894,
                lng: facility?.coordinates.lng ?? -79.8891,
                address: facility?.address ?? facilityName,
                lastUpdated: new Date().toISOString(),
                simulated: true,
              },
            });
            showToast({
              type: 'info',
              title: 'Registro sin conexión',
              message: 'El conductor fue guardado localmente (modo offline).',
            });
          } else {
            throw apiErr;
          }
        }
      }

      setIsDrawerOpen(false);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'No se pudo guardar el chofer',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => void refreshDrivers()}
              disabled={refreshing}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Sincronizar choferes con el backend"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Sincronizar</span>
            </button>
            {isAdmin && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Chofer</span>
              </button>
            )}
          </div>
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
              {pagination.rows.map((driver) => {
                const loadPercent = Math.round(
                  (driver.activeOrders / driver.maxOrders) * 100,
                );
                return (
                  <tr
                    key={driver.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <IconPlaceholder
                          kind="user"
                          label={driver.name}
                          className="size-9 rounded-full"
                        />
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {driver.name}
                          </span>
                          <span className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-500" />{' '}
                            {driver.rating} ({driver.completedTripsToday} viajes
                            hoy)
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {driver.vehicleType}
                      </span>
                      <span className="block font-mono text-[11px] font-bold text-sky-800">
                        {driver.vehiclePlate}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      <div>{driver.phone}</div>
                      <div className="text-[11px] text-slate-400">
                        {driver.email}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-800">
                      {driver.facilityName}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {zones.find((zone) => zone.id === driver.zoneId)?.name ??
                        driver.zoneName}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-mono font-bold text-slate-800 tabular-nums">
                          {driver.activeOrders} / {driver.maxOrders}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              loadPercent >= 100
                                ? 'bg-red-500'
                                : loadPercent >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
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
                            : driver.status === 'ON_SERVICE'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : driver.status === 'BREAK'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {driver.status === 'AVAILABLE'
                          ? 'Disponible'
                          : driver.status === 'ON_SERVICE'
                            ? 'En Servicio'
                            : driver.status === 'BREAK'
                              ? 'Pausa'
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
        <TablePagination pagination={pagination} label="choferes" />
      </div>

      {/* Drawer Crear / Editar Chofer (Solo Admin) */}
      {isAdmin && isDrawerOpen && (
        <Modal
          title={
            editingDriver
              ? `Editar: ${editingDriver.name}`
              : 'Registrar Nuevo Chofer'
          }
          description="Asignación vehicular, sede base y límites de carga"
          onClose={() => setIsDrawerOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre completo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre y apellido"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Teléfono móvil *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Correo corporativo
                </label>
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de Vehículo
                </label>
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Placa Vehicular *
                </label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  onChange={(e) =>
                    setVehiclePlate(e.target.value.toUpperCase())
                  }
                  placeholder="ABC-123"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Sede Base
                </label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                >
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Zona Cobertura
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                >
                  {zones
                    .filter((zone) => zone.active || zone.id === zoneId)
                    .map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Capacidad Máx. Pedidos
                </label>
                <input
                  type="number"
                  value={maxOrders}
                  onChange={(e) => setMaxOrders(parseInt(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado Operativo
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DriverStatus)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
                >
                  <option value="AVAILABLE">Disponible</option>
                  <option value="ON_SERVICE">En Servicio / En ruta</option>
                  <option value="BREAK">Pausa</option>
                  <option value="OFFLINE">Offline / Mantenimiento</option>
                </select>
              </div>
            </div>

            {!editingDriver && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Contraseña temporal de acceso *
                </label>
                <input
                  type="text"
                  required
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  placeholder="Ej. Password123!"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Mínimo 8 caracteres, al menos una letra y un número.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                disabled={submitting}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-60"
              >
                {submitting && (
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                )}
                <span>
                  {submitting
                    ? 'Guardando...'
                    : editingDriver
                      ? 'Guardar Cambios'
                      : 'Registrar Chofer'}
                </span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
