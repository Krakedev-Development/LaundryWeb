import * as Dialog from '@radix-ui/react-dialog'
import { CalendarDays, Eye, MapPinned, Route, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RoutePreviewMap } from '@/components/admin/RoutePreviewMap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'
import type { Order, OrderStatus } from '@/types'

const PAGE_SIZE = 6
type StatusFilter = 'all' | OrderStatus

export function RouteHistoryView({ canEditOrder = true }: { canEditOrder?: boolean }) {
  const { data: fleet } = useFleetSnapshot()
  const token = import.meta.env.VITE_MAPBOX_TOKEN ?? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [zone, setZone] = useState<'all' | string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [editedStatus, setEditedStatus] = useState<OrderStatus>('assigned')
  const [editedPriority, setEditedPriority] = useState<Order['priority']>('normal')
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'osm'>(token ? 'mapbox' : 'osm')

  const driversById = useMemo(
    () => Object.fromEntries((fleet?.drivers ?? []).map((d) => [d.id, d])),
    [fleet?.drivers],
  )

  const routeRows = useMemo(() => {
    const orders = fleet?.orders ?? []
    return orders
      .filter((order) => order.status !== 'pending')
      .map((order) => {
        const seed = Number(order.id.replace(/\D/g, '')) || 0
        const estimatedKm = Number((2.4 + ((seed % 12) * 0.8)).toFixed(1))
        const estimatedMin = 12 + (seed % 7) * 6
        const driverName = order.driverId ? driversById[order.driverId]?.displayName ?? 'Sin asignar' : 'Sin asignar'
        return { order, estimatedKm, estimatedMin, driverName }
      })
      .sort((a, b) => new Date(b.order.updatedAt).getTime() - new Date(a.order.updatedAt).getTime())
  }, [driversById, fleet?.orders])

  const filtered = useMemo(() => {
    return routeRows.filter((row) => {
      const byStatus = status === 'all' || row.order.status === status
      const byZone = zone === 'all' || row.order.zoneId === zone
      const haystack =
        `${row.order.id} ${row.order.customerName} ${row.order.pickupAddress} ${row.driverName}`.toLowerCase()
      const bySearch = search.trim() === '' || haystack.includes(search.toLowerCase())
      const rowTime = new Date(row.order.updatedAt).getTime()
      const byFrom = fromDate ? rowTime >= new Date(`${fromDate}T00:00:00`).getTime() : true
      const byTo = toDate ? rowTime <= new Date(`${toDate}T23:59:59`).getTime() : true
      return byStatus && byZone && bySearch && byFrom && byTo
    })
  }, [fromDate, routeRows, search, status, toDate, zone])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const start = (visiblePage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)
  const selected = filtered.find((row) => row.order.id === selectedOrderId) ?? null
  const detailOpen = Boolean(selected)
  const pickupLat = selected?.order.pickupLocation.lat ?? null
  const pickupLng = selected?.order.pickupLocation.lng ?? null

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader>
          <CardTitle className="text-text">Historial de rutas</CardTitle>
          <CardDescription className="text-text-muted">
            Consulta rutas gestionadas, estado logístico y tiempos estimados con filtros rápidos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[1.2fr_auto_auto_auto_auto_1fr]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente, orden, chofer o dirección"
                className="h-10 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="assigned">Asignada</option>
              <option value="pickup_en_route">En ruta de recogida</option>
              <option value="picked_up">Recogida</option>
              <option value="at_facility">En planta</option>
              <option value="out_for_delivery">En entrega</option>
              <option value="delivered">Entregada</option>
              <option value="incident">Incidencia</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="all">Todas las zonas</option>
              {(fleet?.zones ?? []).map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
            <DateInput label="Desde" value={fromDate} onChange={setFromDate} />
            <DateInput label="Hasta" value={toDate} onChange={setToDate} />
            <div className="flex items-center justify-end">
              <Badge variant={filtered.length ? 'secondary' : 'outline'}>{filtered.length} rutas</Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary-soft text-left text-primary">
                <tr>
                  <th className="px-3 py-2 font-semibold">Orden / Cliente</th>
                  <th className="px-3 py-2 font-semibold">Ruta</th>
                  <th className="px-3 py-2 font-semibold">Chofer</th>
                  <th className="px-3 py-2 font-semibold">Estado</th>
                  <th className="px-3 py-2 font-semibold">Tiempo</th>
                  <th className="px-3 py-2 font-semibold">Actualización</th>
                  <th className="px-3 py-2 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order, estimatedKm, estimatedMin, driverName }) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-text">{order.id}</p>
                      <p className="text-xs text-text-muted">{order.customerName}</p>
                    </td>
                    <td className="px-3 py-2">
                      <p className="inline-flex items-center gap-1 text-text">
                        <Route className="size-4 text-primary" aria-hidden />
                        {order.pickupAddress}
                      </p>
                      <p className="text-xs text-text-muted">
                        {order.zoneName} · {estimatedKm} km
                      </p>
                    </td>
                    <td className="px-3 py-2 text-text">{driverName}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-3 py-2 text-text">{estimatedMin} min</td>
                    <td className="px-3 py-2 text-xs text-text-muted">
                      {new Date(order.updatedAt).toLocaleString('es-CO')}
                    </td>
                    <td className="px-3 py-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditedStatus(order.status)
                          setEditedPriority(order.priority)
                          setSelectedOrderId(order.id)
                        }}
                      >
                        <Eye className="size-4" aria-hidden />
                        Ver detalles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <div className="border-t border-border bg-surface px-3 py-4 text-sm text-text-muted">
                No hay rutas para los filtros seleccionados.
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-border bg-background px-3 py-2">
              <p className="text-xs text-text-muted">
                Mostrando {rows.length === 0 ? 0 : start + 1}-{start + rows.length} de {filtered.length}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={visiblePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <span className="text-xs text-text-muted">
                  {visiblePage}/{totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={visiblePage === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog.Root open={detailOpen} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-primary/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(1100px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-4 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-text">
                  <MapPinned className="size-4 text-primary" aria-hidden />
                  Detalle de ruta y tramo
                </Dialog.Title>
                <Dialog.Description className="text-sm text-text-muted">
                  Visualiza el tramo de la ruta y validación de mapa para la orden seleccionada.
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button size="sm" variant="outline">Cerrar</Button>
              </Dialog.Close>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="relative h-[500px] overflow-hidden rounded-md border border-border bg-primary-soft/30">
                {pickupLat !== null && pickupLng !== null ? (
                  <RoutePreviewMap
                    pickup={[pickupLat, pickupLng]}
                    mid={[pickupLat - 0.003, pickupLng + 0.005]}
                    destination={[pickupLat - 0.006, pickupLng + 0.01]}
                    token={token}
                    onProviderChange={setMapProvider}
                  />
                ) : null}
              </div>

              <div className="space-y-3">
                {!selected ? null : (
                  <>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm font-semibold text-text">{selected.order.id}</p>
                      <p className="text-xs text-text-muted">{selected.order.customerName}</p>
                      <p className="mt-1 text-xs text-text-muted">{selected.order.pickupAddress}</p>
                      <p className="text-xs text-text-muted">{selected.order.deliveryAddress}</p>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3 text-xs text-text-muted">
                      <p>Chofer: <strong className="text-text">{selected.driverName}</strong></p>
                      <p>Distancia estimada: <strong className="text-text">{selected.estimatedKm} km</strong></p>
                      <p>Tiempo estimado: <strong className="text-text">{selected.estimatedMin} min</strong></p>
                      <p>Estado: <strong className="text-text">{selected.order.status}</strong></p>
                    </div>
                    {canEditOrder ? (
                      <div className="rounded-md border border-border bg-background p-3">
                        <p className="mb-2 text-sm font-semibold text-text">Editar orden</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <select
                            value={editedStatus}
                            onChange={(e) => setEditedStatus(e.target.value as OrderStatus)}
                            className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-text focus:border-primary focus:outline-none"
                          >
                            <option value="assigned">Asignada</option>
                            <option value="pickup_en_route">Ruta a recogida</option>
                            <option value="picked_up">Recogida</option>
                            <option value="at_facility">En planta</option>
                            <option value="out_for_delivery">En entrega</option>
                            <option value="delivered">Entregada</option>
                            <option value="incident">Incidencia</option>
                            <option value="cancelled">Cancelada</option>
                          </select>
                          <select
                            value={editedPriority}
                            onChange={(e) => setEditedPriority(e.target.value as Order['priority'])}
                            className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-text focus:border-primary focus:outline-none"
                          >
                            <option value="low">Baja</option>
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>
                        <div className="mt-2 text-xs text-text-muted">
                          Nuevo estado: <strong className="text-text">{editedStatus}</strong> · Prioridad:{' '}
                          <strong className="text-text">{editedPriority}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-md border border-border bg-background p-3 text-xs text-text-muted">
                        Modo supervisor: solo consulta de órdenes y trazabilidad.
                      </div>
                    )}
                    <div className="rounded-md border border-border bg-primary-soft/60 p-3 text-xs text-text-muted">
                      Proveedor de mapa: {mapProvider === 'mapbox' ? 'Mapbox' : 'OpenStreetMap (fallback)'}.
                    </div>
                  </>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
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
    <label className="relative">
      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-text focus:border-primary focus:outline-none"
      />
    </label>
  )
}

function StatusBadge({ status }: { status: Order['status'] }) {
  if (status === 'delivered') return <Badge variant="success">Entregada</Badge>
  if (status === 'incident') return <Badge variant="destructive">Incidencia</Badge>
  if (status === 'cancelled') return <Badge variant="outline">Cancelada</Badge>
  if (status === 'out_for_delivery') return <Badge variant="warning">En entrega</Badge>
  if (status === 'picked_up') return <Badge variant="secondary">Recogida</Badge>
  if (status === 'pickup_en_route') return <Badge variant="secondary">Ruta a recogida</Badge>
  if (status === 'assigned') return <Badge variant="secondary">Asignada</Badge>
  return <Badge variant="outline">{status}</Badge>
}
