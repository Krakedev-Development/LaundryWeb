import { Modal } from '../../shared/ui/Modal';
import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import {
  fetchAllCatalogItems,
  createGarment,
  updateGarment,
  createService,
  updateService,
  serviceHoursError,
  createExtra,
  updateExtra,
  mapGarmentToCatalogItem,
  mapServiceToCatalogItem,
  mapExtraToCatalogItem,
} from '../../services/api/catalogApi';
import { PageHeader } from '../../components/common/PageHeader';
import { TablePagination, usePagination } from '../../shared/ui/TablePagination';
import { MetricCard } from '../../components/common/MetricCard';
import { AnimatedPillTabs } from '../../components/ui/AnimatedPillTabs';
import { StaggerContainer, StaggerItem } from '../../components/ui/StaggerList';
import { btnPrimary } from '../../shared/ui/controls';
import { CatalogItem } from '../../types';
import { WeightServicePanel } from './WeightServicePanel';
import {
  FolderKanban,
  Shirt,
  Sparkles,
  Plus,
  DollarSign,
  Edit2,
  Lock,
} from 'lucide-react';

type CatalogTab = 'PRENDAS' | 'SERVICIOS' | 'EXTRAS' | 'PESO';
type ItemCategory = Exclude<CatalogTab, 'PESO'>;

