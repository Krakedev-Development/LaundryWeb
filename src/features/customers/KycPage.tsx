import { IconPlaceholder } from '../../components/common/IconPlaceholder';
import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { EmptyState } from '../../components/common/EmptyState';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  AlertTriangle,
  Lock,
  FileText,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const KycPage: React.FC = () => {
  const { customers, currentUser, updateCustomerKyc } = useApp();

  // Role Guard per spec #4, #5 & #35
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-red-200 shadow-2xs max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Acceso No Autorizado
        </h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          El módulo de <strong>Validaciones KYC</strong> está restringido
          exclusivamente al rol <strong>Administrador</strong> por políticas de
          cumplimiento y protección de datos.
        </p>
      </div>
    );
  }

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers.find((c) => c.kycStatus === 'PENDING')?.id ||
      customers[0]?.id ||
      '',
  );

  // Checklist state for active verification
  const [checks, setChecks] = useState({
    legible: true,
    vigente: true,
    selfieMatch: true,
    datosConsistentes: true,
    direccionCompleta: true,
    sinAlertas: true,
  });

  // Rejection modal
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const pendingCustomers = customers.filter((c) => c.kycStatus === 'PENDING');
  const approvedCount = customers.filter(
    (c) => c.kycStatus === 'APPROVED',
  ).length;
  const rejectedCount = customers.filter(
    (c) => c.kycStatus === 'REJECTED',
  ).length;

  const filteredPending = pendingCustomers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.fullName.toLowerCase().includes(q) ||
      c.documentNumber.includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  const allChecksPassed = Object.values(checks).every(Boolean);

  const handleApprove = () => {
    if (!selectedCustomer) return;
    updateCustomerKyc(selectedCustomer.id, 'APPROVED');
  };

  const handleRejectConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !rejectionReason.trim()) return;
    updateCustomerKyc(selectedCustomer.id, 'REJECTED', rejectionReason);
    setIsRejecting(false);
    setRejectionReason('');
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Validaciones KYC (Know Your Customer)"
        subtitle="Verificación de identidad para clientes corporativos y órdenes de alto volumen."
      />

      {/* KPIs per spec #35 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Pendientes de Revisión"
          value={pendingCustomers.length}
          subtitle="Cola de expedientes"
          variant={pendingCustomers.length > 0 ? 'warning' : 'default'}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          title="Aprobadas Hoy"
          value={approvedCount}
          subtitle="Verificaciones completas"
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Rechazadas"
          value={rejectedCount}
          subtitle="Con observaciones"
          variant={rejectedCount > 0 ? 'urgent' : 'default'}
          icon={<XCircle className="w-4 h-4" />}
        />
        <MetricCard
          title="Tiempo Promedio Revisión"
          value="3.5 min"
          subtitle="Meta: < 5 min"
          variant="aqua"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      {/* Main 2-Panel Layout per spec #35 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Panel: Pending Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Solicitudes Pendientes ({pendingCustomers.length})
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              KYC Queue
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o documento..."
              className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Queue List */}
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {filteredPending.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No hay verificaciones pendientes en cola.
              </div>
            ) : (
              filteredPending.map((cust) => {
                const isSelected = selectedCustomer?.id === cust.id;
                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0F4C81] bg-sky-50/60 shadow-xs'
                        : 'border-slate-200/80 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">
                        {cust.fullName}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                        Pendiente
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-mono">
                        {cust.documentType} {cust.documentNumber}
                      </span>
                      <span>{cust.kycSubmittedAt || cust.createdAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Panel: Workspace de Revisión per spec #35 (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          {selectedCustomer ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedCustomer.fullName}
                    </h2>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${
                        selectedCustomer.kycStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : selectedCustomer.kycStatus === 'PENDING'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {selectedCustomer.kycStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    ID: {selectedCustomer.id} · Documento:{' '}
                    {selectedCustomer.documentType}{' '}
                    {selectedCustomer.documentNumber} · {selectedCustomer.email}
                  </p>
                </div>
              </div>

              {/* Documents & Selfie Inspector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Document photo */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-sky-800" />
                      Documento de Identidad Oficial
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Frente / Anverso
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[180px] bg-slate-100/50">
                    <IconPlaceholder
                      kind="document"
                      label="Documento de identidad"
                      caption="Documento de identidad"
                      className="min-h-[180px] w-full rounded-lg"
                    />
                  </div>
                </div>

                {/* Selfie Photo */}
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-sky-800" />
                      Biometría Facial (Selfie en vivo)
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Liveness OK
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-center min-h-[180px] bg-slate-100/50">
                    <IconPlaceholder
                      kind="selfie"
                      label="Selfie de verificación"
                      caption="Verificación facial"
                      className="min-h-[180px] w-full rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Data comparison */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 mb-2">
                  Datos extraídos vs Declarados
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Nombres y Apellidos
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedCustomer.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      N° Documento
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedCustomer.documentNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Teléfono
                    </span>
                    <span className="text-slate-800">
                      {selectedCustomer.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Dirección Domiciliaria
                    </span>
                    <span className="text-slate-800 truncate block">
                      {selectedCustomer.addresses[0]?.street} #
                      {selectedCustomer.addresses[0]?.number}
                    </span>
                  </div>
                </div>
              </div>

              {/* 6-Point Verification Checklist per spec #35 */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Checklist Obligatorio de Verificación (6 Puntos)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    {
                      key: 'legible',
                      label: '1. Documento legible y sin reflejos',
                    },
                    {
                      key: 'vigente',
                      label: '2. Documento vigente (no expirado)',
                    },
                    {
                      key: 'selfieMatch',
                      label: '3. Selfie consistente con la foto oficial',
                    },
                    {
                      key: 'datosConsistentes',
                      label: '4. Datos consistentes con el registro',
                    },
                    {
                      key: 'direccionCompleta',
                      label: '5. Dirección domiciliaria completa',
                    },
                    {
                      key: 'sinAlertas',
                      label: '6. Sin alertas de fraude o suplantación',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-slate-100/70"
                    >
                      <input
                        type="checkbox"
                        checked={(checks as any)[item.key]}
                        onChange={(e) =>
                          setChecks({ ...checks, [item.key]: e.target.checked })
                        }
                        className="rounded text-sky-700 focus:ring-sky-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="font-medium text-slate-800">
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions per spec #35 */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar KYC (Motivo obligatorio)
                </button>

                <button
                  type="button"
                  disabled={!allChecksPassed}
                  onClick={handleApprove}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Aprobar Validación KYC
                </button>
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-xs text-slate-400">
              Selecciona una solicitud de la lista izquierda para comenzar la
              revisión.
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Rejection Reason Modal per spec #35 */}
      {isRejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200">
            <div className="flex items-center gap-2.5 text-rose-700 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Rechazar Validación KYC
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Por regla operacional de cumplimiento, debes especificar un motivo
              claro que se notificará al cliente.
            </p>

            <form onSubmit={handleRejectConfirm} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Motivo obligatorio del rechazo *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: Foto de documento borrosa o recortada en los bordes. Reenviar documento nítido."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
