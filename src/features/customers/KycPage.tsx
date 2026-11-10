import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
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

  // Al elegir una solicitud se carga su ficha y sus tres imágenes con la sesión.
  useEffect(() => {
    setDetail(null);
    setImages({});
    setEnlarged(null);
    setChecks(NO_CHECKS);
    if (!selectedId) return;
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
      }
    })();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
    // showToast cambia en cada render del contexto; solo importa el cliente elegido.
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

  return (
    <div className="space-y-8">
      <PageHeader
        title="Validaciones KYC (Know Your Customer)"
        subtitle="Revisión de la selfie y la cédula de los clientes registrados antes de habilitar su cuenta."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <MetricCard
          title="Pendientes de Revisión"
          value={lists.PENDING.length}
          subtitle="Cola de expedientes"
          variant={lists.PENDING.length > 0 ? 'warning' : 'default'}
          icon={<Clock className="w-4 h-4" />}
        />
        <MetricCard
          title="Aprobadas"
          value={lists.APPROVED.length}
          subtitle="Clientes habilitados"
          variant="success"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <MetricCard
          title="Rechazadas"
          value={lists.REJECTED.length}
          subtitle="Con observaciones"
          variant={lists.REJECTED.length > 0 ? 'urgent' : 'default'}
          icon={<XCircle className="w-4 h-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-4">
          <div
            role="tablist"
            aria-label="Estado de la verificación"
            className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl"
          >
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => {
                  setTab(item.id);
                  setSelectedId('');
                }}
                className={`py-1.5 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                  tab === item.id
                    ? 'bg-white text-[#0F4C81] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label} ({lists[item.id].length})
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o cédula..."
              aria-label="Buscar verificación"
              className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Cargando verificaciones...
              </div>
            ) : loadError ? (
              <div
                role="alert"
                className="py-6 text-center text-xs text-rose-700 space-y-2"
              >
                <p>{loadError}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="px-3 py-1.5 font-bold text-[#0F4C81] border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Reintentar
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                {tab === 'PENDING'
                  ? 'No hay verificaciones pendientes en cola.'
                  : 'No hay solicitudes en este estado.'}
              </div>
            ) : (
              visible.map((cust) => (
                <button
                  key={cust.id}
                  type="button"
                  onClick={() => setSelectedId(cust.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedId === cust.id
                      ? 'border-[#0F4C81] bg-sky-50/60 shadow-xs'
                      : 'border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {cust.user.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${STATUS_STYLE[cust.kycStatus]}`}
                    >
                      {STATUS_LABEL[cust.kycStatus]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                    <span className="font-mono">
                      Cédula {cust.kycDocumentNumber ?? '-'}
                    </span>
                    <span>{formatDate(cust.updatedAt)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-6">
          {!selectedId ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Selecciona una solicitud de la lista para comenzar la revisión.
            </div>
          ) : !detail ? (
            <div className="py-16 text-center text-xs text-slate-400">
              Cargando expediente...
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">
                      {detail.user.name}
                    </h2>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md border ${STATUS_STYLE[detail.kycStatus]}`}
                    >
                      {STATUS_LABEL[detail.kycStatus]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Envío n.º {detail.kycSubmissions} · Actualizado{' '}
                    {formatDate(detail.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DOCUMENTS.map((doc) => {
                  const src = images[doc.type];
                  return (
                    <div
                      key={doc.type}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                    >
                      <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                        <doc.Icon className="w-3.5 h-3.5 text-sky-800 shrink-0" />
                        <span className="truncate">{doc.title}</span>
                      </div>
                      <div className="p-3 flex items-center justify-center min-h-[200px] bg-slate-100/50">
                        {src && src !== 'error' ? (
                          <button
                            type="button"
                            onClick={() => setEnlarged(doc.type)}
                            aria-label={`Ampliar ${doc.title}`}
                            className="w-full cursor-zoom-in"
                          >
                            <img
                              src={src}
                              alt={doc.title}
                              className="w-full max-h-64 object-contain rounded-lg"
                            />
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
                            className="min-h-[180px] w-full rounded-lg"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 mb-2">
                  Datos declarados por el cliente
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Nombre
                    </span>
                    <span className="font-semibold text-slate-800">
                      {detail.user.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      N.º de cédula
                    </span>
                    <span className="font-mono font-semibold text-slate-800">
                      {detail.kycDocumentNumber ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Teléfono
                    </span>
                    <span className="text-slate-800">
                      {detail.user.phone ?? '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">
                      Correo
                    </span>
                    <span className="text-slate-800 truncate block">
                      {detail.user.email}
                    </span>
                  </div>
                </div>
              </div>

              {detail.kycStatus === 'REJECTED' && detail.kycRejectionReason && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
                  <span className="font-bold block mb-0.5">
                    Motivo del rechazo
                  </span>
                  {detail.kycRejectionReason}
                </div>
              )}

              {reviewable && (
                <>
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Checklist de verificación
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {CHECKS.map((item, index) => (
                        <label
                          key={item.key}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-slate-100/70"
                        >
                          <input
                            type="checkbox"
                            checked={checks[item.key]}
                            onChange={(e) =>
                              setChecks({
                                ...checks,
                                [item.key]: e.target.checked,
                              })
                            }
                            className="rounded text-sky-700 focus:ring-sky-600 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-medium text-slate-800">
                            {index + 1}. {item.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setIsRejecting(true)}
                      className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar (motivo obligatorio)
                    </button>
                    <button
                      type="button"
                      disabled={!allChecksPassed || busy}
                      onClick={() => void finish(true)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Aprobar verificación
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {enlarged && images[enlarged] && images[enlarged] !== 'error' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Imagen ampliada"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80"
          onClick={() => setEnlarged(null)}
        >
          <button
            type="button"
            aria-label="Cerrar imagen"
            onClick={() => setEnlarged(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white text-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={images[enlarged] as string}
            alt={DOCUMENTS.find((d) => d.type === enlarged)?.title}
            className="max-h-full max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {isRejecting && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.16 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
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
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
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
