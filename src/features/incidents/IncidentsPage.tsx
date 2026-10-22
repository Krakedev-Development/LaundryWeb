import { IconPlaceholder } from '../../components/common/IconPlaceholder';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { Incident, IncidentSeverity, IncidentStatus } from '../../types';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  ShieldAlert,
  Search,
  MessageSquare,
  Camera,
  X,
  Plus,
  Send,
} from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const { incidents, updateIncidentStatus, addIncidentNote, currentUser } =
    useApp();
  const navigate = useNavigate();

  // Selected tab
  const [activeTab, setActiveTab] = useState<'ALL' | IncidentStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected incident for detail drawer
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    null,
  );

  // New note input state
  const [newNoteText, setNewNoteText] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  // KPI counts
  const abiertasCount = incidents.filter((i) => i.status === 'OPEN').length;
  const investigacionCount = incidents.filter(
    (i) => i.status === 'IN_PROGRESS',
  ).length;
  const pendientesCierreCount = incidents.filter(
    (i) => i.status === 'PENDING_CLOSURE',
  ).length;
  const resueltasCount = incidents.filter(
    (i) => i.status === 'RESOLVED',
  ).length;

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (activeTab !== 'ALL' && inc.status !== activeTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          inc.id.toLowerCase().includes(q) ||
          inc.orderId.toLowerCase().includes(q) ||
          inc.customerName.toLowerCase().includes(q) ||
          inc.description.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [incidents, activeTab, searchQuery]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedIncident) return;
    addIncidentNote(selectedIncident.id, newNoteText);
    setNewNoteText('');
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionNotes.trim() || !selectedIncident) return;
    updateIncidentStatus(selectedIncident.id, 'RESOLVED', resolutionNotes);
    setIsResolving(false);
    setResolutionNotes('');
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    const config: Record<
      IncidentSeverity,
      { bg: string; text: string; border: string }
    > = {
      CRITICA: {
        bg: 'bg-red-100',
        text: 'text-red-900',
        border: 'border-red-300',
      },
      ALTA: {
        bg: 'bg-amber-100',
        text: 'text-amber-900',
        border: 'border-amber-300',
      },
      MEDIA: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
      },
      BAJA: {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
      },
    };
    const c = config[sev] || config.MEDIA;
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 rounded border ${c.bg} ${c.text} ${c.border}`}
      >
        {sev}
      </span>
    );
  };

  const getStatusBadge = (st: IncidentStatus) => {
    const config: Record<IncidentStatus, { label: string; bg: string }> = {
      OPEN: { label: 'Abierta', bg: 'bg-red-50 text-red-700 border-red-200' },
      IN_PROGRESS: {
        label: 'En investigación',
        bg: 'bg-amber-50 text-amber-800 border-amber-200',
      },
      PENDING_CLOSURE: {
        label: 'Pendiente cierre',
        bg: 'bg-sky-50 text-sky-800 border-sky-200',
      },
      RESOLVED: {
        label: 'Resuelta',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      },
    };
    const c = config[st] || config.OPEN;
    return (
      <span
        className={`inline-block font-semibold text-xs px-2 py-0.5 rounded border ${c.bg}`}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Incidencias Operacionales"
        subtitle="Monitoreo, investigación, seguimiento de evidencias y resolución de incidencias en prendas y rutas."
      />

      {/* Mandatory Operational Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200/90 flex items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-xs font-bold text-rose-950">
            Regla de Integridad Operativa: Las solicitudes con incidencias
            abiertas o en investigación NO pueden finalizarse en el sistema.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Abiertas"
          value={abiertasCount}
          subtitle="Pendientes de asignación"
          variant={abiertasCount > 0 ? 'urgent' : 'default'}
          icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
        />
        <MetricCard
          title="En Investigación"
          value={investigacionCount}
          subtitle="Con peritaje técnico"
          variant={investigacionCount > 0 ? 'warning' : 'default'}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <MetricCard
          title="Pendientes Cierre"
          value={pendientesCierreCount}
          subtitle="A la espera de cliente"
          variant="aqua"
          icon={<ShieldAlert className="w-5 h-5 text-sky-600" />}
        />
        <MetricCard
          title="Resueltas"
          value={resueltasCount}
          subtitle="Cerradas conforme"
          variant="success"
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'Todas', count: incidents.length },
              { id: 'OPEN', label: 'Abiertas', count: abiertasCount },
              {
                id: 'IN_PROGRESS',
                label: 'En investigación',
                count: investigacionCount,
              },
              {
                id: 'PENDING_CLOSURE',
                label: 'Pendientes de cierre',
                count: pendientesCierreCount,
              },
              { id: 'RESOLVED', label: 'Resueltas', count: resueltasCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-sky-50 text-sky-800 font-bold border border-sky-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[11px] font-mono opacity-75">
                  ({tab.count})
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar caso INC-0187, cliente, orden..."
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Incidents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4">Caso</th>
                <th className="py-3.5 px-4">Solicitud</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Severidad</th>
                <th className="py-3.5 px-4">Responsable</th>
                <th className="py-3.5 px-4">Fecha</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold font-mono text-rose-700">
                    {inc.id}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-sky-800">
                    {inc.orderId}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 truncate max-w-[140px]">
                    {inc.customerName}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-800">
                    {inc.type}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getSeverityBadge(inc.severity)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 truncate max-w-[130px]">
                    {inc.assignedTo}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    {inc.createdAt}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {getStatusBadge(inc.status)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedIncidentId(inc.id);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Drawer / Modal per spec #33 */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="p-5 border-b border-[#E5EAF0] bg-[#F7F9FC] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    {selectedIncident.id}
                  </span>
                  {getSeverityBadge(selectedIncident.severity)}
                  {getStatusBadge(selectedIncident.status)}
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-1">
                  Incidencia en Solicitud {selectedIncident.orderId}
                </h2>
              </div>
              <button
                onClick={() => setSelectedIncidentId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Overview Details */}
              <div className="p-4 bg-[#F7F9FC] rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente afectado:</span>
                  <span className="font-bold text-slate-900">
                    {selectedIncident.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tipo de caso:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedIncident.type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Responsable asignado:</span>
                  <span className="font-semibold text-[#143F73]">
                    {selectedIncident.assignedTo}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reportado por:</span>
                  <span className="text-slate-700">
                    {selectedIncident.reportedBy} (
                    {selectedIncident.reportedRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Fecha y hora de registro:
                  </span>
                  <span className="font-mono text-slate-700">
                    {selectedIncident.createdAt}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1">
                  Descripción del Incidente:
                </h4>
                <p className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 leading-relaxed">
                  {selectedIncident.description}
                </p>
              </div>

              {/* Evidences */}
              <div>
                <h4 className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-slate-500" />
                  Evidencias Fotográficas Adjuntas (
                  {selectedIncident.evidences.length})
                </h4>
                {selectedIncident.evidences.length === 0 ? (
                  <p className="text-slate-400 italic">
                    No se adjuntaron fotografías al registrar el caso.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {selectedIncident.evidences.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                      >
                        <IconPlaceholder
                          kind="evidence"
                          label={ev.caption}
                          className="h-32 w-full"
                        />
                        <p className="p-2 text-[11px] text-slate-600">
                          {ev.caption}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolution Notes if Resolved */}
              {selectedIncident.status === 'RESOLVED' && (
                <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    Caso Resuelto el {selectedIncident.resolvedAt}
                  </div>
                  <p className="text-xs text-emerald-800">
                    {selectedIncident.resolutionNotes}
                  </p>
                </div>
              )}

              {/* Internal Notes Feed */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-slate-500" />
                  Bitácora de Notas Internas (
                  {selectedIncident.internalNotes.length})
                </h4>

                <div className="space-y-2 mb-3">
                  {selectedIncident.internalNotes.map((note) => (
                    <div
                      key={note.id}
                      className="p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex justify-between text-[11px] text-slate-500 mb-0.5">
                        <span className="font-bold text-slate-800">
                          {note.author}
                        </span>
                        <span className="font-mono">{note.createdAt}</span>
                      </div>
                      <p className="text-slate-700">{note.text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Note Input */}
                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    placeholder="Agregar nota interna al expediente..."
                    className="flex-1 p-2 bg-[#F7F9FC] border border-slate-300 rounded-lg text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-[#0F4C81] text-white font-bold rounded-lg hover:bg-[#0A3660] transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Resolve Form */}
              {isResolving && (
                <form
                  onSubmit={handleResolveSubmit}
                  className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3"
                >
                  <h4 className="font-bold text-emerald-900">
                    Confirmar Resolución del Caso
                  </h4>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    required
                    rows={2}
                    placeholder="Detalle de solución técnica o acuerdo con el cliente..."
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-xs"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsResolving(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-lg hover:bg-emerald-800 cursor-pointer"
                    >
                      Resolver Incidencia
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex items-center justify-between">
              <button
                onClick={() =>
                  navigate(`/operations/orders/${selectedIncident.orderId}`)
                }
                className="text-xs font-semibold text-sky-700 hover:underline"
              >
                Abrir Solicitud {selectedIncident.orderId} →
              </button>

              <div className="flex items-center gap-2">
                {selectedIncident.status !== 'RESOLVED' && !isResolving && (
                  <button
                    onClick={() => setIsResolving(true)}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolver Incidencia</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
