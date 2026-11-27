import { Modal } from '../../shared/ui/Modal';
import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import {
  getRewards,
  createReward as createRewardApi,
  updateReward as updateRewardApi,
  mapRewardResponseToReward,
  type RewardFulfillmentType,
} from '../../services/api/catalogApi';
import { getActivePolicy, type Policy } from '../../services/api/policyApi';
import {
  listRedemptions,
  mapServerRedemption,
  reviewRedemption,
} from '../../services/api/pointsApi';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { MetricCard } from '../../components/common/MetricCard';
import { AnimatedPillTabs } from '../../components/ui/AnimatedPillTabs';
import { StaggerContainer, StaggerItem } from '../../components/ui/StaggerList';
import { btnPrimary } from '../../shared/ui/controls';
import { DiscountType, Reward, RewardRedemption } from '../../types';
import {
  Gift,
  Coins,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const RewardsPage: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(true);
  const [rewardsError, setRewardsError] = useState('');

  const [activeTab, setActiveTab] = useState<
    'REWARDS' | 'RULES' | 'REDEMPTIONS'
  >('REWARDS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Form State for reward
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [pointsCost, setPointsCost] = useState(0);
  const [fulfillmentType, setFulfillmentType] =
    useState<RewardFulfillmentType>('NONE');
  const [walletCreditAmount, setWalletCreditAmount] = useState(5);
  const [couponDiscountType, setCouponDiscountType] =
    useState<DiscountType>('FIXED');
  const [couponDiscountValue, setCouponDiscountValue] = useState(5);
  const [couponMinOrderAmount, setCouponMinOrderAmount] = useState(0);
  const [couponValidityDays, setCouponValidityDays] = useState(30);
  const [status, setStatus] = useState<Reward['status']>('ACTIVE');

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [serverRedemptions, setServerRedemptions] = useState<RewardRedemption[]>([]);
  const [redemptionState, setRedemptionState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [redemptionError, setRedemptionError] = useState('');
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  const [policy, setPolicy] = useState<Policy | null>(null);
  const [policyLoaded, setPolicyLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRewardsLoading(true);
    setRewardsError('');
    getRewards()
      .then((apiRewards) => {
        if (cancelled) return;
        setRewards(apiRewards.map(mapRewardResponseToReward));
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setRewardsError(
          cause instanceof Error
            ? cause.message
            : 'No se pudieron cargar las recompensas.',
        );
      })
      .finally(() => {
        if (!cancelled) setRewardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadRedemptions = useCallback(async () => {
    setRedemptionState('loading');
    setRedemptionError('');
    try {
      const rows = await listRedemptions();
      setServerRedemptions(rows.map(mapServerRedemption));
      setRedemptionState('ready');
    } catch (err) {
      setRedemptionError(
        err instanceof Error ? err.message : 'No se pudieron cargar los canjes.',
      );
      setRedemptionState('error');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'REDEMPTIONS' && redemptionState === 'idle') {
      void loadRedemptions();
    }
    if (activeTab === 'RULES' && !policyLoaded) {
      getActivePolicy()
        .then((p) => setPolicy(p))
        .catch(() => setPolicy(null))
        .finally(() => setPolicyLoaded(true));
    }
  }, [activeTab, redemptionState, loadRedemptions, policyLoaded]);

  const redemptionPages = usePagination(serverRedemptions);

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
          El módulo de Recompensas y Canjes está reservado para el rol
          Administrador.
        </p>
      </div>
    );
  }

  // KPIs
  const totalRewards = rewards.length;
  const pendingRedemptions = serverRedemptions.filter(
    (r) => r.status === 'PENDING',
  ).length;
  const approvedRedemptions = serverRedemptions.filter(
    (r) => r.status === 'APPROVED',
  ).length;
  const totalPointsSpent = serverRedemptions.reduce(
    (acc, r) => acc + r.pointsSpent,
    0,
  );

  const handleReview = async (id: string, approve: boolean) => {
    const reason = reviewNotes[id]?.trim();
    if (!approve && !reason) {
      showToast({
        type: 'error',
        title: 'Motivo obligatorio',
        message: 'Indica el motivo del rechazo.',
      });
      return;
    }
    setReviewBusyId(id);
    try {
      const updated = await reviewRedemption(id, approve, reason);
      setServerRedemptions((prev) =>
        prev.map((r) => (r.id === id ? mapServerRedemption(updated) : r)),
      );
      showToast({
        type: approve ? 'success' : 'info',
        title: approve ? 'Canje aprobado' : 'Canje rechazado',
        message: approve
          ? updated.generatedPromoCode
            ? `Aprobado · Cupón generado: ${updated.generatedPromoCode}`
            : updated.walletCreditAmount
              ? `Aprobado · Crédito abonado: $${Number(updated.walletCreditAmount).toFixed(2)}`
              : 'La solicitud quedó aprobada en el servidor.'
          : 'Se rechazó el canje y el servidor devolvió los puntos.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'No se pudo revisar el canje',
        message: err instanceof Error ? err.message : 'Error del servidor.',
      });
    } finally {
      setReviewBusyId(null);
    }
  };

  const handleOpenEditReward = (rew: Reward) => {
    setEditingReward(rew);
    setName(rew.name);
    setDescription(rew.description);
    setCategory(rew.category ?? 'GENERAL');
    setPointsCost(rew.pointsCost);
    setFulfillmentType(rew.fulfillmentType ?? 'NONE');
    setWalletCreditAmount(rew.walletCreditAmount ?? 5);
    setCouponDiscountType(rew.couponDiscountType ?? 'FIXED');
    setCouponDiscountValue(rew.couponDiscountValue ?? 5);
    setCouponMinOrderAmount(rew.couponMinOrderAmount ?? 0);
    setCouponValidityDays(rew.couponValidityDays ?? 30);
    setStatus(rew.status);
    setIsDrawerOpen(true);
  };

  const handleCreateRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const payload = {
      title: name.trim(),
      description: description.trim() || undefined,
      category: category.trim() || 'GENERAL',
      pointsCost,
      fulfillmentType,
      walletCreditAmount:
        fulfillmentType === 'WALLET_CREDIT' ? walletCreditAmount : null,
      couponDiscountType:
        fulfillmentType === 'PROMO_COUPON' ? couponDiscountType : null,
      couponDiscountValue:
        fulfillmentType === 'PROMO_COUPON' ? couponDiscountValue : null,
      couponMinOrderAmount:
        fulfillmentType === 'PROMO_COUPON' ? couponMinOrderAmount : null,
      couponValidityDays:
        fulfillmentType === 'PROMO_COUPON' ? couponValidityDays : null,
    };

    try {
      if (editingReward) {
        const res = await updateRewardApi(editingReward.id, {
          ...payload,
          active: status === 'ACTIVE',
        });
        const synced = mapRewardResponseToReward(res);
        setRewards((prev) =>
          prev.map((r) => (r.id === editingReward.id ? synced : r)),
        );
        showToast({
          type: 'info',
          title: 'Recompensa actualizada',
          message: synced.name,
        });
      } else {
        const res = await createRewardApi(payload);
        const synced = mapRewardResponseToReward(res);
        setRewards((prev) => [...prev, synced]);
        showToast({
          type: 'success',
          title: 'Recompensa creada en el catálogo de fidelización',
          message: synced.name,
        });
      }
      setIsDrawerOpen(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error al guardar recompensa',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo sincronizar con el servidor.',
      });
    }
  };

  const fulfillmentLabel = (rew: Reward) => {
    if (rew.fulfillmentType === 'WALLET_CREDIT' && rew.walletCreditAmount) {
      return `Abona $${rew.walletCreditAmount.toFixed(2)} a billetera`;
    }
    if (rew.fulfillmentType === 'PROMO_COUPON' && rew.couponDiscountValue) {
      const val =
        rew.couponDiscountType === 'PERCENTAGE'
          ? `${rew.couponDiscountValue}%`
          : `$${rew.couponDiscountValue.toFixed(2)}`;
      return `Cupón personal ${val} (${rew.couponValidityDays ?? 30} días)`;
    }
    return 'Entrega operativa / física';
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sistema de Recompensas y Fidelización"
        subtitle="Catálogo de premios y revisión de canjes contra el servidor."
        actions={
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setEditingReward(null);
              setName('');
              setDescription('');
              setCategory('GENERAL');
              setPointsCost(100);
              setFulfillmentType('NONE');
              setWalletCreditAmount(5);
              setCouponDiscountType('FIXED');
              setCouponDiscountValue(5);
              setCouponMinOrderAmount(0);
              setCouponValidityDays(30);
              setStatus('ACTIVE');
              setIsDrawerOpen(true);
            }}
            className={btnPrimary}
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Recompensa</span>
          </motion.button>
        }
      />

      {rewardsError && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
        >
          {rewardsError}
        </p>
      )}

      {/* KPIs */}
      <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StaggerItem>
          <MetricCard
            title="Recompensas"
            value={totalRewards}
            subtitle="Catálogo de canje"
            icon={<Gift className="w-5 h-5 text-sky-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Canjes Pendientes"
            value={pendingRedemptions}
            subtitle="Por autorizar"
            variant={pendingRedemptions > 0 ? 'warning' : 'default'}
            icon={<Clock className="w-5 h-5 text-amber-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Canjes Aprobados"
            value={approvedRedemptions}
            subtitle="Autorizados en servidor"
            variant="success"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Puntos Redimidos"
            value={totalPointsSpent}
            subtitle="Total canjeado histórico"
            variant="aqua"
            icon={<Coins className="w-4 h-4" />}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Tabs */}
      <div className="overflow-x-auto pb-1">
        <AnimatedPillTabs<'REWARDS' | 'RULES' | 'REDEMPTIONS'>
          layoutId="rewards-tabs"
          ariaLabel="Secciones de recompensas"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            {
              id: 'REWARDS',
              label: 'Catálogo de Recompensas',
              count: rewards.length,
            },
            { id: 'RULES', label: 'Reglas de Acumulación' },
            {
              id: 'REDEMPTIONS',
              label: 'Solicitudes de Canje',
              count: serverRedemptions.length,
              alert: pendingRedemptions > 0,
            },
          ]}
        />
      </div>

      {/* Tab 1: Recompensas */}
      {activeTab === 'REWARDS' && (
        rewardsLoading ? (
          <p className="py-10 text-center text-xs text-slate-500">
            Cargando recompensas desde el servidor...
          </p>
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rewards.map((rew) => (
              <StaggerItem key={rew.id}>
                <div className="fintech-card fintech-card-interactive h-full p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200/80 tabular-nums">
                        {rew.pointsCost} puntos
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                            rew.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {rew.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenEditReward(rew)}
                          className="p-1 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                          title={`Editar recompensa ${rew.name}`}
                          aria-label={`Editar recompensa ${rew.name}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-base text-slate-900">
                      {rew.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {rew.description || 'Sin descripción'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Categoría:</span>
                      <strong className="text-slate-800">
                        {rew.category || 'GENERAL'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Entrega al aprobar:</span>
                      <strong className="text-slate-800 text-right">
                        {fulfillmentLabel(rew)}
                      </strong>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )
      )}

      {/* Tab 2: Reglas de acumulación */}
      {activeTab === 'RULES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <h3 className="text-sm font-bold text-slate-900">
            Reglas de Acumulación y Equivalencias de Puntos Clean & Fresh
          </h3>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Los puntos se acreditan automáticamente en el Ledger tras completar
            conforme cada orden usando la versión de política vigente al crear el
            pedido.
          </p>

          {!policyLoaded ? (
            <p className="text-xs text-slate-500">Consultando política activa...</p>
          ) : policy?.pointsPerCurrencyUnit ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-xs text-emerald-950 space-y-1">
              <p className="font-bold text-sm">
                Tasa activa: {policy.pointsPerCurrencyUnit} puntos por cada $1
              </p>
              <p className="text-emerald-800">
                Política versión v{policy.version} · Zona horaria {policy.timezone}
              </p>
            </div>
          ) : (
            <p className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 text-xs text-slate-600">
              La tasa de puntos por unidad monetaria aún no está configurada en la
              política activa (con valor nulo no se acumulan puntos).
            </p>
          )}

          <div>
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0A3660]"
            >
              Configurar tasa en Política de Negocio
            </Link>
          </div>
        </div>
      )}

      {/* Tab 3: Solicitudes de Canje (servidor) */}
      {activeTab === 'REDEMPTIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Canjes del servidor</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Aprobar o rechazar llama a `/redemptions/:id/review` y emite
                automáticamente el crédito o cupón configurado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadRedemptions()}
              disabled={redemptionState === 'loading'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                size={14}
                className={redemptionState === 'loading' ? 'animate-spin' : ''}
              />
              Actualizar
            </button>
          </div>

          {redemptionState === 'loading' && (
            <p role="status" className="py-10 text-center text-sm text-slate-500">
              Cargando canjes…
            </p>
          )}

          {redemptionState === 'error' && (
            <div role="alert" className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-semibold">No se pudieron cargar los canjes.</p>
              <p className="mt-1">{redemptionError}</p>
              <button
                type="button"
                className="mt-3 rounded-xl bg-[#0F4C81] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                onClick={() => void loadRedemptions()}
              >
                Reintentar
              </button>
            </div>
          )}

          {redemptionState === 'ready' && serverRedemptions.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              No hay solicitudes de canje en el servidor.
            </p>
          )}

          {redemptionState === 'ready' && serverRedemptions.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3.5 px-4">Cliente</th>
                      <th className="py-3.5 px-4">Recompensa</th>
                      <th className="py-3.5 px-4 text-center">Puntos</th>
                      <th className="py-3.5 px-4">Fecha</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {redemptionPages.rows.map((red) => (
                      <tr key={red.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {red.customerName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 font-medium">
                          <p>{red.rewardName}</p>
                          {red.generatedPromoCode && (
                            <p className="mt-0.5 font-mono text-[11px] text-sky-700">
                              Cupón: {red.generatedPromoCode}
                            </p>
                          )}
                          {red.walletCreditAmount != null && red.walletCreditAmount > 0 && (
                            <p className="mt-0.5 font-mono text-[11px] text-emerald-700">
                              Crédito: ${red.walletCreditAmount.toFixed(2)}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-700 tabular-nums">
                          {red.pointsSpent} pts
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {red.date}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                              red.status === 'APPROVED'
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : red.status === 'PENDING'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            {red.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {red.notes && (
                            <p className="mb-2 whitespace-normal text-xs text-slate-500">
                              {red.notes}
                            </p>
                          )}
                          {red.status === 'PENDING' && (
                            <>
                              <input
                                aria-label={'Motivo del canje ' + red.id}
                                placeholder="Motivo (obligatorio al rechazar)"
                                value={reviewNotes[red.id] ?? ''}
                                onChange={(e) =>
                                  setReviewNotes({
                                    ...reviewNotes,
                                    [red.id]: e.target.value,
                                  })
                                }
                                className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  disabled={reviewBusyId === red.id}
                                  onClick={() => void handleReview(red.id, true)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                                >
                                  Aprobar
                                </button>
                                <button
                                  type="button"
                                  disabled={reviewBusyId === red.id}
                                  onClick={() => void handleReview(red.id, false)}
                                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer disabled:opacity-50"
                                >
                                  Rechazar
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4">
                <TablePagination pagination={redemptionPages} label="canjes" />
              </div>
            </>
          )}
        </div>
      )}

      {/* Drawer Crear / Editar Recompensa */}
      {isDrawerOpen && (
        <Modal
          title={
            editingReward
              ? `Editar recompensa: ${editingReward.name}`
              : 'Nueva recompensa'
          }
          description="Agrega o actualiza un premio en el catálogo de fidelización."
          onClose={() => setIsDrawerOpen(false)}
        >
          <form
            onSubmit={handleCreateRewardSubmit}
            className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre del premio *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Lavado de Edredón Gratis"
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Descripción y alcances
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Condiciones de aplicación para el cliente..."
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Costo en Puntos *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  aria-label="Costo en puntos"
                  value={pointsCost}
                  onChange={(e) => setPointsCost(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Categoría
                </label>
                <input
                  type="text"
                  maxLength={60}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: Descuentos, Billetera, Productos"
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Beneficio automático al aprobar
              </label>
              <select
                value={fulfillmentType}
                onChange={(e) =>
                  setFulfillmentType(e.target.value as RewardFulfillmentType)
                }
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
              >
                <option value="NONE">Entrega operativa / física manual</option>
                <option value="WALLET_CREDIT">Crédito automático en billetera</option>
                <option value="PROMO_COUPON">Generar cupón personal</option>
              </select>
            </div>

            {fulfillmentType === 'WALLET_CREDIT' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monto a acreditar en billetera ($) *
                </label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={walletCreditAmount}
                  onChange={(e) =>
                    setWalletCreditAmount(parseFloat(e.target.value) || 0)
                  }
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            )}

            {fulfillmentType === 'PROMO_COUPON' && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de cupón
                  </label>
                  <select
                    value={couponDiscountType}
                    onChange={(e) =>
                      setCouponDiscountType(e.target.value as DiscountType)
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
                  >
                    <option value="FIXED">Monto Fijo ($)</option>
                    <option value="PERCENTAGE">Porcentaje (%)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor {couponDiscountType === 'PERCENTAGE' ? '(%)' : '($)'} *
                  </label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    value={couponDiscountValue}
                    onChange={(e) =>
                      setCouponDiscountValue(parseFloat(e.target.value) || 0)
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Monto mínimo orden ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={couponMinOrderAmount}
                    onChange={(e) =>
                      setCouponMinOrderAmount(parseFloat(e.target.value) || 0)
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Vigencia del cupón (días)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={couponValidityDays}
                    onChange={(e) =>
                      setCouponValidityDays(parseInt(e.target.value) || 30)
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {editingReward && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Estado
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Reward['status'])}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                >
                  <option value="ACTIVE">Activa</option>
                  <option value="INACTIVE">Inactiva</option>
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
                {editingReward ? 'Guardar Cambios' : 'Crear Recompensa'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
