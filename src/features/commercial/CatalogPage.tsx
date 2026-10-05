import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { CatalogItem } from '../../types';
import {
  FolderKanban,
  Shirt,
  Sparkles,
  Plus,
  Clock,
  DollarSign,
  X,
  Edit2,
  Lock,
} from 'lucide-react';

export const CatalogPage: React.FC = () => {
  const { catalog, createCatalogItem, updateCatalogItem, currentUser } = useApp();

  // Role Guard
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-red-200 shadow-2xs max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acceso No Autorizado</h2>
        <p className="text-xs text-slate-500 mt-1">El módulo de Catálogo Comercial está reservado para el rol Administrador.</p>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<'PRENDAS' | 'SERVICIOS' | 'EXTRAS'>('PRENDAS');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Prenda Individual');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(10.0);
  const [estimatedHours, setEstimatedHours] = useState(24);
  const [minHours, setMinHours] = useState(12);
  const [maxHours, setMaxHours] = useState(36);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // KPIs
  const prendasCount = catalog.filter((c) => c.category === 'PRENDAS').length;
  const serviciosCount = catalog.filter((c) => c.category === 'SERVICIOS').length;
  const extrasCount = catalog.filter((c) => c.category === 'EXTRAS').length;
  const activosCount = catalog.filter((c) => c.status === 'ACTIVE').length;

  const currentItems = useMemo(() => {
    return catalog.filter((c) => c.category === activeTab);
  }, [catalog, activeTab]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setType(activeTab === 'PRENDAS' ? 'Prenda Individual' : activeTab === 'SERVICIOS' ? 'Carga por Peso' : 'Empaque Eco');
    setDescription('');
    setPrice(activeTab === 'EXTRAS' ? 3.0 : 15.0);
    setEstimatedHours(activeTab === 'EXTRAS' ? 0 : 24);
    setMinHours(activeTab === 'EXTRAS' ? 0 : 12);
    setMaxHours(activeTab === 'EXTRAS' ? 0 : 36);
    setStatus('ACTIVE');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setType(item.type);
    setDescription(item.description);
    setPrice(item.price);
    setEstimatedHours(item.estimatedHours);
    setMinHours(item.minHours);
    setMaxHours(item.maxHours);
    setStatus(item.status);
    setIsDrawerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingItem) {
      updateCatalogItem({
        ...editingItem,
        name,
        type,
        description,
        price,
        estimatedHours,
        minHours,
        maxHours,
        status,
      });
    } else {
      createCatalogItem({
        name,
        category: activeTab,
        type,
        description,
        price,
        estimatedHours,
        minHours,
        maxHours,
        status,
      });
    }

    setIsDrawerOpen(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Catálogo Comercial"
        subtitle="Administración de prendas, paquetes de lavado por kilos, servicios especializados y extras."
        actions={
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Ítem de {activeTab}</span>
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Prendas"
          value={prendasCount}
          subtitle="Tipos de ropa"
          icon={<Shirt className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Servicios"
          value={serviciosCount}
          subtitle="Paquetes y lavado"
          variant="aqua"
          icon={<Sparkles className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Extras y Acabados"
          value={extrasCount}
          subtitle="Adicionales de cuidado"
          icon={<FolderKanban className="w-5 h-5 text-emerald-600" />}
        />
        <MetricCard
          title="Total Activos"
          value={activosCount}
          subtitle="Disponibles en venta"
          variant="success"
          icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Category Tabs per spec #36 */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { id: 'PRENDAS', label: 'Prendas Individuales', count: prendasCount },
          { id: 'SERVICIOS', label: 'Servicios & Paquetes', count: serviciosCount },
          { id: 'EXTRAS', label: 'Extras & Empaque', count: extrasCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-[#0F4C81] text-[#0F4C81]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label} <span className="opacity-75 font-mono text-[11px]">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Nombre</th>
                <th className="py-3.5 px-4">Tipo / Subcategoría</th>
                <th className="py-3.5 px-4 text-right">Precio Base</th>
                <th className="py-3.5 px-4">Tiempo Estimado</th>
                <th className="py-3.5 px-4">Rango (Mín - Máx)</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-slate-900 block">{item.name}</span>
                    <span className="text-[11px] text-slate-500 line-clamp-1">{item.description}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                    {item.type}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                    ${item.price.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                    {item.estimatedHours > 0 ? `${item.estimatedHours} horas` : 'Inmediato'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                    {item.minHours}h - {item.maxHours}h
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
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
      </div>

      {/* Drawer Crear / Editar per spec #36 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            <div className="p-5 border-b border-[#E5EAF0] bg-[#F7F9FC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingItem ? `Editar: ${editingItem.name}` : `Crear Nuevo Ítem (${activeTab})`}
                </h3>
                <p className="text-xs text-slate-500">Configuración de precio, tiempos de procesamiento y estado</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre comercial *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Camisa de lino o Lavado por Kilos"
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tipo / Subcategoría</label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="Ej: Prenda Individual, Alta Costura, Hogar..."
                  className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción para el cliente</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Precio ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiempo Estimado (horas)</label>
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiempo Mínimo (h)</label>
                  <input
                    type="number"
                    value={minHours}
                    onChange={(e) => setMinHours(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tiempo Máximo (h)</label>
                  <input
                    type="number"
                    value={maxHours}
                    onChange={(e) => setMaxHours(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estado de publicación</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
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
          </div>
        </div>
      )}
    </div>
  );
};
