import * as Dialog from '@radix-ui/react-dialog'
import {
  CalendarDays,
  MapPin,
  Search,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'
import type { CustomerProfile } from '@/types'

export function ClientManagementView() {
  const { data } = useFleetSnapshot()
  const [overrides, setOverrides] = useState<Record<string, Partial<CustomerProfile>>>({})
  const [query, setQuery] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

  const clients = useMemo(
    () => (data?.customers ?? []).map((c) => ({ ...c, ...(overrides[c.id] ?? {}) })),
    [data?.customers, overrides],
  )

  const filtered = useMemo(() => {
    return clients.filter((client) => {
      const searchable = `${client.fullName} ${client.email} ${client.phone}`.toLowerCase()
      const byQuery = query.trim() === '' || searchable.includes(query.toLowerCase())
      const regTime = new Date(client.registeredAt).getTime()
      const fromOk = fromDate ? regTime >= new Date(`${fromDate}T00:00:00`).getTime() : true
      const toOk = toDate ? regTime <= new Date(`${toDate}T23:59:59`).getTime() : true
      return byQuery && fromOk && toOk
    })
  }, [clients, query, fromDate, toDate])

  const totals = {
    total: clients.length,
    activeSubscriptions: clients.filter((c) => c.subscriptionStatus === 'active').length,
    walletUsers: clients.filter((c) => c.walletBalance > 0).length,
    promotionsOff: clients.filter((c) => !c.promotionsEnabled).length,
  }
  const selectedProfile = clients.find((c) => c.id === selectedProfileId) ?? null

  function updateClient(id: string, updater: (client: CustomerProfile) => CustomerProfile) {
    const base = clients.find((c) => c.id === id)
    if (!base) return
    const next = updater(base)
    setOverrides((prev) => ({ ...prev, [id]: next }))
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Gestión de clientes</CardTitle>
          <CardDescription className="text-text-muted">
            Búsqueda comercial de clientes, suscripción, billetera digital y promociones.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FlowItem
              title="Clientes totales"
              description="Base actual de clientes registrados."
              value={totals.total}
              tone="secondary"
            />
            <FlowItem
              title="Suscripción activa"
              description="Clientes con plan activo."
              value={totals.activeSubscriptions}
              tone="success"
            />
            <FlowItem
              title="Con billetera activa"
              description="Clientes con saldo mayor a 0."
              value={totals.walletUsers}
              tone="outline"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.3fr_auto_auto]">
            <label className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, email o teléfono"
                className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>
            <DateInput label="Desde" value={fromDate} onChange={setFromDate} />
            <DateInput label="Hasta" value={toDate} onChange={setToDate} />
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="bg-primary-soft text-left text-primary">
                <tr>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Suscripción</th>
                  <th className="px-3 py-2 font-semibold">Billetera</th>
                  <th className="px-3 py-2 font-semibold">Promociones</th>
                  <th className="px-3 py-2 font-semibold">Gestión</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-t border-border bg-surface text-text">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{client.fullName}</p>
                      <p className="text-xs text-text-muted">{client.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-medium capitalize">{client.subscriptionPlan}</p>
                      <p className="text-xs text-text-muted capitalize">{client.subscriptionStatus}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="inline-flex items-center gap-1 font-semibold">
                        <Wallet className="size-4 text-aqua" aria-hidden />
                        ${client.walletBalance.toLocaleString('es-CO')}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Button
                        size="sm"
                        variant={client.promotionsEnabled ? 'secondary' : 'outline'}
                        onClick={() =>
                          updateClient(client.id, (c) => ({
                            ...c,
                            promotionsEnabled: !c.promotionsEnabled,
                          }))
                        }
                      >
                        {client.promotionsEnabled ? 'Desactivar promociones' : 'Activar promociones'}
                      </Button>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Button size="sm" variant="outline" onClick={() => setSelectedProfileId(client.id)}>
                        Ver perfil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {filtered.length === 0 ? (
              <div className="border-t border-border bg-surface px-3 py-4 text-sm text-text-muted">
                No hay clientes que cumplan los filtros aplicados.
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Dialog.Root open={Boolean(selectedProfile)} onOpenChange={(open) => !open && setSelectedProfileId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[92vh] w-[min(1080px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            {!selectedProfile ? null : (
              <>
                <div className="flex items-start justify-between gap-2 border-b border-border p-3 sm:p-4">
                  <div className="min-w-0">
                    <Dialog.Title className="truncate text-lg font-semibold text-text">
                      Perfil completo de {selectedProfile.fullName}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-text-muted">
                      Vista 360 del cliente: identidad, contacto, ubicación, plan, billetera y estado comercial.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <Button variant="outline" size="sm" className="shrink-0">Cerrar</Button>
                  </Dialog.Close>
                </div>

                <div className="grid flex-1 gap-4 overflow-y-auto p-3 sm:p-4 xl:grid-cols-[1.2fr_1fr]">
                  <div className="space-y-4">
                    <section className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-semibold text-text">Datos personales</p>
                      <div className="grid gap-2 text-sm text-text sm:grid-cols-2">
                        <Info label="Cliente ID" value={selectedProfile.id} />
                        <Info label="User ID" value={selectedProfile.userId} />
                        <Info label="Nombre" value={selectedProfile.fullName} />
                        <Info label="Teléfono" value={selectedProfile.phone} />
                        <Info label="Email" value={selectedProfile.email} />
                        <Info label="Fecha registro" value={new Date(selectedProfile.registeredAt).toLocaleString('es-CO')} />
                        <Info label="Creado" value={new Date(selectedProfile.createdAt).toLocaleString('es-CO')} />
                        <Info label="Actualizado" value={new Date(selectedProfile.updatedAt).toLocaleString('es-CO')} />
                      </div>
                    </section>

                    <section className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-semibold text-text">Ubicación</p>
                      <div className="space-y-1 text-sm text-text">
                        <p className="inline-flex items-center gap-1">
                          <MapPin className="size-4 text-primary" aria-hidden />
                          {selectedProfile.city} · {selectedProfile.neighborhood}
                        </p>
                        <p>{selectedProfile.addressLine}</p>
                        <p className="text-xs text-text-muted">
                          Lat: {selectedProfile.location.lat.toFixed(6)} · Lng: {selectedProfile.location.lng.toFixed(6)}
                        </p>
                      </div>
                    </section>

                    <section className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-semibold text-text">Cuenta comercial</p>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <Info label="Plan" value={selectedProfile.subscriptionPlan} />
                        <Info label="Estado suscripción" value={selectedProfile.subscriptionStatus} />
                        <Info label="Billetera" value={`$${selectedProfile.walletBalance.toLocaleString('es-CO')}`} />
                        <Info label="Promociones" value={selectedProfile.promotionsEnabled ? 'Activas' : 'Desactivadas'} />
                      </div>
                    </section>
                  </div>

                  <div className="space-y-4">
                    <section className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-semibold text-text">Documentos de identidad</p>
                      <div className="space-y-3">
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">Cédula</p>
                          <img
                            src={selectedProfile.cedulaPhotoUrl}
                            alt={`Cédula ${selectedProfile.fullName}`}
                            className="h-40 w-full rounded-md border border-border object-cover"
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-xs uppercase tracking-wide text-text-muted">Selfie</p>
                          <img
                            src={selectedProfile.selfiePhotoUrl}
                            alt={`Selfie ${selectedProfile.fullName}`}
                            className="h-48 w-full rounded-md border border-border object-cover"
                          />
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function FlowItem({
  title,
  description,
  value,
  tone,
}: {
  title: string
  description: string
  value: number
  tone: 'secondary' | 'success' | 'outline'
}) {
  return (
    <article className="rounded-md border border-border bg-background px-3 py-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-text">{title}</p>
        <Badge variant={tone}>{value}</Badge>
      </div>
      <p className="text-xs text-text-muted">{description}</p>
    </article>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-text-muted">{label}:</span>{' '}
      <strong className="font-medium text-text">{value}</strong>
    </p>
  )
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="relative block w-full">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
      />
    </label>
  )
}
