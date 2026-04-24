import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import type { FeatureCollection, Point as GeoPoint } from 'geojson'
import { Loader2, MapPinned } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useFleetSnapshot } from '@/hooks/useFleetSnapshot'
import { driversToGeoJSON, pendingOrdersToGeoJSON } from '@/services/mapGeojson'
import type { DriverStatus, FleetSnapshot } from '@/types'

const EMPTY_FC: FeatureCollection<GeoPoint> = { type: 'FeatureCollection', features: [] }

const MAP_CENTER: [number, number] = [-75.5812, 6.2442]
const MAP_COLORS = {
  primary: '#143F73',
  primaryDark: '#0F315A',
  primarySoft: '#E8EEF5',
  accent: '#A5CD39',
  aqua: '#61BFC7',
  textMuted: '#6B7280',
  surface: '#FFFFFF',
} as const

function driverStatusLabel(value: string): string {
  const s = value as DriverStatus
  if (s === 'available') return 'Disponible'
  if (s === 'in_transit') return 'En servicio'
  if (s === 'offline') return 'Fuera de línea'
  return value
}

function applyFleetToMap(map: mapboxgl.Map, fleet: FleetSnapshot) {
  const driversSource = map.getSource('drivers') as mapboxgl.GeoJSONSource | undefined
  const ordersSource = map.getSource('orders') as mapboxgl.GeoJSONSource | undefined
  if (!driversSource || !ordersSource) return
  driversSource.setData(driversToGeoJSON(fleet.drivers))
  ordersSource.setData(pendingOrdersToGeoJSON(fleet.orders))
}

