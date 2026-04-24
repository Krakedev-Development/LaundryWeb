import { AlertTriangle, BarChart3, ChevronLeft, ChevronRight, Clock3, Truck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'

const UNASSIGNED_PAGE_SIZE = 3

export function DashboardView() {
  const { data: fleet, isLoading } = useFleetSnapshot()
  const orders = fleet?.orders ?? []
  const drivers = fleet?.drivers ?? []
  const unassignedHomeServices = orders.filter((order) => order.status === 'pending' && !order.driverId)
  const [currentPage, setCurrentPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(unassignedHomeServices.length / UNASSIGNED_PAGE_SIZE))
  const visiblePage = Math.min(currentPage, totalPages)
  const pageStartIndex = (visiblePage - 1) * UNASSIGNED_PAGE_SIZE
  const pageEndIndex = Math.min(
    pageStartIndex + UNASSIGNED_PAGE_SIZE,
    unassignedHomeServices.length,
  )
  const paginatedUnassigned = useMemo(() => {
    const start = (visiblePage - 1) * UNASSIGNED_PAGE_SIZE
    return unassignedHomeServices.slice(start, start + UNASSIGNED_PAGE_SIZE)
  }, [unassignedHomeServices, visiblePage])

  const byStatus = [
    { label: 'Pendientes', value: orders.filter((o) => o.status === 'pending').length },
    { label: 'Asignadas', value: orders.filter((o) => o.status === 'assigned').length },
    { label: 'Recogidas', value: orders.filter((o) => o.status === 'picked_up').length },
    { label: 'En entrega', value: orders.filter((o) => o.status === 'out_for_delivery').length },
  ]
  const maxStatus = Math.max(1, ...byStatus.map((d) => d.value))

  const byDriver = [
    { label: 'Disponibles', value: drivers.filter((d) => d.status === 'available').length, color: 'bg-accent' },
    { label: 'En servicio', value: drivers.filter((d) => d.status === 'in_transit').length, color: 'bg-aqua' },
    { label: 'Offline', value: drivers.filter((d) => d.status === 'offline').length, color: 'bg-text-muted' },
  ]

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Órdenes hoy" value={fleet?.kpis.ordersToday ?? 0} icon={BarChart3} loading={isLoading} />
        <MetricCard
          label="Choferes activos"
          value={fleet?.kpis.activeDrivers ?? 0}
          icon={Truck}
          loading={isLoading}
        />
        <MetricCard
          label="SLA a tiempo"
          value={fleet ? `${fleet.kpis.slaOnTimePercent.toFixed(1)}%` : '0%'}
          icon={Clock3}
          loading={isLoading}
        />
        <MetricCard
          label="Solicitudes sin asignar"
          value={unassignedHomeServices.length}
          icon={AlertTriangle}
          loading={isLoading}
          highlight={unassignedHomeServices.length > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-text">Gráfica de órdenes por estado</CardTitle>
            <CardDescription className="text-text-muted">
              Distribución operativa del día en tiempo real (mock).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byStatus.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-muted">{item.label}</span>
                  <span className="font-semibold text-text">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-primary-soft">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${(item.value / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-surface">
          <CardHeader>
            <CardTitle className="text-text">Estado de flota</CardTitle>
            <CardDescription className="text-text-muted">
              Concentración de choferes por disponibilidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {byDriver.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border border-border p-2">
                <span className="text-sm text-text">{item.label}</span>
                <span className={`rounded-md px-2 py-1 text-xs font-semibold text-primary-dark ${item.color}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-surface">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-text">Solicitudes de recogida sin chofer</CardTitle>
            <CardDescription className="text-text-muted">
              Prioridad operativa para mantener el SLA de recogida.
            </CardDescription>
          </div>
          <Badge variant={unassignedHomeServices.length ? 'warning' : 'success'} className="w-fit">
            {unassignedHomeServices.length} pendientes
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {unassignedHomeServices.length === 0 ? (
            <p className="text-sm text-text-muted">No hay solicitudes sin asignar actualmente.</p>
          ) : (
            <>
              {paginatedUnassigned.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-primary-soft/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{order.customerName}</p>
                    <p className="truncate text-xs text-text-muted">
                      {order.zoneName} · {order.pickupAddress}
                    </p>
                  </div>
                  <Button size="sm" className="w-full sm:w-auto">Asignar ahora</Button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-text-muted">
                  Mostrando {pageStartIndex + 1}-{pageEndIndex} de {unassignedHomeServices.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={visiblePage === 1}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <span className="min-w-16 text-center text-xs font-medium text-text-muted">
                    {visiblePage}/{totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                    disabled={visiblePage === totalPages}
                    className="h-8 px-2"
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  loading,
  highlight,
}: {
  label: string
  value: number | string
  icon: typeof BarChart3
  loading: boolean
  highlight?: boolean
}) {
  return (
    <Card className={`border-border bg-surface ${highlight ? 'ring-2 ring-orange-400/70' : ''}`}>
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2 text-text-muted">
          <Icon className={`size-4 ${highlight ? 'text-orange-500' : 'text-primary'}`} aria-hidden />
          {label}
        </CardDescription>
        <CardTitle className="text-2xl text-text">{loading ? '...' : value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
