import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';
import { IconPlaceholder } from '../../components/common/IconPlaceholder';
import {
  fetchKycDocumentUrl,
  getKycDetail,
  listKyc,
  refreshPendingKyc,
  reviewKyc,
  type KycDetail,
  type KycDocumentType,
  type KycRequest,
  type KycStatus,
} from '../../services/api/kycApi';

type Tab = Extract<KycStatus, 'PENDING' | 'APPROVED' | 'REJECTED'>;

const TABS: { id: Tab; label: string }[] = [
  { id: 'PENDING', label: 'Pendientes' },
  { id: 'APPROVED', label: 'Aprobadas' },
  { id: 'REJECTED', label: 'Rechazadas' },
];

const STATUS_STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-50 text-rose-800 border-rose-200',
};
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

const DOCUMENTS: {
  type: KycDocumentType;
  title: string;
  caption: string;
  kind: 'selfie' | 'document';
  Icon: typeof User;
}[] = [
  {
    type: 'SELFIE',
    title: 'Selfie de verificación facial',
    caption: 'Rostro del cliente',
    kind: 'selfie',
    Icon: User,
  },
  {
    type: 'ID_FRONT',
    title: 'Cédula, lado frontal',
    caption: 'Frente del documento',
    kind: 'document',
    Icon: FileText,
  },
  {
    type: 'ID_BACK',
    title: 'Cédula, lado posterior',
    caption: 'Reverso del documento',
    kind: 'document',
    Icon: FileText,
  },
];

