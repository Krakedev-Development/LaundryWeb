import { AlertTriangle, CalendarDays, CheckCircle2, Clock3, MapPin, Truck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DayPreference = 'business_days' | 'weekends' | 'any_day'
type TimeSlot =
  | '08:00-10:00'
  | '10:00-12:00'
  | '12:00-14:00'
  | '14:00-16:00'
  | '16:00-18:00'
  | '18:00-20:00'
type RequestStatus = 'at_hub' | 'to_deliver'

/** Catálogo oficial de franjas (# y horario de dos horas) */
const FRANJAS: readonly { n: number; value: TimeSlot; label: string }[] = [
  { n: 1, value: '08:00-10:00', label: '08:00 – 10:00' },
  { n: 2, value: '10:00-12:00', label: '10:00 – 12:00' },
  { n: 3, value: '12:00-14:00', label: '12:00 – 14:00' },
  { n: 4, value: '14:00-16:00', label: '14:00 – 16:00' },
  { n: 5, value: '16:00-18:00', label: '16:00 – 18:00' },
  { n: 6, value: '18:00-20:00', label: '18:00 – 20:00' },
] as const

const TIME_SLOTS: TimeSlot[] = FRANJAS.map((f) => f.value)

function franjaLabel(slot: TimeSlot): string {
  const f = FRANJAS.find((x) => x.value === slot)
  return f ? `${f.n}. ${f.label}` : slot
}

function franjaText(slot: TimeSlot): string {
  return FRANJAS.find((x) => x.value === slot)?.label ?? slot
}

type PickupRequest = {
  id: string
  customerName: string
  serviceName: string
  estimatedServiceDays: number
  pickupDateRequested: string
  preferredTimeSlot: TimeSlot
  preferredDayType: DayPreference
  pickupDriver: string | null
  assignedPickupDate: string | null
  deliveryDriver: string | null
  assignedDeliveryDate: string | null
  assignedDeliveryTimeSlot: TimeSlot | null
  status: RequestStatus
}

const DRIVER_OPTIONS = ['Carlos Ruiz', 'María Londoño', 'Laura Gómez', 'Jorge Mejía']

const INITIAL_REQUESTS: PickupRequest[] = [
  {
    id: 'req-1',
    customerName: 'Paola Herrera',
    serviceName: 'Lavado + doblado',
    estimatedServiceDays: 2,
    pickupDateRequested: '2026-04-25',
    preferredTimeSlot: '08:00-10:00',
    preferredDayType: 'business_days',
    pickupDriver: 'Carlos Ruiz',
    assignedPickupDate: '2026-04-25',
    deliveryDriver: null,
    assignedDeliveryDate: null,
    assignedDeliveryTimeSlot: null,
    status: 'at_hub',
  },
  {
    id: 'req-2',
    customerName: 'Inés Ocampo',
    serviceName: 'Lavado al seco',
    estimatedServiceDays: 1,
    pickupDateRequested: '2026-04-26',
    preferredTimeSlot: '10:00-12:00',
    preferredDayType: 'any_day',
    pickupDriver: 'María Londoño',
    assignedPickupDate: '2026-04-26',
    deliveryDriver: 'Laura Gómez',
    assignedDeliveryDate: '2026-04-27',
    assignedDeliveryTimeSlot: '10:00-12:00',
    status: 'to_deliver',
  },
]

type AssignmentForm = {
  driver: string
  deliveryDate: string
  deliveryTimeSlot: TimeSlot
}

const emptyAssignment: AssignmentForm = {
  driver: DRIVER_OPTIONS[0],
  deliveryDate: '',
  deliveryTimeSlot: TIME_SLOTS[0],
}

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseIsoNoon(iso: string): Date {
  return new Date(`${iso}T12:00:00`)
}

function isoAddDays(iso: string, days: number): string {
  const d = parseIsoNoon(iso)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dayOfWeek(iso: string): number {
  return parseIsoNoon(iso).getDay()
}

function isBusinessDay(iso: string): boolean {
  const dow = dayOfWeek(iso)
  return dow >= 1 && dow <= 5
}

function isWeekend(iso: string): boolean {
  const dow = dayOfWeek(iso)
  return dow === 0 || dow === 6
}

function matchesDayPreference(deliveryDateIso: string, pref: DayPreference): boolean {
  if (pref === 'any_day') return true
  if (pref === 'business_days') return isBusinessDay(deliveryDateIso)
  if (pref === 'weekends') return isWeekend(deliveryDateIso)
  return true
}

function nextMatchingDate(startIso: string, pref: DayPreference, maxHops = 14): string {
  if (pref === 'any_day') return startIso
  let current = startIso
  for (let i = 0; i < maxHops; i++) {
    if (matchesDayPreference(current, pref)) return current
    current = isoAddDays(current, 1)
  }
  return startIso
}

function suggestDeliveryDate(request: PickupRequest): string {
  const base = request.assignedPickupDate ?? request.pickupDateRequested
  const fromService = isoAddDays(base, request.estimatedServiceDays)
  const t = todayIso()
  const start = fromService >= t ? fromService : t
  return nextMatchingDate(start, request.preferredDayType)
}

export function PickupDeliveryRequestsView() {
  const [requests, setRequests] = useState<PickupRequest[]>(INITIAL_REQUESTS)
  const [formById, setFormById] = useState<Record<string, AssignmentForm>>({})

  const atHub = requests.filter((item) => item.status === 'at_hub')
  const toDeliver = requests.filter((item) => item.status === 'to_deliver')

  function getForm(requestId: string) {
    const existing = formById[requestId]
    if (existing) return existing
    const request = requests.find((item) => item.id === requestId)
    if (!request) return emptyAssignment
    return {
      driver: request.deliveryDriver ?? DRIVER_OPTIONS[0],
      deliveryDate: request.assignedDeliveryDate ?? suggestDeliveryDate(request),
      deliveryTimeSlot: request.assignedDeliveryTimeSlot ?? request.preferredTimeSlot,
    }
  }

  function setForm(requestId: string, next: AssignmentForm) {
    setFormById((prev) => ({ ...prev, [requestId]: next }))
  }

  function applyClientPreference(requestId: string) {
    const request = requests.find((item) => item.id === requestId)
    if (!request) return
    setForm(requestId, {
      driver: getForm(requestId).driver,
      deliveryDate: suggestDeliveryDate(request),
      deliveryTimeSlot: request.preferredTimeSlot,
    })
  }

  function moveToDelivery(requestId: string) {
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: 'to_deliver',
            }
          : item,
      ),
    )
  }

  function scheduleDelivery(requestId: string) {
    const form = getForm(requestId)
    if (!form.driver || !form.deliveryDate || !form.deliveryTimeSlot) return
    setRequests((prev) =>
      prev.map((item) =>
        item.id === requestId
          ? {
              ...item,
              deliveryDriver: form.driver,
              assignedDeliveryDate: form.deliveryDate,
              assignedDeliveryTimeSlot: form.deliveryTimeSlot,
            }
          : item,
      ),
    )
  }

  function completeDelivery(requestId: string) {
    setRequests((prev) => prev.filter((item) => item.id !== requestId))
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Solicitudes de recogida y entrega</CardTitle>
          <CardDescription className="text-text-muted">
            Una sola solicitud opera dos etapas: recoger ropa y entregar ropa. Se asigna chofer para todo el ciclo.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Summary label="Ropa recogida" value={atHub.length} tone="warning" />
          <Summary label="Ropa a entregar" value={toDeliver.length} tone="secondary" />
          <Summary label="Solicitudes totales" value={requests.length} tone="outline" />
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Ropa recogida</CardTitle>
          <CardDescription className="text-text-muted">
            Solicitudes ya recogidas. Aquí se controla preparación y planificación antes de entregar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {atHub.length === 0 ? (
            <p className="text-sm text-text-muted">No hay solicitudes en este estado.</p>
          ) : (
            atHub.map((request) => (
                <article key={request.id} className="rounded-md border border-border bg-background p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-text">{request.customerName}</p>
                      <p className="text-xs text-text-muted">
                        Servicio: {request.serviceName} · Tiempo estimado: {request.estimatedServiceDays} día(s)
                      </p>
                    </div>
                    <Badge variant="warning">Ropa recogida</Badge>
                  </div>
                  <div className="grid gap-2 text-xs text-text-muted sm:grid-cols-3">
                    <p className="inline-flex items-center gap-1">
                      <CalendarDays className="size-3.5 text-primary" />
                      Recogida solicitada: {formatDate(request.pickupDateRequested)}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5 text-primary" />
                      Franja: {franjaLabel(request.preferredTimeSlot)}
                    </p>
                    <p className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5 text-primary" />
                      Preferencia: {dayPrefLabel(request.preferredDayType)}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <InfoChip label="Chofer de recogida" value={request.pickupDriver ?? 'Sin asignar'} />
                    <InfoChip
                      label="Fecha de recogida asignada"
                      value={request.assignedPickupDate ? formatDate(request.assignedPickupDate) : 'Sin fecha'}
                    />
                    <InfoChip label="Fecha de entrega" value="Se define en etapa de entrega" />
                    <div className="flex items-end">
                      <Button size="sm" className="w-full" onClick={() => moveToDelivery(request.id)}>
                        Pasar a ropa a entregar
                      </Button>
                    </div>
                  </div>
                </article>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Ropa a entregar</CardTitle>
          <CardDescription className="text-text-muted">
            Solicitudes en etapa final. Ya tienen fecha de entrega y solo falta completar la entrega.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {toDeliver.length === 0 ? (
            <p className="text-sm text-text-muted">No hay entregas pendientes.</p>
          ) : (
            toDeliver.map((request) => {
              const form = getForm(request.id)
              const today = todayIso()
              const minDate = request.assignedPickupDate
                ? isoAddDays(request.assignedPickupDate, request.estimatedServiceDays)
                : today
              const dateMatches = form.deliveryDate
                ? matchesDayPreference(form.deliveryDate, request.preferredDayType)
                : true
              const slotMatches = form.deliveryTimeSlot === request.preferredTimeSlot
              const formValid = Boolean(form.driver && form.deliveryDate && form.deliveryTimeSlot)
              const hasScheduled = Boolean(request.assignedDeliveryDate)
              return (
                <article
                  key={request.id}
                  className="overflow-hidden rounded-lg border border-border bg-background shadow-sm"
                >
                  <div className="border-b border-border/80 bg-surface/50 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-text">{request.customerName}</p>
                        <p className="mt-0.5 text-sm text-text-muted">
                          {request.serviceName}
                          <span className="text-text-muted/80"> · </span>
                          <span>~{request.estimatedServiceDays} día(s) en servicio</span>
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Ropa a entregar
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-surface px-2.5 py-1.5 text-xs text-text">
                        <Truck className="size-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="text-text-muted">Recogió</span>
                        <span className="font-medium">{request.pickupDriver ?? '—'}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                          hasScheduled
                            ? 'border-border/80 bg-surface text-text'
                            : 'border-amber-200/80 bg-amber-500/5 text-amber-800'
                        }`}
                      >
                        <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
                        {hasScheduled ? (
                          <>
                            <span className="text-text-muted">Entrega fijada</span>
                            <span className="font-medium">
                              {formatDate(request.assignedDeliveryDate!)}
                              {request.assignedDeliveryTimeSlot
                                ? ` · ${franjaText(request.assignedDeliveryTimeSlot)}`
                                : ''}
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">Aún sin fecha confirmada en sistema</span>
                        )}
                      </span>
                      <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border/80 bg-primary-soft/40 px-2.5 py-1.5 text-xs text-text">
                        <Clock3 className="size-3.5 shrink-0 text-primary" aria-hidden />
                        <span className="text-text-muted">Pide</span>
                        <span className="min-w-0 font-medium">
                          {franjaText(request.preferredTimeSlot)} · {dayPrefLabel(request.preferredDayType)}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-sm font-semibold text-text">Programar entrega</h4>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-full sm:w-auto"
                        onClick={() => applyClientPreference(request.id)}
                        title="Rellenar fecha y franja con las preferencias del cliente"
                      >
                        Aplicar preferencia del cliente
                      </Button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-text">Chofer de entrega</span>
                        <select
                          value={form.driver}
                          onChange={(e) => setForm(request.id, { ...form, driver: e.target.value })}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          {DRIVER_OPTIONS.map((driver) => (
                            <option key={driver} value={driver}>
                              {driver}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-text">Fecha de entrega</span>
                        <input
                          type="date"
                          min={minDate}
                          value={form.deliveryDate}
                          onChange={(e) => setForm(request.id, { ...form, deliveryDate: e.target.value })}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        />
                      </label>
                      <label className="block space-y-1.5 sm:col-span-2 lg:col-span-1">
                        <span className="text-xs font-medium text-text">Franja horaria</span>
                        <select
                          value={form.deliveryTimeSlot}
                          onChange={(e) => setForm(request.id, { ...form, deliveryTimeSlot: e.target.value as TimeSlot })}
                          className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
                        >
                          {FRANJAS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.n}. {f.label}
                              {f.value === request.preferredTimeSlot ? ' (preferida)' : ''}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="min-w-0 flex flex-1 flex-wrap gap-1.5 text-[11px] leading-tight">
                        {form.deliveryDate ? (
                          dateMatches ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700">
                              <CheckCircle2 className="size-3.5 shrink-0" />
                              Día: acorde a {dayPrefLabel(request.preferredDayType).toLowerCase()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-amber-800">
                              <AlertTriangle className="size-3.5 shrink-0" />
                              Día: revisa si encaja con {dayPrefLabel(request.preferredDayType).toLowerCase()}
                            </span>
                          )
                        ) : null}
                        {slotMatches ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700">
                            <CheckCircle2 className="size-3.5 shrink-0" />
                            Franja: misma que la del cliente
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-amber-800">
                            <AlertTriangle className="size-3.5 shrink-0" />
                            Franja: distinta a la que suele pedir
                          </span>
                        )}
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end lg:w-auto lg:min-w-[220px] lg:flex-col">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 w-full sm:min-w-[160px] lg:min-w-0"
                          disabled={!formValid}
                          onClick={() => scheduleDelivery(request.id)}
                        >
                          Programar entrega
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-9 w-full sm:min-w-[160px] lg:min-w-0"
                          disabled={!request.assignedDeliveryDate}
                          onClick={() => completeDelivery(request.id)}
                        >
                          Marcar entregada
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'warning' | 'secondary' | 'outline'
}) {
  return (
    <article className="rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">{label}</p>
        <Badge variant={tone}>{value}</Badge>
      </div>
    </article>
  )
}

function dayPrefLabel(value: DayPreference) {
  if (value === 'business_days') return 'Días hábiles'
  if (value === 'weekends') return 'Fines de semana'
  return 'Cualquier día'
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('es-CO')
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 text-xs text-text-muted">
      <p className="font-medium text-text">{label}</p>
      <div className="inline-flex h-9 w-full items-center rounded-md border border-border bg-surface px-2 text-sm text-text">
        {value}
      </div>
    </div>
  )
}
