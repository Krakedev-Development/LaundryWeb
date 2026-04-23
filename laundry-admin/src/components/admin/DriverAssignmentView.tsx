import * as Dialog from '@radix-ui/react-dialog'
import { Eye, Loader2, MapPinned, Navigation, UserRoundPlus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { RoutePreviewMap } from '@/components/admin/RoutePreviewMap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'

const PAGE_SIZE = 5
const HUBS = [
  { id: 'hq-norte', name: 'Sede Norte', lng: -75.5892, lat: 6.2792 },
  { id: 'hq-centro', name: 'Sede Centro', lng: -75.5755, lat: 6.2476 },
  { id: 'hq-sur', name: 'Sede Sur', lng: -75.6034, lat: 6.2128 },
] as const

type ZoneFilter = 'all' | string
type PriorityFilter = 'all' | 'low' | 'normal' | 'high' | 'urgent'

export function DriverAssignmentView() {
  const { data: fleet, isLoading } = useFleetSnapshot()
  const token = import.meta.env.VITE_MAPBOX_TOKEN ?? import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [hubId, setHubId] = useState<(typeof HUBS)[number]['id']>('hq-centro')
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [assignedDrivers, setAssignedDrivers] = useState<Record<string, string>>({})
  const [mapProvider, setMapProvider] = useState<'mapbox' | 'osm'>(token ? 'mapbox' : 'osm')

  const orders = fleet?.orders ?? []
  const drivers = fleet?.drivers ?? []
  const availableDrivers = drivers.filter((d) => d.status === 'available')
  const effectiveWaitingOrders = orders.filter(
    (order) =>
      order.status === 'pending' &&
      !order.driverId &&
      !assignedDrivers[order.id],
  )

  const filteredOrders = useMemo(
    () =>
      effectiveWaitingOrders.filter((order) => {
        const byZone = zoneFilter === 'all' || order.zoneId === zoneFilter
        const byPriority = priorityFilter === 'all' || order.priority === priorityFilter
        return byZone && byPriority
      }),
    [effectiveWaitingOrders, priorityFilter, zoneFilter],
  )

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const visiblePage = Math.min(page, totalPages)
  const start = (visiblePage - 1) * PAGE_SIZE
  const paginatedOrders = filteredOrders.slice(start, start + PAGE_SIZE)

  const selectedOrder =
    filteredOrders.find((o) => o.id === selectedOrderId) ?? paginatedOrders[0] ?? null
  const detailOpen = Boolean(selectedOrderId)
  const selectedHub = HUBS.find((h) => h.id === hubId) ?? HUBS[1]
  const selectedPickupLng = selectedOrder?.pickupLocation.lng ?? null
  const selectedPickupLat = selectedOrder?.pickupLocation.lat ?? null

  function assignDriver(orderId: string, driverId: string) {
    setAssignedDrivers((prev) => ({ ...prev, [orderId]: driverId }))
  }

  return (
    <section className="space-y-4">
      <Card className="border-border bg-surface">
        <CardHeader className="pb-4">
          <CardTitle className="text-text">Asignar choferes</CardTitle>
          <CardDescription className="text-text-muted">
            Clientes en espera, ruta sugerida por sede y asignación directa desde detalle.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[auto_auto_auto_1fr]">
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="all">Todas las zonas</option>
              {(fleet?.zones ?? []).map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              <option value="all">Todas las prioridades</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="normal">Normal</option>
              <option value="low">Baja</option>
            </select>
            <select
              value={hubId}
              onChange={(e) => setHubId(e.target.value as (typeof HUBS)[number]['id'])}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none"
            >
              {HUBS.map((hub) => (
                <option key={hub.id} value={hub.id}>
                  Ruta desde {hub.name}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-end">
              <Badge variant={filteredOrders.length ? 'warning' : 'success'}>
                {filteredOrders.length} esperando chofer
              </Badge>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-primary-soft text-left text-primary">
                <tr>
                  <th className="px-3 py-2 font-semibold">Cliente</th>
                  <th className="px-3 py-2 font-semibold">Zona</th>
                  <th className="px-3 py-2 font-semibold">Prioridad</th>
                  <th className="px-3 py-2 font-semibold">Sede sugerida</th>
                  <th className="px-3 py-2 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <p className="font-semibold text-text">{order.customerName}</p>
                      <p className="text-xs text-text-muted">{order.pickupAddress}</p>
                    </td>
                    <td className="px-3 py-2 text-text">{order.zoneName}</td>
                    <td className="px-3 py-2">
                      <Badge variant={order.priority === 'urgent' || order.priority === 'high' ? 'warning' : 'secondary'}>
                        {order.priority}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-text">{selectedHub.name}</td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedOrderId(order.id)}>
                        <Eye className="size-4" aria-hidden />
                        Ver detalles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {paginatedOrders.length === 0 ? (
              <div className="px-3 py-4 text-sm text-text-muted">No hay clientes esperando chofer con esos filtros.</div>
            ) : null}
            <div className="flex items-center justify-between border-t border-border bg-background px-3 py-2">
              <p className="text-xs text-text-muted">
                Mostrando {paginatedOrders.length === 0 ? 0 : start + 1}-{start + paginatedOrders.length} de{' '}
                {filteredOrders.length}
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
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(1200px,95vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface p-4 shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-text">
                  <MapPinned className="size-4 text-primary" aria-hidden />
                  Ver detalles de ruta y asignar chofer
                </Dialog.Title>
                <Dialog.Description className="text-sm text-text-muted">
                  Al seleccionar un cliente, se dibuja la ruta sugerida desde la sede elegida.
                </Dialog.Description>
              </div>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Badge variant="secondary">
                    <Loader2 className="size-3 animate-spin" aria-hidden /> Cargando
                  </Badge>
                ) : null}
                <Dialog.Close asChild>
                  <Button size="sm" variant="outline">Cerrar</Button>
                </Dialog.Close>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="relative h-[520px] overflow-hidden rounded-md border border-border bg-primary-soft/30">
                {selectedPickupLat && selectedPickupLng ? (
                  <RoutePreviewMap
                    pickup={[selectedPickupLat, selectedPickupLng]}
                    mid={[
                      (selectedPickupLat + selectedHub.lat) / 2 + 0.0012,
                      (selectedPickupLng + selectedHub.lng) / 2 + 0.003,
                    ]}
                    destination={[selectedHub.lat, selectedHub.lng]}
                    token={token}
                    onProviderChange={setMapProvider}
                  />
                ) : null}
                <div className="absolute bottom-3 left-3 rounded-md border border-border bg-surface px-2 py-1 text-xs text-text-muted">
                  Ruta simulada: {selectedHub.name} → {selectedOrder?.customerName ?? 'Sin selección'} ·
                  proveedor: {mapProvider === 'mapbox' ? 'Mapbox' : 'OpenStreetMap fallback'}
                </div>
              </div>

              <div className="space-y-3">
                {!selectedOrder ? (
                  <div className="rounded-md border border-border bg-background p-3 text-sm text-text-muted">
                    Selecciona un cliente desde la tabla para ver ruta y asignar chofer.
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm font-semibold text-text">{selectedOrder.customerName}</p>
                      <p className="text-xs text-text-muted">{selectedOrder.pickupAddress}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        Prioridad: <strong className="text-text">{selectedOrder.priority}</strong>
                      </p>
                    </div>

                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="mb-2 text-sm font-semibold text-text">Choferes disponibles</p>
                      <div className="space-y-2">
                        {availableDrivers.length === 0 ? (
                          <p className="text-xs text-text-muted">No hay choferes disponibles ahora.</p>
                        ) : (
                          availableDrivers.map((driver) => (
                            <div key={driver.id} className="flex items-center justify-between rounded-md border border-border p-2">
                              <div>
                                <p className="text-sm font-medium text-text">{driver.displayName}</p>
                                <p className="text-xs text-text-muted">{driver.vehiclePlate}</p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!selectedOrder) return
                                  assignDriver(selectedOrder.id, driver.id)
                                  setSelectedOrderId(null)
                                }}
                              >
                                <UserRoundPlus className="size-4" aria-hidden />
                                Asignar
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border border-border bg-primary-soft/50 p-3 text-xs text-text-muted">
                      <p className="inline-flex items-center gap-1">
                        <Navigation className="size-3.5 text-primary" aria-hidden />
                        Ruta sugerida desde <strong className="text-text">{selectedHub.name}</strong>.
                      </p>
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