const CHECKS = [
  { key: 'legible', label: 'Las imágenes son legibles y sin reflejos' },
  { key: 'vigente', label: 'La cédula está vigente' },
  { key: 'selfieMatch', label: 'La selfie coincide con la foto de la cédula' },
  {
    key: 'numberMatch',
    label: 'El número digitado coincide con el de la cédula',
  },
] as const;
type CheckKey = (typeof CHECKS)[number]['key'];
const NO_CHECKS: Record<CheckKey, boolean> = {
  legible: false,
  vigente: false,
  selfieMatch: false,
  numberMatch: false,
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '-';

export const KycPage: React.FC = () => {
  const { currentUser } = useApp();
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
  return <KycReview />;
};

const KycReview: React.FC = () => {
  const { showToast } = useApp();
  const [tab, setTab] = useState<Tab>('PENDING');
  const [lists, setLists] = useState<Record<Tab, KycRequest[]>>({
    PENDING: [],
    APPROVED: [],
    REJECTED: [],
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<KycDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [images, setImages] = useState<
    Partial<Record<KycDocumentType, string | 'error'>>
  >({});
  const [enlarged, setEnlarged] = useState<KycDocumentType | null>(null);
  const [checks, setChecks] = useState(NO_CHECKS);
  const [busy, setBusy] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [PENDING, APPROVED, REJECTED] = await Promise.all([
        listKyc('PENDING'),
        listKyc('APPROVED'),
        listKyc('REJECTED'),
      ]);
      setLists({ PENDING, APPROVED, REJECTED });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'No se pudo cargar la cola de verificaciones.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Al elegir una solicitud se carga su ficha y sus tres imágenes en el modal
  useEffect(() => {
    setDetail(null);
    setImages({});
    setEnlarged(null);
    setChecks(NO_CHECKS);
    if (!selectedId) {
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    let cancelled = false;
    const urls: string[] = [];
    (async () => {
      try {
        const data = await getKycDetail(selectedId);
        if (cancelled) return;
        setDetail(data);
        await Promise.all(
          data.documents.map(async (doc) => {
            try {
              const url = await fetchKycDocumentUrl(selectedId, doc.type);
              if (cancelled) return URL.revokeObjectURL(url);
              urls.push(url);
              setImages((prev) => ({ ...prev, [doc.type]: url }));
            } catch {
              if (!cancelled)
                setImages((prev) => ({ ...prev, [doc.type]: 'error' }));
            }
          }),
        );
      } catch (error) {
        if (!cancelled)
          showToast({
            type: 'error',
            title: 'No se pudo abrir la verificación',
            message: error instanceof Error ? error.message : undefined,
          });
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const visible = lists[tab].filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.user.name.toLowerCase().includes(q) ||
      c.user.email.toLowerCase().includes(q) ||
      (c.kycDocumentNumber ?? '').includes(q)
    );
  });

  const reviewable = detail?.kycStatus === 'PENDING';
  const allChecksPassed = Object.values(checks).every(Boolean);

  const finish = async (approve: boolean, reason?: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await reviewKyc(detail.id, approve, reason);
      showToast({
        type: approve ? 'success' : 'error',
        title: approve ? 'Verificación aprobada' : 'Verificación rechazada',
        message: approve
          ? `${detail.user.name} ya puede operar en la aplicación.`
          : 'Se notificó al cliente el motivo del rechazo.',
      });
      setIsRejecting(false);
      setRejectionReason('');
      setSelectedId('');
      await Promise.all([load(), refreshPendingKyc()]);
    } catch (error) {
      showToast({
        type: 'error',
        title: 'No se pudo registrar la decisión',
        message: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRejectConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;
    void finish(false, rejectionReason.trim());
  };

  const closeModal = () => {
    if (busy) return;
    setSelectedId('');
    setIsRejecting(false);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Validaciones KYC (Know Your Customer)"
        subtitle="Revisión de la selfie y la cédula de los clientes registrados antes de habilitar su cuenta."
      />

      {/* Contenedor principal a todo el ancho (Full width table) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
          <div
            role="tablist"
            aria-label="Estado de la verificación"
            className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl flex-1 max-w-2xl relative"
          >
            {TABS.map((item) => {
              const active = tab === item.id;
              const count = lists[item.id].length;

              // Configuración de color temático según el estado
              const activeStyle =
                item.id === 'PENDING'
                  ? 'bg-amber-100/90 text-amber-900 border-amber-300/80 shadow-xs ring-1 ring-amber-200/60'
                  : item.id === 'APPROVED'
                  ? 'bg-emerald-100/90 text-emerald-900 border-emerald-300/80 shadow-xs ring-1 ring-emerald-200/60'
                  : 'bg-rose-100/90 text-rose-900 border-rose-300/80 shadow-xs ring-1 ring-rose-200/60';

              const badgeActiveStyle =
                item.id === 'PENDING'
                  ? 'bg-amber-200/90 text-amber-900'
                  : item.id === 'APPROVED'
                  ? 'bg-emerald-200/90 text-emerald-900'
                  : 'bg-rose-200/90 text-rose-900';

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setTab(item.id);
                    setSelectedId('');
                  }}
                  className={`relative flex-1 flex items-center justify-center gap-2.5 px-5 py-2.5 text-xs font-semibold rounded-xl border transition-colors duration-150 cursor-pointer whitespace-nowrap ${
                    active
                      ? `${activeStyle} font-bold`
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`px-2 py-0.5 text-[11px] font-bold rounded-full transition-colors duration-150 ${
                      active
                        ? badgeActiveStyle
                        : 'bg-slate-200/70 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative w-full lg:w-80 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o cédula..."
              aria-label="Buscar verificación"
              className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Tabla amplia de solicitudes */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">N.º de Cédula</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Última actualización</th>
                <th className="py-3 px-4">Estado</th>
                <th className={`py-3 px-4 ${tab === 'REJECTED' ? 'text-left min-w-[240px]' : 'text-right'}`}>
                  {tab === 'REJECTED' ? 'Motivo de rechazo' : 'Acción'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Cargando verificaciones...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-rose-700">
                    <p className="mb-2">{loadError}</p>
                    <button
                      type="button"
                      onClick={() => void load()}
                      className="px-3 py-1 font-bold text-[#0F4C81] border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      Reintentar
                    </button>
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 italic">
                    {searchQuery
                      ? 'No se encontraron resultados con ese criterio de búsqueda.'
                      : tab === 'PENDING'
                      ? 'No hay verificaciones pendientes en cola.'
                      : 'No hay solicitudes en este estado.'}
                  </td>
                </tr>
              ) : (
                visible.map((cust) => (
                  <tr
                    key={cust.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-sky-50 text-[#0F4C81] border border-sky-100 flex items-center justify-center font-bold text-xs shrink-0">
                          {cust.user.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate max-w-[200px]">
                          {cust.user.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {cust.kycDocumentNumber ?? '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 truncate max-w-[200px]">
                      {cust.user.email}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {cust.user.phone ?? '-'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(cust.updatedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[cust.kycStatus]}`}
                      >
                        {STATUS_LABEL[cust.kycStatus]}
                      </span>
                    </td>
                    <td className={`py-3.5 px-4 ${tab === 'REJECTED' ? 'text-left' : 'text-right'}`}>
                      {tab === 'REJECTED' ? (
                        <div className="flex items-center justify-between gap-3">
                          <span
                            className="text-xs text-rose-800 bg-rose-50/80 border border-rose-200/80 px-2.5 py-1 rounded-lg line-clamp-1 max-w-[280px]"
                            title={cust.kycRejectionReason ?? 'Sin motivo registrado'}
                          >
                            {cust.kycRejectionReason ?? 'Sin motivo registrado'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedId(cust.id)}
                            title="Ver expediente"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedId(cust.id)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            cust.kycStatus === 'PENDING'
                              ? 'bg-[#0F4C81] text-white hover:bg-[#0c3c66] shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {cust.kycStatus === 'PENDING' ? 'Revisar' : 'Ver detalle'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Revisión y Verificación de Documentos */}
      <AnimatePresence>
        {selectedId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh]"
            >
              {/* Header del modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-sky-100/70 text-[#0F4C81]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Revisión de Solicitud KYC
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verificación de identidad y documentos oficiales
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Cerrar modal"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido con scroll */}
              <div className="overflow-y-auto p-6 space-y-6 flex-1">
                {detailLoading || !detail ? (
                  <div className="py-20 text-center text-xs text-slate-400">
                    Cargando expediente y documentos del cliente...
                  </div>
                ) : (
                  <>
                    {/* Ficha superior del cliente */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">
                            {detail.user.name}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${STATUS_STYLE[detail.kycStatus]}`}
                          >
                            {STATUS_LABEL[detail.kycStatus]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Envío n.º {detail.kycSubmissions} · Actualizado {formatDate(detail.updatedAt)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Cédula</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {detail.kycDocumentNumber ?? '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Teléfono</span>
                          <span className="font-medium text-slate-800">
                            {detail.user.phone ?? '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Correo</span>
                          <span className="font-medium text-slate-800 truncate block max-w-[150px]">
                            {detail.user.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Galería de Documentos en 3 columnas amplias */}
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">
                        Documentos Cargados
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {DOCUMENTS.map((doc) => {
                          const src = images[doc.type];
                          return (
                            <div
                              key={doc.type}
                              className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col"
                            >
                              <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                                <div className="flex items-center gap-1.5 truncate">
                                  <doc.Icon className="w-3.5 h-3.5 text-sky-800 shrink-0" />
                                  <span className="truncate">{doc.title}</span>
                                </div>
                              </div>
                              <div className="p-3 flex items-center justify-center min-h-[220px] max-h-[260px] bg-slate-100/50 flex-1">
                                {src && src !== 'error' ? (
                                  <button
                                    type="button"
                                    onClick={() => setEnlarged(doc.type)}
                                    aria-label={`Ampliar ${doc.title}`}
                                    className="w-full h-full flex flex-col items-center justify-center cursor-zoom-in group relative"
                                  >
                                    <img
                                      src={src}
                                      alt={doc.title}
                                      className="max-h-48 w-full object-contain rounded-lg group-hover:opacity-95 transition-opacity"
                                    />
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                      <ExternalLink className="w-3 h-3" />
                                    </span>
                                  </button>
                                ) : src === 'error' ? (
                                  <p role="alert" className="text-xs text-rose-700">
                                    No se pudo cargar la imagen.
                                  </p>
                                ) : (
                                  <IconPlaceholder
                                    kind={doc.kind}
                                    label={doc.title}
                                    caption="Cargando imagen..."
                                    className="min-h-[190px] w-full rounded-lg"
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Motivo de rechazo previo si aplica */}
                    {detail.kycStatus === 'REJECTED' && detail.kycRejectionReason && (
                      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
                        <span className="font-bold block mb-0.5">
                          Motivo del rechazo anterior
                        </span>
                        {detail.kycRejectionReason}
                      </div>
                    )}

                    {/* Checklist si está en PENDING */}
                    {reviewable && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-xs text-slate-900 tracking-wide">
                            Checklist de validación
                          </h5>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {Object.values(checks).filter(Boolean).length} de {CHECKS.length} verificados
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {CHECKS.map((item, index) => {
                            const isChecked = checks[item.key];
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() =>
                                  setChecks({
                                    ...checks,
                                    [item.key]: !isChecked,
                                  })
                                }
                                className={`group flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                                  isChecked
                                    ? 'bg-sky-50/70 border-sky-300/80 shadow-xs ring-1 ring-sky-200'
                                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs'
                                }`}
                              >
                                <span
                                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                                    isChecked
                                      ? 'bg-[#0F4C81] border-[#0F4C81] text-white shadow-2xs'
                                      : 'bg-white border-slate-300 group-hover:border-slate-400 text-transparent'
                                  }`}
                                >
                                  <Check className="size-3.5 stroke-[3]" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span
                                    className={`block text-xs font-semibold leading-relaxed transition-colors ${
                                      isChecked
                                        ? 'text-sky-950 font-bold'
                                        : 'text-slate-700 group-hover:text-slate-900'
                                    }`}
                                  >
                                    <span className="text-slate-400 font-normal mr-1.5">
                                      {index + 1}.
                                    </span>
                                    {item.label}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer con acciones */}
              {reviewable && detail && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setIsRejecting(true)}
                    className="px-4 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={!allChecksPassed || busy}
                    onClick={() => void finish(true)}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    Aprobar verificación
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de ampliación individual de imagen */}
      {enlarged && images[enlarged] && images[enlarged] !== 'error' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs"
          onClick={() => setEnlarged(null)}
        >
          <button
            type="button"
            aria-label="Cerrar imagen"
            onClick={() => setEnlarged(null)}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-white text-slate-800 shadow-md cursor-pointer hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={images[enlarged] as string}
            alt={DOCUMENTS.find((d) => d.type === enlarged)?.title}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl bg-white"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal de confirmación de rechazo */}
      {isRejecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Rechazar verificación"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200"
          >
            <div className="flex items-center gap-2.5 text-rose-700 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Rechazar verificación
              </h3>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Indica un motivo claro: se enviará al cliente para que pueda
              corregir y volver a enviar sus documentos.
            </p>
            <form onSubmit={handleRejectConfirm} className="space-y-4 text-xs">
              <div>
                <label
                  htmlFor="kyc-reject-reason"
                  className="block font-semibold text-slate-700 mb-1"
                >
                  Motivo del rechazo *
                </label>
                <textarea
                  id="kyc-reject-reason"
                  required
                  rows={3}
                  maxLength={300}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Ej: La foto de la cédula está borrosa. Envía una imagen nítida de ambos lados."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy || !rejectionReason.trim()}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white font-bold rounded-lg cursor-pointer"
                >
                  Confirmar rechazo
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
