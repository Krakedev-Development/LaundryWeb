import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { DiscountType, Promotion } from '../../types';
import {
  Tag,
  Plus,
  Percent,
  Calendar,
  AlertCircle,
  X,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const PromotionsPage: React.FC = () => {
  const { promotions, createPromotion, catalog, currentUser } = useApp();

  // Role Guard
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-red-200 shadow-2xs max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acceso No Autorizado</h2>
        <p className="text-xs text-slate-500 mt-1">El módulo de Promociones está reservado para el rol Administrador.</p>
      </div>
    );
  }

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(25);
  const [usageLimit, setUsageLimit] = useState<number>(200);
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [selectedServices, setSelectedServices] = useState<string[]>(['Todos los servicios']);
  const [formError, setFormError] = useState('');

  // KPIs
  const totalCount = promotions.length;
  const activeCount = promotions.filter((p) => p.status === 'ACTIVE').length;
  const scheduledCount = promotions.filter((p) => p.status === 'SCHEDULED').length;
  const expiredCount = promotions.filter((p) => p.status === 'EXPIRED').length;

  const handleOpenCreate = () => {
    setName('');
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(15);
    setMinOrderAmount(20);
    setUsageLimit(300);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('2026-12-31');
    setSelectedServices(['Todos los servicios']);
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Business Rules per spec #37:
    // No permitir: fecha final < fecha inicio, porcentaje > 100%, valor <= 0, sin servicios
    if (new Date(endDate) < new Date(startDate)) {
      setFormError('La fecha de vencimiento no puede ser anterior a la fecha de inicio.');
      return;
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      setFormError('El porcentaje de descuento no puede ser superior al 100%.');
      return;
    }
    if (discountValue <= 0) {
      setFormError('El valor del descuento debe ser mayor que 0.');
      return;
    }
    if (selectedServices.length === 0) {
      setFormError('Debe seleccionar al menos un servicio o categoría aplicable.');
      return;
    }

    const success = createPromotion({
      name,
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      minOrderAmount,
      usageLimit,
      applicableServices: selectedServices,
      startDate,
      endDate,
      status: 'ACTIVE',
    });

    if (success) {
      setIsDrawerOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Promociones y Cupones"
        subtitle="Gestión de códigos de descuento, campañas estacionales y reglas de canje comercial."
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Promoción</span>
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Promociones"
          value={totalCount}
          subtitle="Campañas en sistema"
          icon={<Tag className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Activas"
          value={activeCount}
          subtitle="Vigentes para aplicar"
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Programadas"
          value={scheduledCount}
          subtitle="Inicio futuro"
          variant="aqua"
          icon={<Calendar className="w-4 h-4" />}
        />
        <MetricCard
          title="Vencidas"
          value={expiredCount}
          subtitle="Límite o fecha cumplida"
          icon={<AlertCircle className="w-4 h-4 text-slate-400" />}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Campaña / Promoción</th>
                <th className="py-3.5 px-4">Código Cupón</th>
                <th className="py-3.5 px-4">Descuento</th>
                <th className="py-3.5 px-4">Servicios Aplicables</th>
                <th className="py-3.5 px-4">Vigencia</th>
                <th className="py-3.5 px-4 text-center">Usos / Límite</th>
                <th className="py-3.5 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {promotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{promo.name}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{promo.description}</span>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="font-mono font-bold text-xs bg-sky-50 text-sky-800 px-2.5 py-1 rounded-md border border-sky-200">
                      {promo.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                    {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}%` : `$${promo.discountValue.toFixed(2)}`}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Mín. ${promo.minOrderAmount}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 truncate max-w-[180px]">
                    {promo.applicableServices.join(', ')}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                    {promo.startDate} al {promo.endDate}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap tabular-nums">
                    <span className="font-bold text-slate-800">{promo.usageCount}</span>
                    <span className="text-slate-400"> / {promo.usageLimit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                        promo.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : promo.status === 'SCHEDULED'
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {promo.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer Crear Promoción per spec #37 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-[#E5EAF0] bg-[#F7F9FC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Nueva Promoción Comercial</h3>
                <p className="text-xs text-slate-500">Crea cupones con reglas estrictas de negocio</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre de la campaña *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Descuento Bienvenida Clean"
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Código del cupón (Mayúsculas) *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej: BIENVENIDA2026"
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Condiciones del descuento para el cliente..."
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de descuento</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                    <option value="FIXED">Monto Fijo ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor {discountType === 'PERCENTAGE' ? '(%)' : '($)'} *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monto Mínimo de Orden ($)</label>
                  <input
                    type="number"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Límite Total de Usos</label>
                  <input
                    type="number"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Inicio *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fecha de Fin *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Guardar Promoción
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
