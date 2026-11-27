import { Modal } from '../../shared/ui/Modal';
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  getPromotions,
  createPromotion as createPromotionApi,
  updatePromotion as updatePromotionApi,
  mapPromotionResponseToPromotion,
} from '../../services/api/catalogApi';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { MetricCard } from '../../components/common/MetricCard';
import { StaggerContainer, StaggerItem } from '../../components/ui/StaggerList';
import { btnPrimary } from '../../shared/ui/controls';
import { DiscountType, Promotion } from '../../types';
import {
  Tag,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Lock,
} from 'lucide-react';

export const PromotionsPage: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(25);
  const [usageLimit, setUsageLimit] = useState<number>(0);
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState<number>(0);
  const [firstOrderOnly, setFirstOrderOnly] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<Promotion['status']>('ACTIVE');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    getPromotions()
      .then((apiPromos) => {
        if (cancelled) return;
        setPromotions(apiPromos.map(mapPromotionResponseToPromotion));
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setLoadError(
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar las promociones del servidor.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // KPIs
  const totalCount = promotions.length;
  const pagination = usePagination(promotions);
  const activeCount = promotions.filter((p) => p.status === 'ACTIVE').length;
  const scheduledCount = promotions.filter(
    (p) => p.status === 'SCHEDULED',
  ).length;
  const expiredCount = promotions.filter((p) => p.status === 'EXPIRED').length;

  const handleOpenCreate = () => {
    setEditingPromo(null);
    setName('');
    setCode('');
    setDescription('');
    setDiscountType('PERCENTAGE');
    setDiscountValue(15);
    setMinOrderAmount(20);
    setUsageLimit(0);
    setMaxUsesPerCustomer(0);
    setFirstOrderOnly(false);
    setStartDate(new Date().toISOString().split('T')[0]);
    setEndDate('2026-12-31');
    setStatus('ACTIVE');
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (promo: Promotion) => {
    setEditingPromo(promo);
    setName(promo.name);
    setCode(promo.code);
    setDescription(promo.description);
    setDiscountType(promo.discountType);
    setDiscountValue(promo.discountValue);
    setMinOrderAmount(promo.minOrderAmount);
    setUsageLimit(promo.usageLimit);
    setMaxUsesPerCustomer(promo.maxUsesPerCustomer ?? 0);
    setFirstOrderOnly(Boolean(promo.firstOrderOnly));
    setStartDate(promo.startDate);
    setEndDate(promo.endDate);
    setStatus(promo.status);
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      setFormError(
        'La fecha de vencimiento no puede ser anterior a la fecha de inicio.',
      );
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

    const normalizedCode = code.toUpperCase().trim();
    const normalizedDescription = description.trim() || name.trim();

    try {
      if (editingPromo) {
        const res = await updatePromotionApi(editingPromo.id, {
          name: name.trim() || null,
          description: normalizedDescription,
          discountValue,
          minOrderAmount,
          validFrom: startDate || undefined,
          validUntil: endDate || undefined,
          maxUses: usageLimit > 0 ? usageLimit : undefined,
          maxUsesPerCustomer: maxUsesPerCustomer > 0 ? maxUsesPerCustomer : null,
          firstOrderOnly,
          active: status !== 'PAUSED' && status !== 'EXPIRED',
        });
        const synced = mapPromotionResponseToPromotion(res);
        setPromotions((prev) =>
          prev.map((p) => (p.id === editingPromo.id ? synced : p)),
        );
        showToast({
          type: 'info',
          title: 'Promoción actualizada',
          message: `Código: ${synced.code}`,
        });
      } else {
        const res = await createPromotionApi({
          code: normalizedCode,
          name: name.trim() || null,
          description: normalizedDescription,
          discountType,
          discountValue,
          minOrderAmount,
          validFrom: startDate || undefined,
          validUntil: endDate || undefined,
          maxUses: usageLimit > 0 ? usageLimit : undefined,
          maxUsesPerCustomer: maxUsesPerCustomer > 0 ? maxUsesPerCustomer : null,
          firstOrderOnly,
        });
        const synced = mapPromotionResponseToPromotion(res);
        setPromotions((prev) => [synced, ...prev]);
        showToast({
          type: 'success',
          title: 'Promoción creada exitosamente',
          message: `Código: ${synced.code} (${synced.discountValue}${synced.discountType === 'PERCENTAGE' ? '%' : '$'})`,
        });
      }
      setIsDrawerOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la promoción en el servidor.',
      );
    }
  };

  // Role Guard
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-red-200 shadow-2xs max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Acceso No Autorizado
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          El módulo de Promociones está reservado para el rol Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Promociones y Cupones"
        subtitle="Gestión de códigos de descuento, campañas y reglas de uso contra el servidor."
        actions={
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenCreate}
            className={btnPrimary}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Promoción</span>
          </motion.button>
        }
      />

      {loadError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          {loadError}
        </p>
      )}

      {/* KPIs */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StaggerItem>
          <MetricCard
            title="Total Promociones"
            value={totalCount}
            subtitle="Campañas en sistema"
            icon={<Tag className="w-5 h-5 text-sky-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Activas"
            value={activeCount}
            subtitle="Vigentes para aplicar"
            variant="success"
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Programadas"
            value={scheduledCount}
            subtitle="Inicio futuro"
            variant="aqua"
            icon={<Calendar className="w-4 h-4" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Vencidas"
            value={expiredCount}
            subtitle="Límite o fecha cumplida"
            icon={<AlertCircle className="w-4 h-4 text-slate-400" />}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Table */}
      <div className="fintech-card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">
            Cargando promociones desde el servidor...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                  <tr>
                    <th className="py-3.5 px-4">Campaña / Promoción</th>
                    <th className="py-3.5 px-4">Código Cupón</th>
                    <th className="py-3.5 px-4">Descuento</th>
                    <th className="py-3.5 px-4">Reglas</th>
                    <th className="py-3.5 px-4">Vigencia</th>
                    <th className="py-3.5 px-4 text-center">Usos / Límite</th>
                    <th className="py-3.5 px-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagination.rows.map((promo) => (
                    <tr
                      key={promo.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {promo.name}
                        </span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {promo.description}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-mono font-bold text-xs bg-sky-50 text-sky-800 px-2.5 py-1 rounded-lg border border-sky-200 border-dashed shadow-2xs">
                          <Tag className="w-3 h-3 text-sky-600" />
                          {promo.code}
                        </span>
                        {promo.isPersonal && (
                          <span className="ml-2 inline-block text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                            Cupón de canje
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap tabular-nums">
                        {promo.discountType === 'PERCENTAGE'
                          ? `${promo.discountValue}%`
                          : `$${promo.discountValue.toFixed(2)}`}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Mín. ${promo.minOrderAmount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-[11px]">
                        <p>
                          {promo.firstOrderOnly ? 'Solo 1ra orden' : 'Todo cliente'}
                        </p>
                        <p className="text-slate-400">
                          {promo.maxUsesPerCustomer
                            ? `Máx. ${promo.maxUsesPerCustomer}/cliente`
                            : 'Sin límite por cliente'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {promo.startDate || 'Sin inicio'} al{' '}
                        {promo.endDate || 'Sin fin'}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono whitespace-nowrap tabular-nums">
                        <span className="font-bold text-slate-800">
                          {promo.usageCount}
                        </span>
                        <span className="text-slate-400">
                          {' '}
                          / {promo.usageLimit > 0 ? promo.usageLimit : '∞'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-2">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                              promo.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : promo.status === 'SCHEDULED'
                                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {promo.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1.5 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title={`Editar promoción ${promo.code}`}
                            aria-label={`Editar promoción ${promo.code}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <TablePagination pagination={pagination} label="promociones" />
          </>
        )}
      </div>

      {/* Drawer Crear / Editar Promoción per spec #37 */}
      {isDrawerOpen && (
        <Modal
          title={
            editingPromo
              ? `Editar promoción: ${editingPromo.code}`
              : 'Nueva promoción comercial'
          }
          description="Define el descuento, la vigencia y las condiciones del cupón."
          onClose={() => setIsDrawerOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
          >
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre de la campaña *
              </label>
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
              <label className="block font-semibold text-slate-700 mb-1">
                Código del cupón (Mayúsculas) *
              </label>
              <input
                type="text"
                required
                readOnly={!!editingPromo}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ej: BIENVENIDA2026"
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Descripción
              </label>
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo de descuento
                </label>
                <select
                  value={discountType}
                  disabled={!!editingPromo}
                  onChange={(e) =>
                    setDiscountType(e.target.value as DiscountType)
                  }
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
                  onChange={(e) =>
                    setDiscountValue(parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto Mínimo ($)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={minOrderAmount}
                  onChange={(e) =>
                    setMinOrderAmount(parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Límite Global (0 = ∞)
                </label>
                <input
                  type="number"
                  min={0}
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Límite / Cliente (0 = ∞)
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxUsesPerCustomer}
                  onChange={(e) =>
                    setMaxUsesPerCustomer(parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={firstOrderOnly}
                onChange={(e) => setFirstOrderOnly(e.target.checked)}
              />
              Solo para primera orden del cliente
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Fecha de Fin
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            {editingPromo && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Promotion['status'])}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ACTIVE">Activa</option>
                  <option value="PAUSED">Pausada</option>
                </select>
              </div>
            )}

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
                {editingPromo ? 'Guardar Cambios' : 'Guardar Promoción'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