export function AssignmentMap() {
  const { data: fleet, isLoading, isError, error } = useFleetSnapshot()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const fleetRef = useRef<FleetSnapshot | undefined>(undefined)

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

  useEffect(() => {
    fleetRef.current = fleet
  }, [fleet])

  useEffect(() => {
    if (!token || !containerRef.current) return
    if (mapRef.current) return

    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: MAP_CENTER,
      zoom: 12.2,
      pitch: 0,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('drivers', {
        type: 'geojson',
        data: EMPTY_FC,
      })

      map.addLayer({
        id: 'drivers-circle',
        type: 'circle',
        source: 'drivers',
        paint: {
          'circle-radius': 9,
          'circle-color': [
            'match',
            ['get', 'status'],
            'available',
            MAP_COLORS.accent,
            'in_transit',
            MAP_COLORS.aqua,
            'offline',
            MAP_COLORS.textMuted,
            MAP_COLORS.primary,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': MAP_COLORS.surface,
        },
      })

      map.addSource('orders', {
        type: 'geojson',
        data: EMPTY_FC,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 52,
      })

      map.addLayer({
        id: 'order-clusters',
        type: 'circle',
        source: 'orders',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': MAP_COLORS.primary,
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 22, 10, 28],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': MAP_COLORS.primarySoft,
        },
      })

      map.addLayer({
        id: 'order-cluster-count',
        type: 'symbol',
        source: 'orders',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': MAP_COLORS.surface,
        },
      })

      map.addLayer({
        id: 'order-unclustered',
        type: 'circle',
        source: 'orders',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': MAP_COLORS.primaryDark,
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': MAP_COLORS.surface,
        },
      })

      const popup = new mapboxgl.Popup({ closeButton: true, closeOnClick: true })

      const showDriverPopup = (e: mapboxgl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f?.properties) return
        const coords = (f.geometry as GeoPoint).coordinates.slice() as [number, number]
        const { displayName, status, vehiclePlate } = f.properties as Record<string, string>
        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font:12px/1.4 system-ui,sans-serif;min-width:180px">
              <div style="font-weight:600;margin-bottom:4px">${displayName}</div>
              <div>Estado: <strong>${driverStatusLabel(status)}</strong></div>
              <div>Placa: ${vehiclePlate}</div>
            </div>`,
          )
          .addTo(map)
      }

      const showOrderPopup = (e: mapboxgl.MapLayerMouseEvent) => {
        const f = e.features?.[0]
        if (!f?.properties) return
        const coords = (f.geometry as GeoPoint).coordinates.slice() as [number, number]
        const props = f.properties as Record<string, string>
        popup
          .setLngLat(coords)
          .setHTML(
            `<div style="font:12px/1.4 system-ui,sans-serif;min-width:200px">
              <div style="font-weight:600;margin-bottom:4px">Orden pendiente</div>
              <div>${props.customerName ?? ''}</div>
              <div>Zona: <strong>${props.zoneName ?? ''}</strong></div>
              <div>Prioridad: <strong>${props.priority ?? ''}</strong></div>
            </div>`,
          )
          .addTo(map)
      }

      map.on('click', 'drivers-circle', showDriverPopup)
      map.on('click', 'order-unclustered', showOrderPopup)

      map.on('click', 'order-clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['order-clusters'] })
        const id = features[0]?.properties?.cluster_id
        const source = map.getSource('orders') as mapboxgl.GeoJSONSource
        if (id == null || typeof source.getClusterExpansionZoom !== 'function') return
        source.getClusterExpansionZoom(id, (err, zoom) => {
          if (err || zoom == null) return
          const geometry = features[0]?.geometry as GeoPoint
          map.easeTo({
            center: geometry.coordinates as [number, number],
            zoom,
          })
        })
      })

      map.on('mouseenter', 'drivers-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'drivers-circle', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'order-unclustered', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'order-unclustered', () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('mouseenter', 'order-clusters', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'order-clusters', () => {
        map.getCanvas().style.cursor = ''
      })

      const snapshot = fleetRef.current
      if (snapshot) applyFleetToMap(map, snapshot)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !fleet) return
    if (!map.isStyleLoaded()) {
      map.once('idle', () => {
        if (fleetRef.current) applyFleetToMap(map, fleetRef.current)
      })
      return
    }
    applyFleetToMap(map, fleet)
  }, [fleet])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Órdenes del día"
          value={fleet?.kpis.ordersToday}
          loading={isLoading}
        />
        <KpiCard
          label="Choferes activos"
          value={fleet?.kpis.activeDrivers}
          loading={isLoading}
        />
        <KpiCard
          label="SLA a tiempo"
          value={fleet ? `${fleet.kpis.slaOnTimePercent.toFixed(1)}%` : undefined}
          loading={isLoading}
        />
        <KpiCard
          label="Incidencias abiertas"
          value={fleet?.kpis.openIncidents}
          loading={isLoading}
        />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-4 sm:flex-row sm:gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPinned className="size-4 text-primary" aria-hidden />
              Mapa de asignación en tiempo real
            </CardTitle>
            <CardDescription>
              Choferes por estado y órdenes <span className="font-medium text-foreground">pending</span>{' '}
              agrupadas por proximidad (clusters). Requiere token de Mapbox en entorno.
            </CardDescription>
          </div>
          {isLoading ? (
            <Badge variant="secondary" className="shrink-0 gap-1">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Cargando datos
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[60vh] min-h-[360px] w-full border-t border-border bg-muted/30 sm:h-[min(72vh,720px)]">
            {!token ? (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                Define <code className="rounded bg-muted px-1 py-0.5">VITE_MAPBOX_ACCESS_TOKEN</code> en un
                archivo <code className="rounded bg-muted px-1 py-0.5">.env</code> para inicializar Mapbox GL.
              </div>
            ) : (
              <>
                <div ref={containerRef} className="absolute inset-0" />
                {isError ? (
                  <div className="pointer-events-none absolute left-4 top-4 max-w-sm rounded-md border border-destructive/40 bg-background/95 px-3 py-2 text-xs text-destructive shadow-sm">
                    {error instanceof Error ? error.message : 'No se pudo cargar el snapshot operativo.'}
                  </div>
                ) : null}
                <div className="pointer-events-none absolute bottom-4 left-4 flex flex-wrap gap-3 rounded-md border border-border bg-background/95 px-3 py-2 text-xs shadow-sm">
                  <LegendSwatch color={MAP_COLORS.accent} label="Chofer disponible" />
                  <LegendSwatch color={MAP_COLORS.aqua} label="Chofer en servicio" />
                  <LegendSwatch color={MAP_COLORS.textMuted} label="Chofer offline" />
                  <LegendSwatch color={MAP_COLORS.primary} label="Órdenes pendientes (cluster)" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="size-2.5 rounded-full ring-2 ring-surface" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function KpiCard({
  label,
  value,
  loading,
}: {
  label: string
  value?: string | number
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
            </span>
          ) : (
            (value ?? '—')
          )}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}
