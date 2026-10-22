import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { HANDOFF_LABELS, Handoff } from '../../services/fulfillment';
import { Verification } from '../../services/HandoffService';
import { BaseMap } from '../../components/maps/BaseMap';
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  History,
  Info,
  LogIn,
  LogOut,
  PackageCheck,
  QrCode,
  ScanLine,
  Truck,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { MetricCard } from '../../components/common/MetricCard';

const button =
  'sidebar-focus inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F4C81] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0A3660] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer';
const field =
  'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-normal text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0F4C81] focus:bg-white focus:ring-2 focus:ring-[#0F4C81]/10 disabled:text-slate-400';
const tabIcons = [LogOut, Truck, History];
const statusLabels: Record<string, string> = {
  ACTIVE: 'Vigente',
  USED: 'Confirmada',
  REVOKED: 'Revocada',
  EXPIRED: 'Vencida',
};
const tabs = ['Esperando retiro', 'Transferencias chofer', 'Historial'];
export function HandoffsPage() {
  const { orders, facilities, currentUser } = useApp();
  const [tab, setTab] = useState(0);
  const [id, setId] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState<Verification | null>(null);
  const [count, setCount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [relationship, setRelationship] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [override, setOverride] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [demoDriver, setDemoDriver] = useState(false);
  const [camera, setCamera] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const locked = useRef(false);
  const state = storageService.getWorkflow();
  const facilityId = currentUser.facilityId;
  const facility = facilities.find((f) => f.id === facilityId);
  const localHandoffs = state.handoffs.filter(
    (h) => h.facilityId === facilityId,
  );
  const outgoing = localHandoffs.filter(
    (h) => h.status === 'ACTIVE' && h.type === 'FACILITY_TO_CUSTOMER',
  ).length;
  const transfers = localHandoffs.filter(
    (h) =>
      h.status === 'ACTIVE' &&
      !['CUSTOMER_TO_FACILITY', 'FACILITY_TO_CUSTOMER'].includes(h.type),
  ).length;
  const visible = state.handoffs.filter(
    (h) =>
      h.facilityId === facilityId &&
      (tab === 2
        ? true
        : h.status === 'ACTIVE' &&
          (tab === 0
            ? h.type === 'FACILITY_TO_CUSTOMER'
            : !['CUSTOMER_TO_FACILITY', 'FACILITY_TO_CUSTOMER'].includes(
                h.type,
              ))),
  );
  const selected =
    state.handoffs.find((h) => h.id === id && h.facilityId === facilityId) ??
    visible[0];
  const order = orders.find((o) => o.id === selected?.orderId);
  const leg =
    order &&
    selected &&
    (['CUSTOMER_TO_DRIVER', 'DRIVER_TO_FACILITY'].includes(selected.type)
      ? order.fulfillment?.inbound
      : order.fulfillment?.outbound);
  const isDriver =
    selected &&
    ['CUSTOMER_TO_DRIVER', 'DRIVER_TO_CUSTOMER'].includes(selected.type);
  const actorId =
    override && verified
      ? currentUser.id
      : demoDriver && isDriver
        ? leg?.driverId
        : currentUser.id;
  function verify(value = code) {
    setError('');
    setMessage('');
    setCamera(false);
    try {
      if (!actorId) throw new Error('No hay chofer asignado.');
      setVerified(
        storageService.handoffService.verify(value, actorId, selected?.id),
      );
    } catch (e) {
      setVerified(null);
      setError((e as Error).message);
    }
  }
  function run(work: () => void) {
    setError('');
    setMessage('');
    try {
      work();
      setVerified(null);
      setChecked(false);
      setMessage('Acción registrada en esta demo local.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!camera || !video.current) return;
    let cancelled = false;
    let controls: { stop(): void } | undefined;
    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(
          undefined,
          video.current!,
          (result) => {
            if (!result || locked.current) return;
            locked.current = true;
            const value = result.getText();
            setCode(value);
            verify(value);
          },
        );
        if (cancelled) controls.stop();
      })
      .catch(() => {
        if (!cancelled) {
          setCamera(false);
          setError(
            'No se pudo abrir la cámara. Revisa el permiso y usa el código manual; la cámara requiere HTTPS o localhost.',
          );
        }
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [camera]);
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Recepción y retiros"
        subtitle="Verifica el código, revisa las prendas y confirma su entrega física."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          title="Esperando retiro"
          value={outgoing}
          subtitle="Entregas pendientes al cliente"
          variant="aqua"
          icon={<PackageCheck className="size-4" />}
        />
        <MetricCard
          title="Transferencias chofer"
          value={transfers}
          subtitle="Movimientos pendientes con chofer"
          variant="default"
          icon={<Truck className="size-4" />}
        />
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="size-4 shrink-0 text-[#0F4C81]" aria-hidden="true" />
          Modo demo · transferencias con datos de demostración.
        </p>
        <label className="min-w-0 w-full text-xs font-semibold text-slate-600 sm:w-auto sm:min-w-64">
          <span className="flex items-center gap-1.5">
            <Building2 className="size-3.5" aria-hidden="true" />
            Sede de operación
          </span>
          <select
            aria-label="Sede de operación"
            className={field}
            value={facilityId ?? ''}
            disabled={currentUser.role !== 'ADMIN'}
            onChange={(e) => {
              storageService.setCurrentUser({
                ...currentUser,
                facilityId: e.target.value,
              });
              setId('');
              setVerified(null);
              setCode('');
            }}
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        role="tablist"
        aria-label="Etapas de recepción y retiro"
        className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xs"
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={tab === i}
            className={
              tab === i
                ? button
                : 'sidebar-focus flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#0F4C81] cursor-pointer'
            }
            onClick={() => {
              setTab(i);
              setId('');
              setVerified(null);
              setCode('');
              setChecked(false);
              setDemoDriver(false);
            }}
          >
            {React.createElement(tabIcons[i], {
              className: 'size-4',
              'aria-hidden': true,
            })}
            {label}
          </button>
        ))}
      </div>
      <div className="grid items-start lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-[#102A43]">
              <ClipboardList
                className="size-4 text-[#0F4C81]"
                aria-hidden="true"
              />
              Transferencias
            </h2>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
              {visible.length}
            </span>
          </div>
          <div className="max-h-[650px] space-y-2 overflow-y-auto p-3">
            {visible.length === 0 && (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                No hay transferencias en esta etapa.
              </div>
            )}
            {visible.map((h) => (
              <button
                key={h.id}
                className={`sidebar-focus w-full text-left rounded-xl border p-4 transition-colors cursor-pointer ${selected?.id === h.id ? 'border-[#0F4C81] bg-[#F0F6FC] ring-1 ring-[#0F4C81]/10' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                aria-pressed={selected?.id === h.id}
                onClick={() => {
                  setId(h.id);
                  setCode('');
                  setVerified(null);
                  setChecked(false);
                  setDemoDriver(false);
                  setCamera(false);
                }}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="font-mono text-xs text-[#0F4C81]">
                    {h.orderId}
                  </strong>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${h.status === 'ACTIVE' ? 'bg-sky-100 text-sky-800' : h.status === 'USED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {statusLabels[h.status] ?? h.status}
                  </span>
                </span>
                <span className="block text-xs font-medium text-slate-700 mt-2">
                  {HANDOFF_LABELS[h.type]}
                </span>
                <span className="mt-1 block text-[11px] text-slate-400">
                  Versión del código · {h.generation}
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className="space-y-5">
          {selected && order && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <h2 className="flex items-center gap-2 text-base font-bold text-[#102A43]">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-[#F0F6FC] text-[#0F4C81]">
                      <PackageCheck className="size-5" aria-hidden="true" />
                    </span>
                    {HANDOFF_LABELS[selected.type]}
                  </h2>
                  <Link
                    className="sidebar-focus flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-[#0F4C81] hover:bg-slate-200"
                    to={'/operations/orders/' + order.id}
                  >
                    Ver {order.id}
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
                <p className="rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
                  {order.customerName} ·{' '}
                  {order.fulfillment?.mode === 'HOME_STORE'
                    ? 'Pick up · recogida a domicilio y retiro en sede'
                    : 'Recogida y entrega a domicilio'}{' '}
                  · {order.items.reduce((n, i) => n + i.quantity, 0)} prendas
                  declaradas
                </p>
                {order.intakeHold && !order.intakeHold.resolvedAt && (
                  <div className="rounded-xl bg-red-50 p-4 space-y-3">
                    <strong className="text-sm text-red-800">
                      Procesamiento y salida bloqueados por diferencia de
                      prendas
                    </strong>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {order.intakeHold.description}
                    </p>
                    <input
                      aria-label="Resolución de incidencia"
                      placeholder="Resolución y motivo"
                      className={field}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <button
                      className={button}
                      onClick={() =>
                        run(() =>
                          storageService.handoffService.resolve(
                            order.id,
                            currentUser.id,
                            reason,
                          ),
                        )
                      }
                    >
                      Resolver incidencia
                    </button>
                  </div>
                )}
                {(tab !== 3 || verified) && (
                  <div className="space-y-4 rounded-2xl border border-slate-200 p-4 sm:p-5">
                    <h3 className="flex items-center gap-2 text-sm font-bold text-[#102A43]">
                      <ScanLine
                        className="size-4 text-[#0F4C81]"
                        aria-hidden="true"
                      />
                      Verificar transferencia
                    </h3>
                    {isDriver && (
                      <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                        <input
                          type="checkbox"
                          className="mt-0.5 size-4 shrink-0 accent-[#0F4C81]"
                          checked={demoDriver}
                          onChange={(e) => {
                            setDemoDriver(e.target.checked);
                            setVerified(null);
                          }}
                        />
                        Control demo: representar al chofer asignado{' '}
                        {leg?.driverId}
                      </label>
                    )}
                    <label className="block text-xs font-semibold text-slate-600">
                      Código de 6 dígitos o contenido QR
                      <input
                        aria-label="Código de transferencia"
                        className={field}
                        value={code}
                        onChange={(e) => {
                          setCode(e.target.value);
                          setVerified(null);
                          setChecked(false);
                        }}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={button}
                        disabled={!code.trim() || (!!isDriver && !demoDriver)}
                        onClick={() => verify()}
                      >
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Verificar código
                      </button>
                      <button
                        className="sidebar-focus inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-[#0F4C81] hover:bg-slate-50"
                        onClick={() => {
                          locked.current = false;
                          setCamera(true);
                        }}
                      >
                        <QrCode className="size-4" aria-hidden="true" />
                        Escanear QR
                      </button>
                      <button
                        className="sidebar-focus rounded-xl px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
                        onClick={() => {
                          setCode(selected.fallbackCode);
                          setVerified(null);
                        }}
                      >
                        Demo: cargar código preparado
                      </button>
                    </div>
                    {camera && (
                      <div>
                        <video
                          ref={video}
                          className="w-full max-h-72 rounded-xl"
                        />
                        <button
                          className={button}
                          onClick={() => setCamera(false)}
                        >
                          Cerrar cámara
                        </button>
                      </div>
                    )}
                    {verified && (
                      <div className="space-y-4 border-t border-slate-200 pt-4">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-[#102A43]">
                          <CheckCircle2
                            className="size-4 text-emerald-600"
                            aria-hidden="true"
                          />
                          Revisión y confirmación
                        </h3>
                        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">
                          {verified.warning}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {[
                            'CUSTOMER_TO_FACILITY',
                            'CUSTOMER_TO_DRIVER',
                            'DRIVER_TO_FACILITY',
                          ].includes(verified.handoff.type) && (
                            <label className="text-xs leading-relaxed text-slate-600">
                              Prendas recibidas
                              <input
                                aria-label="Prendas recibidas"
                                type="number"
                                min="1"
                                className={field}
                                value={count}
                                onChange={(e) => setCount(e.target.value)}
                              />
                            </label>
                          )}
                          {[
                            'DRIVER_TO_CUSTOMER',
                            'FACILITY_TO_CUSTOMER',
                          ].includes(verified.handoff.type) && (
                            <>
                              <label className="text-xs leading-relaxed text-slate-600">
                                Nombre de quien retira
                                <input
                                  aria-label="Nombre de quien retira"
                                  className={field}
                                  value={recipient}
                                  onChange={(e) => setRecipient(e.target.value)}
                                />
                              </label>
                              <label className="text-xs leading-relaxed text-slate-600">
                                Relación o autorización
                                <input
                                  aria-label="Relación o autorización"
                                  className={field}
                                  value={relationship}
                                  onChange={(e) =>
                                    setRelationship(e.target.value)
                                  }
                                />
                              </label>
                            </>
                          )}
                        </div>
                        <label className="block text-xs font-medium text-slate-600">
                          Observaciones
                          <textarea
                            className={field}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </label>
                        <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 shrink-0 accent-[#0F4C81]"
                            checked={checked}
                            onChange={(e) => setChecked(e.target.checked)}
                          />
                          Verifiqué las prendas y confirmo la entrega física
                        </label>
                        {currentUser.role === 'ADMIN' && (
                          <>
                            <label className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                              <input
                                type="checkbox"
                                className="mt-0.5 size-4 shrink-0 accent-[#0F4C81]"
                                checked={override}
                                onChange={(e) => setOverride(e.target.checked)}
                              />
                              Registrar como override administrativo
                            </label>
                            {override && (
                              <input
                                aria-label="Motivo del override"
                                className={field}
                                placeholder="Motivo obligatorio"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                              />
                            )}
                          </>
                        )}
                        <button
                          className={button}
                          disabled={
                            !checked || (override && reason.trim().length < 5)
                          }
                          onClick={() =>
                            run(() =>
                              storageService.handoffService.confirm(actorId!, {
                                ticket: verified.ticket,
                                count: count ? Number(count) : undefined,
                                recipient,
                                relationship,
                                notes,
                                overrideReason: override ? reason : undefined,
                              }),
                            )
                          }
                        >
                          Confirmar transferencia
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {tab === 3 && (
                  <>
                    <p className="text-sm text-slate-500">
                      Registro: {selected.usedAt ?? selected.updatedAt} ·
                      Operador: {selected.usedByUserId ?? '—'}
                    </p>
                    {selected.receipt && (
                      <p className="text-xs leading-relaxed text-slate-600">
                        Recibidas: {selected.receipt.count ?? '—'} ·
                        Destinatario: {selected.receipt.recipient ?? '—'} ·{' '}
                        {selected.receipt.relationship} ·{' '}
                        {selected.receipt.notes}
                      </p>
                    )}
                    {state.handoffAudits
                      .filter((a) => a.handoffId === selected.id)
                      .map((a) => (
                        <p className="text-xs text-slate-500" key={a.id}>
                          {a.at} · {a.action} · {a.actorRole} · {a.reason}
                        </p>
                      ))}
                  </>
                )}
                {currentUser.role === 'ADMIN' &&
                  !['USED', 'REVOKED'].includes(selected.status) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <h3 className="text-xs font-semibold text-slate-600">
                        Gestión administrativa del código
                      </h3>
                      <input
                        aria-label="Motivo administrativo"
                        className={field}
                        placeholder="Motivo para revocar o regenerar"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={button}
                          onClick={() =>
                            run(() => {
                              storageService.handoffService.regenerate(
                                selected.id,
                                currentUser.id,
                                reason,
                              );
                              setId('');
                              setCode('');
                            })
                          }
                        >
                          Regenerar código
                        </button>
                        <button
                          className="sidebar-focus rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                          onClick={() =>
                            run(() =>
                              storageService.handoffService.revoke(
                                selected.id,
                                currentUser.id,
                                reason,
                              ),
                            )
                          }
                        >
                          Revocar código
                        </button>
                        <button
                          className="sidebar-focus rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer"
                          onClick={() => {
                            try {
                              setVerified(
                                storageService.handoffService.verifyAdministrativeOverride(
                                  selected.id,
                                  currentUser.id,
                                  reason,
                                ),
                              );
                              setOverride(true);
                              setChecked(false);
                              setError('');
                            } catch (e) {
                              setError((e as Error).message);
                            }
                          }}
                        >
                          Verificar override administrativo
                        </button>
                      </div>
                    </div>
                  )}
              </div>
              {facility && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[#102A43] mb-3">
                    <Building2
                      className="size-4 text-[#0F4C81]"
                      aria-hidden="true"
                    />
                    {facility.name}
                  </h3>
                  <BaseMap
                    height={250}
                    center={facility.coordinates}
                    points={[
                      {
                        id: facility.id,
                        label: facility.name,
                        kind: 'facility',
                        coordinates: facility.coordinates,
                      },
                    ]}
                  />
                </div>
              )}
              {tab !== 3 && selected.status === 'ACTIVE' && (
                <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <summary className="text-xs font-semibold text-[#0F4C81] cursor-pointer">
                    Demo: código que presenta el cliente o chofer
                  </summary>
                  <div className="bg-white p-6 w-fit">
                    <QRCode
                      value={storageService.handoffService.payload(selected)}
                      size={170}
                    />
                  </div>
                  <p className="text-xl font-bold tracking-widest">
                    {selected.fallbackCode}
                  </p>
                  <p className="text-sm text-slate-500">
                    Un solo uso; vigente hasta confirmar la entrega física.
                  </p>
                </details>
              )}
            </>
          )}
          {!!error && (
            <p
              role="alert"
              className="bg-red-50 text-red-800 p-4 rounded-xl text-sm"
            >
              {error}
            </p>
          )}
          {!!message && (
            <p
              role="status"
              className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm"
            >
              {message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