export const CatalogPage: React.FC = () => {
  const { currentUser, showToast } = useApp();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTab, setActiveTab] = useState<CatalogTab>('PRENDAS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Prenda Individual');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    fetchAllCatalogItems()
      .then((loaded) => {
        if (!cancelled) {
          setItems(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setLoadError(
            cause instanceof Error
              ? cause.message
              : 'No se pudo cargar el catálogo desde el servidor.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // KPIs
  const prendasCount = items.filter((c) => c.category === 'PRENDAS').length;
  const serviciosCount = items.filter((c) => c.category === 'SERVICIOS').length;
  const extrasCount = items.filter((c) => c.category === 'EXTRAS').length;
  const activosCount = items.filter((c) => c.status === 'ACTIVE').length;

  const currentItems = useMemo(() => {
    return items.filter((c) => c.category === activeTab);
  }, [items, activeTab]);
  const pagination = usePagination(currentItems, activeTab);

  const activeCategory: ItemCategory = editingItem
    ? editingItem.category
    : (activeTab as ItemCategory);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setType(
      activeTab === 'PRENDAS'
        ? 'Prenda Individual'
        : activeTab === 'SERVICIOS'
          ? 'Servicio de Lavandería'
          : 'Acabado & Empaque',
    );
    setDescription('');
    setPrice(0);
    setEstimatedHours(0);
    setStatus('ACTIVE');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setType(item.type);
    setDescription(item.description);
    setPrice(
      item.pricingModel === 'PER_WEIGHT'
        ? (item.pricePerWeightUnit ?? 0)
        : item.price,
    );
    setEstimatedHours(item.estimatedHours);
    setStatus(item.status);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const category = editingItem ? editingItem.category : (activeTab as ItemCategory);
    const hoursError =
      category === 'SERVICIOS' || (category === 'PRENDAS' && estimatedHours > 0)
        ? serviceHoursError(estimatedHours)
        : undefined;
    if (hoursError) {
      showToast({
        type: 'error',
        title: 'Revisa el tiempo estimado',
        message: hoursError,
      });
      return;
    }

    const serviceDetails = {
      description: description.trim() || null,
      estimatedHours: estimatedHours > 0 ? estimatedHours : null,
    };

    try {
      if (editingItem) {
        let syncedItem: CatalogItem;

        if (editingItem.category === 'PRENDAS') {
          const updated = await updateGarment(editingItem.id, {
            name: name.trim(),
            basePrice: price,
            category: type.trim() || null,
            description: description.trim() || null,
            estimatedHours: estimatedHours > 0 ? estimatedHours : null,
            active: status === 'ACTIVE',
          });
          syncedItem = mapGarmentToCatalogItem(updated);
        } else if (editingItem.category === 'SERVICIOS') {
          const updated = await updateService(editingItem.id, {
            name: name.trim(),
            extraPrice: price,
            ...serviceDetails,
            active: status === 'ACTIVE',
          });
          syncedItem = mapServiceToCatalogItem(updated);
        } else {
          const updated = await updateExtra(editingItem.id, {
            name: name.trim(),
            description: description.trim() || null,
            price,
            active: status === 'ACTIVE',
          });
          syncedItem = mapExtraToCatalogItem(updated);
        }

        setItems((prev) =>
          prev.some((i) => i.id === editingItem.id)
            ? prev.map((i) => (i.id === editingItem.id ? syncedItem : i))
            : [...prev, syncedItem],
        );
        showToast({
          type: 'info',
          title: 'Ítem de catálogo actualizado',
          message: syncedItem.name,
        });
      } else {
        let createdItem: CatalogItem;

        if (activeTab === 'PRENDAS') {
          let res = await createGarment({
            name: name.trim(),
            basePrice: price,
            category: type.trim() || null,
            description: description.trim() || null,
            estimatedHours: estimatedHours > 0 ? estimatedHours : null,
          });
          if (status === 'INACTIVE') {
            res = await updateGarment(res.id, { active: false });
          }
          createdItem = mapGarmentToCatalogItem(res);
        } else if (activeTab === 'SERVICIOS') {
          let res = await createService({
            name: name.trim(),
            extraPrice: price,
            ...serviceDetails,
          });
          if (status === 'INACTIVE') {
            res = await updateService(res.id, { active: false });
          }
          createdItem = mapServiceToCatalogItem(res);
        } else {
          let res = await createExtra({
            name: name.trim(),
            description: description.trim() || null,
            price,
          });
          if (status === 'INACTIVE') {
            res = await updateExtra(res.id, { active: false });
          }
          createdItem = mapExtraToCatalogItem(res);
        }

        setItems((prev) => [...prev, createdItem]);
        showToast({
          type: 'success',
          title: 'Ítem agregado al catálogo',
          message: createdItem.name,
        });
      }
      setIsDrawerOpen(false);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error al guardar en catálogo',
        message:
          err instanceof Error
            ? err.message
            : 'No se pudo sincronizar con el servidor.',
      });
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
          El módulo de Catálogo Comercial está reservado para el rol
          Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catálogo Comercial"
        subtitle="Administración de prendas, paquetes de lavado por kilos, servicios especializados y extras."
        actions={
          activeTab === 'PESO' ? undefined : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={handleOpenCreate}
              className={btnPrimary}
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Ítem de {activeTab}</span>
            </motion.button>
          )
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
            title="Prendas"
            value={prendasCount}
            subtitle="Tipos de ropa"
            icon={<Shirt className="w-5 h-5 text-sky-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Servicios"
            value={serviciosCount}
            subtitle="Paquetes y lavado"
            variant="aqua"
            icon={<Sparkles className="w-5 h-5 text-sky-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Extras y Acabados"
            value={extrasCount}
            subtitle="Adicionales de cuidado"
            icon={<FolderKanban className="w-5 h-5 text-emerald-600" />}
          />
        </StaggerItem>
        <StaggerItem>
          <MetricCard
            title="Total Activos"
            value={activosCount}
            subtitle="Disponibles en venta"
            variant="success"
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Category Tabs */}
      <div className="overflow-x-auto pb-1">
        <AnimatedPillTabs<CatalogTab>
          layoutId="catalog-tabs"
          ariaLabel="Categorías del catálogo"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: 'PRENDAS', label: 'Prendas Individuales', count: prendasCount },
            { id: 'SERVICIOS', label: 'Servicios & Paquetes', count: serviciosCount },
            { id: 'EXTRAS', label: 'Extras & Empaque', count: extrasCount },
            { id: 'PESO', label: 'Servicio por Peso' },
          ]}
        />
      </div>

      {activeTab === 'PESO' ? (
        <WeightServicePanel />
      ) : (
        <div className="fintech-card overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-xs text-slate-500">
              Cargando catálogo desde el servidor...
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3.5 px-4">Nombre</th>
                      <th className="py-3.5 px-4">Tipo / Subcategoría</th>
                      <th className="py-3.5 px-4 text-right">Precio Base</th>
                      <th className="py-3.5 px-4">Tiempo Estimado</th>
                      <th className="py-3.5 px-4">Estado</th>
                      <th className="py-3.5 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagination.rows.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 block">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-slate-500 line-clamp-1">
                            {item.description}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                          {item.type}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                          {item.pricingModel === 'PER_WEIGHT'
                            ? `$${item.pricePerWeightUnit?.toFixed(2)}/${item.weightUnit}`
                            : `$${item.price.toFixed(2)}`}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                          {item.estimatedHours > 0
                            ? `${item.estimatedHours} horas`
                            : item.category === 'EXTRAS'
                              ? 'Inmediato'
                              : 'Sin definir'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {item.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar ítem"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePagination pagination={pagination} label="ítems del catálogo" />
            </>
          )}
        </div>
      )}

      {/* Drawer Crear / Editar per spec #36 */}
      {isDrawerOpen && (
        <Modal
          title={
            editingItem
              ? `Editar: ${editingItem.name}`
              : `Crear nuevo ítem (${activeTab})`
          }
          description="Configura el precio, los detalles y el estado."
          onClose={() => setIsDrawerOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="p-5 space-y-4 overflow-y-auto flex-1 text-xs"
          >
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre comercial *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Camisa de lino o Lavado por Kilos"
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {activeCategory === 'PRENDAS' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tipo / Subcategoría
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Ej: Prendas superiores, Hogar, Formal..."
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Descripción para el cliente
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles sobre el proceso de lavado y cuidado..."
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Precio ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
              {activeCategory !== 'EXTRAS' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tiempo Estimado (horas)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={720}
                    step={1}
                    aria-label="Tiempo estimado en horas"
                    value={estimatedHours}
                    onChange={(e) =>
                      setEstimatedHours(parseInt(e.target.value) || 0)
                    }
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado de publicación
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')
                }
                className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
              >
                <option value="ACTIVE">Activo (Visible para clientes)</option>
                <option value="INACTIVE">Inactivo (Pausado)</option>
              </select>
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
                {editingItem ? 'Guardar Cambios' : 'Crear Ítem'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
