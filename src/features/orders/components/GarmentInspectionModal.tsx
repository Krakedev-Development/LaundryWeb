import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Camera,
  Info,
  ShieldAlert,
  ClipboardCheck,
} from 'lucide-react';
import type { Order, OrderItem } from '../../../types';
import { IconPlaceholder } from '../../../components/common/IconPlaceholder';

export type InspectionResultType = 'PENDING' | 'CLEAN' | 'OBSERVATION' | 'INCIDENT';

export interface GarmentInspectionUnit {
  unitIndex: number;
  itemId: string;
  itemName: string;
  category: string;
  result: InspectionResultType;
  observationReason?: string;
  incidentType?: string;
  severity?: 'MEDIA' | 'ALTA' | 'CRITICA';
  description: string;
  evidencePhoto?: string;
}

interface GarmentInspectionModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onConfirmInspection: (
    results: GarmentInspectionUnit[],
    customerMessageDraft?: string,
  ) => Promise<void> | void;
}

const OBSERVATION_REASONS = [
  'Desgaste natural de tejido en cuello/puños',
  'Botón flojo o faltante',
  'Mancha tenue previa a lavado',
  'Sin etiqueta de cuidado o composición textil',
  'Costura abierta o deshilachado menor',
  'Otro detalle no bloqueante',
];

const INCIDENT_REASONS = [
  'Mancha química o grasa persistente',
  'Desgarrado o rotura previa considerable',
  'Prenda no recibida / faltante respecto a lo declarado',
  'Riesgo crítico de desteñido o transferencia de color',
  'Quemadura previa o tejido debilitado por químicos',
  'Otro daño severo preexistente',
];

