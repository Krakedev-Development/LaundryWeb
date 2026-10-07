import React, { useState } from 'react';
import { BusinessSettingsPanel } from './BusinessSettingsPanel';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { SystemSettings } from '../../types';
import {
  Settings,
  Shield,
  Truck,
  Clock,
  Globe,
  Save,
  RotateCcw,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetAll, currentUser, facilities } = useApp();
  const [formData, setFormData] = useState<SystemSettings>({ ...settings });

  // Role Guard per spec #4 & #44
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-red-200 shadow-2xs max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acceso No Autorizado</h2>
        <p className="text-xs text-slate-500 mt-1">El panel de Configuración Global está restringido exclusivamente para el Administrador.</p>
      </div>
    );
  }


  const handleChange = (field: keyof SystemSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuración Global del Sistema"
        subtitle="Parámetros operativos de despacho, umbrales de SLA, logística y reglas de localización."
        actions={
          <button
            onClick={resetAll}
            className="px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Datos Demo</span>
          </button>
        }
      />

      <form onSubmit={handleSave} className="space-y-8">
        <BusinessSettingsPanel/>
        {/* Section 1: Logística y Despacho per spec #44 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Truck className="w-4 h-4 text-sky-800" />
            <h3 className="text-sm font-bold text-slate-900">
              Reglas de Logística y Despacho de Choferes
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Límite Máximo de Órdenes Simultáneas por Chofer
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={formData.maxOrdersPerDriver}
                onChange={(e) => handleChange('maxOrdersPerDriver', parseInt(e.target.value) || 5)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Los conductores que alcancen esta capacidad no serán sugeridos en el motor de despacho.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Sede Predeterminada de Asignación
              </label>
              <select
                value={formData.defaultFacilityId}
                onChange={(e) => handleChange('defaultFacilityId', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={fac.id}>{fac.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Sede utilizada por defecto cuando no se detecte cobertura zonal directa.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: SLA y Tiempos de Entrega per spec #44 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-4 h-4 text-sky-800" />
            <h3 className="text-sm font-bold text-slate-900">
              Umbrales de Acuerdo de Nivel de Servicio (SLA)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Tiempo SLA de Recogida (Minutos)
              </label>
              <input
                type="number"
                value={formData.slaPickupMinutes}
                onChange={(e) => handleChange('slaPickupMinutes', parseInt(e.target.value) || 45)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tiempo máximo objetivo para asignar chofer y recoger prendas tras la solicitud.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Tiempo SLA de Entrega Estándar (Horas)
              </label>
              <input
                type="number"
                value={formData.slaDeliveryHours}
                onChange={(e) => handleChange('slaDeliveryHours', parseInt(e.target.value) || 24)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Ventana prometida de procesamiento en planta y entrega al cliente.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Localización y Moneda per spec #45 */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Globe className="w-4 h-4 text-sky-800" />
            <h3 className="text-sm font-bold text-slate-900">
              Localización, Moneda y Zona Horaria (Regla #45)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Código de Moneda (Currency)
              </label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value.toUpperCase())}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Símbolo de Moneda
              </label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => handleChange('currencySymbol', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Ciudad Predeterminada
              </label>
              <input
                type="text"
                value={formData.defaultCity}
                onChange={(e) => handleChange('defaultCity', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Zona Horaria (Timezone)
              </label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Código Telefónico País
              </label>
              <input
                type="text"
                value={formData.phoneCountryCode}
                onChange={(e) => handleChange('phoneCountryCode', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Configuración Regional (Locale)
              </label>
              <input
                type="text"
                value={formData.locale}
                onChange={(e) => handleChange('locale', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración Global</span>
          </button>
        </div>
      </form>
    </div>
  );
};
