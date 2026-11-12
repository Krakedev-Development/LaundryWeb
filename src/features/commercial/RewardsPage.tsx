import { Modal } from '../../shared/ui/Modal';
import React, { useEffect, useState } from 'react';
import { storageService } from '../../services/storage';
import {
  getRewards,
  createReward as createRewardApi,
  updateReward as updateRewardApi,
  mapRewardResponseToReward,
} from '../../services/api/catalogApi';
import { ApiError } from '../../services/api/apiConfig';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { MetricCard } from '../../components/common/MetricCard';
import { Reward } from '../../types';
import {
  Gift,
  Coins,
  CheckCircle2,
  Clock,
  Plus,
  Edit2,
  Lock,
} from 'lucide-react';

export const RewardsPage: React.FC = () => {
  const {
    rewards,
    redemptions,
    pointsLedger,
    createReward,
    updateRedemptionStatus,
    currentUser,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'REWARDS' | 'RULES' | 'REDEMPTIONS' | 'LEDGER'
  >('REWARDS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);

  // Form State for reward
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pointsCost, setPointsCost] = useState(0);
  const [minPurchases, setMinPurchases] = useState(0);
  const [minSpend, setMinSpend] = useState(0);
  const [validityDays, setValidityDays] = useState(0);
  const [status, setStatus] = useState<Reward['status']>('ACTIVE');

  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getRewards()
      .then((apiRewards) => {
        if (cancelled) return;
        const current = storageService.getRewards();
        const byId = new Map(current.map((r) => [r.id, r]));
        const mapped = apiRewards.map((raw) =>
          mapRewardResponseToReward(raw, byId.get(raw.id)),
        );
        storageService.saveRewards(mapped);
      })
      .catch(() => {
        // Keep local snapshot if offline during isolated tests
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const redemptionPages = usePagination(redemptions);
  const ledgerPages = usePagination(pointsLedger);

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
  const pendingRedemptions = redemptions.filter(
    (r) => r.status === 'PENDING',
  ).length;
  const approvedRedemptions = redemptions.filter(
    (r) => r.status === 'APPROVED' || r.status === 'DELIVERED',
  ).length;
  const totalPointsSpent = redemptions.reduce(
    (acc, r) => acc + r.pointsSpent,
    0,
  );

  const handleOpenEditReward = (rew: Reward) => {
    setEditingReward(rew);
    setName(rew.name);
    setDescription(rew.description);
    setPointsCost(rew.pointsCost);
    setMinPurchases(rew.minPurchases);
    setMinSpend(rew.minSpend);
    setValidityDays(rew.validityDays);
    setStatus(rew.status);
    setIsDrawerOpen(true);
  };

  const handleCreateRewardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const draftLocal: Reward = {
      id: editingReward?.id ?? 'TEMP',
      name: name.trim(),
      description: description.trim(),
      pointsCost,
      minPurchases,
      minSpend,
      validityDays,
      status,
    };

    try {
      if (editingReward) {
        const res = await updateRewardApi(editingReward.id, {
          title: draftLocal.name,
          description: draftLocal.description || undefined,
          category: 'GENERAL',
          pointsCost: draftLocal.pointsCost,
          active: draftLocal.status === 'ACTIVE',
        });
        const synced = mapRewardResponseToReward(res, draftLocal);
        const current = storageService.getRewards();
        storageService.saveRewards(
          current.map((r) => (r.id === editingReward.id ? synced : r)),
        );
        showToast({
          type: 'info',
          title: 'Recompensa actualizada',
          message: synced.name,
        });
      } else {
        const res = await createRewardApi({
          title: draftLocal.name,
          description: draftLocal.description || undefined,
          category: 'GENERAL',
          pointsCost: draftLocal.pointsCost,
        });
        const synced = mapRewardResponseToReward(res, draftLocal);
        const current = storageService.getRewards();
        storageService.saveRewards([...current, synced]);
        showToast({
          type: 'success',
          title: 'Recompensa creada en el catálogo de fidelización',
          message: synced.name,
        });
      }
      setIsDrawerOpen(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        if (editingReward) {
          const current = storageService.getRewards();
          storageService.saveRewards(
            current.map((r) => (r.id === editingReward.id ? draftLocal : r)),
          );
        } else {
          const { id: _id, ...rest } = draftLocal;
          createReward(rest);
        }
        setIsDrawerOpen(false);
        return;
      }
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sistema de Recompensas y Fidelización"
        subtitle="Configuración de premios por puntos, reglas de acumulación y auditoría de canjes (Ledger)."
        actions={
          <button
            onClick={() => {
              setEditingReward(null);
              setName('');
              setDescription('');
              setPointsCost(0);
              setMinPurchases(0);
              setMinSpend(0);
              setValidityDays(0);
              setStatus('ACTIVE');
              setIsDrawerOpen(true);
            }}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Recompensa</span>
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Recompensas Activas"
          value={totalRewards}
          subtitle="Catálogo de canje"
          icon={<Gift className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Canjes Pendientes"
          value={pendingRedemptions}
          subtitle="Por autorizar"
          variant={pendingRedemptions > 0 ? 'warning' : 'default'}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <MetricCard
          title="Canjes Aprobados"
          value={approvedRedemptions}
          subtitle="Entregados al cliente"
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Puntos Redimidos"
          value={totalPointsSpent.toLocaleString()}
          subtitle="Total canjeado histórico"
          variant="aqua"
          icon={<Coins className="w-4 h-4" />}
        />
      </div>

      {/* Tabs per spec #38 */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          {
            id: 'REWARDS',
            label: 'Catálogo de Recompensas',
            count: rewards.length,
          },
          { id: 'RULES', label: 'Reglas de Acumulación' },
          {
            id: 'REDEMPTIONS',
            label: 'Solicitudes de Canje',
            count: redemptions.length,
            highlight: pendingRedemptions > 0,
          },
          {
            id: 'LEDGER',
            label: 'Ledger General de Puntos (Regla #39)',
            count: pointsLedger.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  tab.highlight
                    ? 'bg-amber-100 text-amber-900 font-bold'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Recompensas */}
      {activeTab === 'REWARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rewards.map((rew) => (
            <div
              key={rew.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    {rew.pointsCost} puntos
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
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
                  {rew.description}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                <div className="flex justify-between">
                  <span>Compras mínimas requeridas:</span>
                  <strong className="text-slate-800">
                    {rew.minPurchases} órdenes
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Gasto acumulado previo:</span>
                  <strong className="text-slate-800 font-mono">
                    ${rew.minSpend}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Vigencia para canje:</span>
                  <strong className="text-slate-800">
                    {rew.validityDays} días
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Reglas de acumulación */}
      {activeTab === 'RULES' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
          <h3 className="text-sm font-bold text-slate-900">
            Reglas de Acumulación y Equivalencias de Puntos Clean & Fresh
          </h3>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Los puntos se acreditan automáticamente en el Ledger tras la
            finalización conforme de cada orden.
          </p>

          <p className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 text-xs text-slate-600">
            La tasa de puntos por unidad monetaria se define en la política de
            negocio. Aún no hay una política publicada.
          </p>
        </div>
      )}

      {/* Tab 3: Solicitudes de Canje */}
      {activeTab === 'REDEMPTIONS' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Recompensa Canjeada</th>
                  <th className="py-3.5 px-4 text-center">Puntos Canjeados</th>
                  <th className="py-3.5 px-4">Fecha Solicitud</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acción Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {redemptionPages.rows.map((red) => (
                  <tr
                    key={red.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {red.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {red.rewardName}
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
                          red.status === 'DELIVERED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : red.status === 'APPROVED'
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
                      {['PENDING', 'APPROVED'].includes(red.status) && (
                        <input
                          aria-label={'Motivo del canje ' + red.id}
                          placeholder="Motivo de revisión o entrega"
                          value={reviewNotes[red.id] ?? ''}
                          onChange={(e) =>
                            setReviewNotes({
                              ...reviewNotes,
                              [red.id]: e.target.value,
                            })
                          }
                          className="mb-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        />
                      )}
                      {red.notes && (
                        <p className="mb-2 whitespace-normal text-xs text-slate-500">
                          {red.notes}
                        </p>
                      )}
                      {red.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              updateRedemptionStatus(
                                red.id,
                                'APPROVED',
                                reviewNotes[red.id],
                              )
                            }
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs cursor-pointer"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() =>
                              updateRedemptionStatus(
                                red.id,
                                'REJECTED',
                                reviewNotes[red.id],
                              )
                            }
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                      {red.status === 'APPROVED' && (
                        <button
                          onClick={() =>
                            updateRedemptionStatus(
                              red.id,
                              'DELIVERED',
                              reviewNotes[red.id],
                            )
                          }
                          className="px-3 py-1.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-lg shadow-xs cursor-pointer"
                        >
                          Marcar Entregado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination pagination={redemptionPages} label="canjes" />
        </div>
      )}

      {/* Tab 4: Ledger General per spec #39 */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Libro Mayor de Puntos Inmutable (Audit Ledger - Regla #39)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cada saldo de cliente se deriva de transacciones firmadas con
                fecha, motivo y usuario auditor.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
              {pointsLedger.length} entradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4">Fecha y Hora</th>
                  <th className="py-3.5 px-4">Cliente ID</th>
                  <th className="py-3.5 px-4">Tipo de Evento</th>
                  <th className="py-3.5 px-4">Motivo / Justificación</th>
                  <th className="py-3.5 px-4 text-right">Variación Puntos</th>
                  <th className="py-3.5 px-4">Auditor Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerPages.rows.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {entry.date}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-800 whitespace-nowrap">
                      {entry.customerId}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                          entry.type === 'PURCHASE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : entry.type === 'REDEMPTION'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {entry.reason}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm whitespace-nowrap tabular-nums">
                      <span
                        className={
                          entry.points > 0
                            ? 'text-emerald-700'
                            : 'text-rose-600'
                        }
                      >
                        {entry.points > 0 ? `+${entry.points}` : entry.points}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {entry.adminUser || 'Sistema LaundryWeb'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination pagination={ledgerPages} label="movimientos de puntos" />
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
                  aria-label="Costo en puntos"
                  value={pointsCost}
                  onChange={(e) => setPointsCost(parseInt(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Compras previas mínimas
                </label>
                <input
                  type="number"
                  aria-label="Compras previas mínimas"
                  value={minPurchases}
                  onChange={(e) =>
                    setMinPurchases(parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Gasto previo acumulado ($)
                </label>
                <input
                  type="number"
                  aria-label="Gasto previo acumulado"
                  value={minSpend}
                  onChange={(e) => setMinSpend(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Vigencia (Días)
                </label>
                <input
                  type="number"
                  aria-label="Vigencia en días"
                  value={validityDays}
                  onChange={(e) =>
                    setValidityDays(parseInt(e.target.value) || 0)
                  }
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>

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
