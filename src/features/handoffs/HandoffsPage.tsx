import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import { HANDOFF_LABELS, Handoff } from '../../services/fulfillment';
import { Verification } from '../../services/HandoffService';
import { BaseMap } from '../../components/maps/BaseMap';

const button =
  'rounded-xl bg-[#0F4C81] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 cursor-pointer';
const field =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm';
const tabs = [
  'Esperando ingreso',
  'Esperando retiro',
  'Transferencias chofer',
  'Historial',
];
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
  const visible = state.handoffs.filter(
    (h) =>
      h.facilityId === facilityId &&
      (tab === 3
        ? true
        : h.status === 'ACTIVE' &&
          (tab === 0
            ? h.type === 'CUSTOMER_TO_FACILITY'
            : tab === 1
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Recepción y retiros
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Verifica el código, revisa las prendas y confirma su entrega física.
        </p>
      </div>
      <div className="rounded-2xl bg-blue-50 border border-blue-100 p-4 flex flex-wrap gap-4 items-center justify-between">
        <p className="text-sm text-blue-900">
          Demo local · los escenarios de Expo y Web funcionan de forma
          independiente.
        </p>
        <label className="text-sm font-semibold">
          Sede de operación
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
      <div role="tablist" className="flex flex-wrap gap-2">
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={tab === i}
            className={
              tab === i
                ? button
                : 'rounded-xl px-4 py-2.5 bg-white border border-slate-200 text-sm cursor-pointer'
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
            {label}
          </button>
        ))}
      </div>
      <div className="grid xl:grid-cols-[350px_1fr] gap-6">
        <aside className="space-y-3">
          {visible.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-500">
              No hay transferencias en esta etapa.
            </div>
          )}
          {visible.map((h) => (
            <button
              key={h.id}
              className={`w-full text-left rounded-2xl border bg-white p-4 cursor-pointer ${selected?.id === h.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
              onClick={() => {
                setId(h.id);
                setCode('');
                setVerified(null);
                setChecked(false);
                setDemoDriver(false);
                setCamera(false);
              }}
            >
              <strong className="block text-sm">{h.orderId}</strong>
              <span className="block text-sm text-slate-500 mt-1">
                {HANDOFF_LABELS[h.type]}
              </span>
              <span className="text-xs text-slate-500">
                {h.status} · generación {h.generation}
              </span>
            </button>
          ))}
        </aside>
        <section className="space-y-5">
          {selected && order && (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <h2 className="text-lg font-bold">
                    {HANDOFF_LABELS[selected.type]}
                  </h2>
                  <Link
                    className="text-sm text-blue-700 underline"
                    to={'/operations/orders/' + order.id}
                  >
                    Ver {order.id}
                  </Link>
                </div>
                <p className="text-sm">
                  {order.customerName} ·{' '}
                  {order.fulfillment?.mode === 'STORE_STORE'
                    ? 'Cliente ingresa y retira en sede'
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
                    <p className="text-sm">{order.intakeHold.description}</p>
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
                  <>
                    {isDriver && (
                      <label className="flex gap-2 text-sm">
                        <input
                          type="checkbox"
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
                    <label className="block text-sm font-semibold">
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
                        Verificar código
                      </button>
                      <button
                        className={button}
                        onClick={() => {
                          locked.current = false;
                          setCamera(true);
                        }}
                      >
                        Escanear QR
                      </button>
                      <button
                        className="text-sm text-blue-700 underline cursor-pointer"
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
                      <div className="space-y-4 border-t border-slate-100 pt-4">
                        <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">
                          {verified.warning}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {[
                            'CUSTOMER_TO_FACILITY',
                            'CUSTOMER_TO_DRIVER',
                            'DRIVER_TO_FACILITY',
                          ].includes(verified.handoff.type) && (
                            <label className="text-sm">
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
                              <label className="text-sm">
                                Nombre de quien retira
                                <input
                                  aria-label="Nombre de quien retira"
                                  className={field}
                                  value={recipient}
                                  onChange={(e) => setRecipient(e.target.value)}
                                />
                              </label>
                              <label className="text-sm">
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
                        <label className="block text-sm">
                          Observaciones
                          <textarea
                            className={field}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                          />
                        </label>
                        <label className="flex gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setChecked(e.target.checked)}
                          />
                          Verifiqué las prendas y confirmo la entrega física
                        </label>
                        {currentUser.role === 'ADMIN' && (
                          <>
                            <label className="flex gap-2 text-sm">
                              <input
                                type="checkbox"
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
                  </>
                )}
                {tab === 3 && (
                  <>
                    <p className="text-sm text-slate-500">
                      Registro: {selected.usedAt ?? selected.updatedAt} ·
                      Operador: {selected.usedByUserId ?? '—'}
                    </p>
                    {selected.receipt && (
                      <p className="text-sm">
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
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <input
                        aria-label="Motivo administrativo"
                        className={field}
                        placeholder="Motivo para revocar o regenerar"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                      <div className="flex gap-2">
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
                          className="text-sm text-red-700 underline cursor-pointer"
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
                          className="text-sm text-amber-800 underline cursor-pointer"
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
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-semibold mb-3">{facility.name}</h3>
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
                <details className="rounded-2xl border border-slate-200 bg-white p-5">
                  <summary className="text-sm font-semibold cursor-pointer">
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