export const GarmentInspectionModal: React.FC<GarmentInspectionModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmInspection,
}) => {
  // Expand order items into individual units to inspect unit-by-unit
  const initialUnits = React.useMemo<GarmentInspectionUnit[]>(() => {
    const list: GarmentInspectionUnit[] = [];
    let counter = 1;
    (order.items || []).forEach((item: OrderItem) => {
      const qty = Math.max(1, item.quantity || 1);
      for (let i = 0; i < qty; i++) {
        list.push({
          unitIndex: counter,
          itemId: item.id,
          itemName: item.name || `Prenda ${counter}`,
          category: item.category || 'PRENDAS',
          result: 'PENDING',
          description: '',
        });
        counter++;
      }
    });
    // Fallback if no items
    if (list.length === 0) {
      for (let i = 1; i <= (order.itemCount || 1); i++) {
        list.push({
          unitIndex: i,
          itemId: `UNIT-${i}`,
          itemName: `Prenda ${i}`,
          category: 'PRENDAS',
          result: 'PENDING',
          description: '',
        });
      }
    }
    return list;
  }, [order]);

  const [units, setUnits] = useState<GarmentInspectionUnit[]>(initialUnits);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [customerMessageDraft, setCustomerMessageDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  if (!isOpen) return null;

  const currentUnit = units[selectedUnitIndex] || units[0];

  const reviewedCount = units.filter((u) => u.result !== 'PENDING').length;
  const cleanCount = units.filter((u) => u.result === 'CLEAN').length;
  const observationCount = units.filter((u) => u.result === 'OBSERVATION').length;
  const incidentCount = units.filter((u) => u.result === 'INCIDENT').length;
  const allReviewed = units.every((u) => {
    if (u.result === 'PENDING') return false;
    if (u.result === 'OBSERVATION' && !u.description.trim()) return false;
    if (u.result === 'INCIDENT' && !u.description.trim()) return false;
    return true;
  });

  const handleUpdateUnit = (partial: Partial<GarmentInspectionUnit>) => {
    setUnits((prev) =>
      prev.map((u, idx) => (idx === selectedUnitIndex ? { ...u, ...partial } : u)),
    );
  };

  const handleNextUnit = () => {
    if (selectedUnitIndex < units.length - 1) {
      setSelectedUnitIndex(selectedUnitIndex + 1);
    }
  };

  const handlePrevUnit = () => {
    if (selectedUnitIndex > 0) {
      setSelectedUnitIndex(selectedUnitIndex - 1);
    }
  };

  const handleSafeClose = () => {
    if (reviewedCount > 0 && currentStep === 1) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmInspection(units, customerMessageDraft);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPerWeight = order.pricing?.pricingModel === 'PER_WEIGHT';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inspection-modal-title"
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#0F4C81]" />
              <h2 id="inspection-modal-title" className="text-base font-bold text-slate-900">
                Inspección de prendas
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-sky-100 text-[#0F4C81]">
                {currentStep === 1 ? 'Paso 1: Revisión unitaria' : 'Paso 2: Confirmación'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Solicitud {order.trackingNumber || order.id} · {units.length} prendas registradas ·{' '}
              {isPerWeight ? 'Tarifa por peso' : 'Tarifa por prenda (sin pesaje requerido)'}
            </p>
          </div>

          <button
            onClick={handleSafeClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            aria-label="Cerrar modal de inspección"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Step 1: Unit by Unit Inspection */}
        {currentStep === 1 && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Progress segment bar */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200/70 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Progreso: {reviewedCount} de {units.length} revisadas
              </span>
              <div className="flex items-center gap-1.5">
                {units.map((u, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedUnitIndex(i)}
                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                      i === selectedUnitIndex
                        ? 'w-7 bg-[#0F4C81] ring-2 ring-sky-300'
                        : u.result === 'CLEAN'
                          ? 'w-4 bg-emerald-500'
                          : u.result === 'OBSERVATION'
                            ? 'w-4 bg-amber-500'
                            : u.result === 'INCIDENT'
                              ? 'w-4 bg-rose-500'
                              : 'w-4 bg-slate-300'
                    }`}
                    title={`Prenda ${u.unitIndex}: ${u.result}`}
                  />
                ))}
              </div>
            </div>

            {/* Split view: Units list + Contextual form */}
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-[380px]">
              {/* Left Column: Units list (5 cols) */}
              <div className="md:col-span-5 border-r border-slate-200 p-4 space-y-2 overflow-y-auto bg-slate-50/40">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Unidades físicas a inspeccionar
                </h3>
                <div className="space-y-2">
                  {units.map((u, idx) => {
                    const isSelected = idx === selectedUnitIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedUnitIndex(idx)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-white border-[#0F4C81] shadow-xs ring-1 ring-[#0F4C81]'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <span className="block text-xs font-bold text-slate-900 truncate">
                            #{u.unitIndex} · {u.itemName}
                          </span>
                          <span className="block text-[11px] text-slate-500">{u.category}</span>
                        </div>
                        <div>
                          {u.result === 'PENDING' && (
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Pendiente
                            </span>
                          )}
                          {u.result === 'CLEAN' && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Conforme
                            </span>
                          )}
                          {u.result === 'OBSERVATION' && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              Observada
                            </span>
                          )}
                          {u.result === 'INCIDENT' && (
                            <span className="text-[10px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              Incidencia
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Contextual inspection form (7 cols) */}
              <div className="md:col-span-7 p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-xs font-semibold text-slate-400">
                      Unidad {currentUnit.unitIndex} de {units.length}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {currentUnit.itemName}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({currentUnit.category})
                      </span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedUnitIndex === 0}
                      onClick={handlePrevUnit}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Prenda anterior"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={selectedUnitIndex === units.length - 1}
                      onClick={handleNextUnit}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Siguiente prenda"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* State selector: 3 options */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Resultado de la inspección *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option 1: CLEAN */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUnit({
                          result: 'CLEAN',
                          observationReason: undefined,
                          incidentType: undefined,
                          severity: undefined,
                          description: 'Conforme sin manchas ni roturas previas.',
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        currentUnit.result === 'CLEAN'
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sin novedad
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Recibida conforme, lista para lavado.
                      </p>
                    </button>

                    {/* Option 2: OBSERVATION */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUnit({
                          result: 'OBSERVATION',
                          observationReason: currentUnit.observationReason || OBSERVATION_REASONS[0],
                          incidentType: undefined,
                          severity: undefined,
                          description:
                            currentUnit.description && currentUnit.result === 'OBSERVATION'
                              ? currentUnit.description
                              : '',
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        currentUnit.result === 'OBSERVATION'
                          ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-1">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Con observación
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Detalle menor previo, no bloquea.
                      </p>
                    </button>

                    {/* Option 3: INCIDENT */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUnit({
                          result: 'INCIDENT',
                          incidentType: currentUnit.incidentType || INCIDENT_REASONS[0],
                          severity: currentUnit.severity || 'MEDIA',
                          description:
                            currentUnit.description && currentUnit.result === 'INCIDENT'
                              ? currentUnit.description
                              : '',
                        })
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        currentUnit.result === 'INCIDENT'
                          ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs mb-1">
                        <ShieldAlert className="w-4 h-4 text-rose-600" />
                        Incidencia
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Daño o novedad que requiere gestión.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Conditional Fields: When OBSERVATION */}
                {currentUnit.result === 'OBSERVATION' && (
                  <div className="space-y-3 p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80 animate-in fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Motivo de la observación
                      </label>
                      <select
                        value={currentUnit.observationReason || OBSERVATION_REASONS[0]}
                        onChange={(e) => handleUpdateUnit({ observationReason: e.target.value })}
                        className="w-full text-xs p-2 bg-white border border-amber-300 rounded-xl"
                      >
                        {OBSERVATION_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-amber-900 mb-1">
                        Detalle / notas de la observación *
                      </label>
                      <textarea
                        rows={2}
                        value={currentUnit.description}
                        onChange={(e) => handleUpdateUnit({ description: e.target.value })}
                        placeholder="Especificar ubicación del desgaste, botón faltante o mancha tenue..."
                        className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-amber-800 pt-1">
                      <span className="flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-amber-600" />
                        Permite continuar a lavado registrando constancia fotográfica o técnica.
                      </span>
                    </div>
                  </div>
                )}

                {/* Conditional Fields: When INCIDENT */}
                {currentUnit.result === 'INCIDENT' && (
                  <div className="space-y-3 p-3.5 bg-rose-50/50 rounded-2xl border border-rose-200/80 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-rose-900 mb-1">
                          Tipo de daño o novedad *
                        </label>
                        <select
                          value={currentUnit.incidentType || INCIDENT_REASONS[0]}
                          onChange={(e) => handleUpdateUnit({ incidentType: e.target.value })}
                          className="w-full text-xs p-2 bg-white border border-rose-300 rounded-xl"
                        >
                          {INCIDENT_REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-rose-900 mb-1">
                          Severidad operacional *
                        </label>
                        <select
                          value={currentUnit.severity || 'MEDIA'}
                          onChange={(e) =>
                            handleUpdateUnit({
                              severity: e.target.value as 'MEDIA' | 'ALTA' | 'CRITICA',
                            })
                          }
                          className="w-full text-xs p-2 bg-white border border-rose-300 rounded-xl"
                        >
                          <option value="MEDIA">Media (Aviso al cliente)</option>
                          <option value="ALTA">Alta (Riesgo en lavado)</option>
                          <option value="CRITICA">Crítica (Bloqueante de lavado)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-rose-900 mb-1">
                        Descripción obligatoria de la incidencia *
                      </label>
                      <textarea
                        rows={2}
                        value={currentUnit.description}
                        onChange={(e) => handleUpdateUnit({ description: e.target.value })}
                        required
                        placeholder="Describir condición encontrada, ubicación exacta y motivo del reporte..."
                        className="w-full text-xs p-2.5 bg-white border border-rose-300 rounded-xl"
                      />
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-rose-100/60 rounded-xl text-rose-900 text-[11px]">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Esta incidencia quedará vinculada formalmente al expediente de la solicitud.
                      </span>
                    </div>
                  </div>
                )}

                {/* Evidence Mock / Attachment */}
                <div className="pt-2">
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Evidencia fotográfica de la prenda (opcional)
                  </span>
                  <div className="flex items-center gap-3">
                    <IconPlaceholder
                      kind="evidence"
                      label={`Evidencia prenda #${currentUnit.unitIndex}`}
                      className="size-16 rounded-xl border border-slate-200"
                    />
                    <div className="text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">Foto de inspección</p>
                      <p className="text-[11px]">Registrada con sello temporal de recepción en planta.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 Footer */}
            <footer className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSafeClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                {!allReviewed && (
                  <span className="text-xs text-slate-500">
                    Faltan {units.length - reviewedCount} prenda(s) por revisar
                  </span>
                )}
                <button
                  type="button"
                  disabled={!allReviewed}
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#0F4C81] hover:bg-[#0A3660] rounded-xl shadow-xs transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                >
                  <span>Revisar y confirmar ({units.length} prendas)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </footer>
          </div>
        )}

        {/* Step 2: Review and Confirm */}
        {currentStep === 2 && (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Metric counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="block text-2xl font-bold text-emerald-800">{cleanCount}</span>
                <span className="text-xs font-semibold text-emerald-700">Sin novedad</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
                <span className="block text-2xl font-bold text-amber-800">{observationCount}</span>
                <span className="text-xs font-semibold text-amber-700">Con observación</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                <span className="block text-2xl font-bold text-rose-800">{incidentCount}</span>
                <span className="text-xs font-semibold text-rose-700">Con incidencia</span>
              </div>
            </div>

            {/* Diagnosis Banner */}
            {incidentCount > 0 ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900">
                  <p className="font-bold text-sm">Inspección con incidencias registradas</p>
                  <p className="mt-0.5">
                    Se detectaron {incidentCount} prenda(s) con novedad grave. La orden quedará
                    marcada para gestión de incidencias y no podrá avanzar a lavado directo sin
                    autorización.
                  </p>
                </div>
              </div>
            ) : observationCount > 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900">
                  <p className="font-bold text-sm">Inspección completada con observaciones</p>
                  <p className="mt-0.5">
                    Todas las prendas fueron revisadas. Las observaciones menores quedan
                    documentadas para trazabilidad antes del ciclo de lavado.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <p className="font-bold text-sm">Inspección 100% conforme</p>
                  <p className="mt-0.5">
                    Todas las unidades están en óptimas condiciones. Al confirmar, la solicitud
                    quedará habilitada para iniciar procesamiento de lavado.
                  </p>
                </div>
              </div>
            )}

            {/* Summary Table of all inspected items */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Unidad</th>
                    <th className="py-2.5 px-3">Prenda</th>
                    <th className="py-2.5 px-3">Resultado</th>
                    <th className="py-2.5 px-3">Detalle registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {units.map((u) => (
                    <tr key={u.unitIndex} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        #{u.unitIndex}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-slate-900">{u.itemName}</span>
                        <span className="block text-[10px] text-slate-400">{u.category}</span>
                      </td>
                      <td className="py-2 px-3">
                        {u.result === 'CLEAN' && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Conforme
                          </span>
                        )}
                        {u.result === 'OBSERVATION' && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Observada
                          </span>
                        )}
                        {u.result === 'INCIDENT' && (
                          <span className="text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            Incidencia ({u.severity})
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {u.description || 'Sin novedad.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Customer Message Draft (Audit Finding H-08: Explicitly distinct, not sent automatically) */}
            <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">
                  Borrador de mensaje para el cliente (Opcional)
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  Visibilidad: Borrador interno (no se envía automáticamente)
                </span>
              </div>
              <textarea
                rows={2}
                value={customerMessageDraft}
                onChange={(e) => setCustomerMessageDraft(e.target.value)}
                placeholder="Ejemplo: Hemos revisado tus 4 prendas. Comenzaremos el proceso de desmanchado suave..."
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            {/* Step 2 Footer */}
            <footer className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a editar prendas</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleConfirm()}
                className={`px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2 ${
                  incidentCount > 0
                    ? 'bg-rose-700 hover:bg-rose-800'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Guardando inspección...'
                    : incidentCount > 0
                      ? 'Confirmar con Incidencias'
                      : 'Confirmar y finalizar inspección'}
                </span>
              </button>
            </footer>
          </div>
        )}
      </div>

      {/* Exit confirmation dialog */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 text-xs space-y-3">
            <h4 className="font-bold text-sm text-slate-900">¿Deseas salir de la inspección?</h4>
            <p className="text-slate-600">
              Hay datos registrados en {reviewedCount} prenda(s). Si sales ahora sin confirmar, se
              descartarán los cambios temporales.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Continuar inspeccionando
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onClose();
                }}
                className="px-3.5 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                Descartar y salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
