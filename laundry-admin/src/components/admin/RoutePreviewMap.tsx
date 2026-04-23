import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'leaflet/dist/leaflet.css'
import type { LatLngBoundsExpression } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Polyline, TileLayer, CircleMarker, useMap } from 'react-leaflet'

type RoutePreviewMapProps = {
  pickup: [number, number]
  mid: [number, number]
  destination: [number, number]
  token?: string
  onProviderChange?: (provider: 'mapbox' | 'osm') => void
}

type Provider = 'mapbox' | 'osm'

export function RoutePreviewMap({
  pickup,
  mid,
  destination,
  token,
  onProviderChange,
}: RoutePreviewMapProps) {
  const points = useMemo<[number, number][]>(() => [pickup, mid, destination], [pickup, mid, destination])
  const [provider, setProvider] = useState<Provider>(token ? 'mapbox' : 'osm')
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const bounds: LatLngBoundsExpression = points
  const effectiveProvider: Provider = token && provider === 'mapbox' ? 'mapbox' : 'osm'

  const mapboxLineCoords = useMemo<[number, number][]>(
    () => points.map(([lat, lng]) => [lng, lat]),
    [points],
  )

  useEffect(() => {
    onProviderChange?.(effectiveProvider)
  }, [effectiveProvider, onProviderChange])

  useEffect(() => {
    if (provider !== 'mapbox' || !token) return
    let cancelled = false

    const init = () => {
      if (cancelled) return
      if (!mapDivRef.current || mapRef.current) return
      if (mapDivRef.current.clientWidth < 20 || mapDivRef.current.clientHeight < 20) {
        window.requestAnimationFrame(init)
        return
      }

      mapboxgl.accessToken = token
      const map = new mapboxgl.Map({
        container: mapDivRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: mapboxLineCoords[0],
        zoom: 12,
      })
      mapRef.current = map
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

      map.on('error', () => {
        setProvider('osm')
      })

      map.on('load', () => {
        map.addSource('route-line', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'route-line-layer',
          type: 'line',
          source: 'route-line',
          paint: { 'line-color': '#143F73', 'line-width': 4, 'line-opacity': 0.95 },
        })
        map.addSource('route-points', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        })
        map.addLayer({
          id: 'route-points-layer',
          type: 'circle',
          source: 'route-points',
          paint: {
            'circle-radius': 7,
            'circle-color': ['match', ['get', 'kind'], 'pickup', '#A5CD39', 'destination', '#61BFC7', '#6B7280'],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#FFFFFF',
          },
        })
      })
    }

    const t = window.setTimeout(init, 50)
    return () => {
      cancelled = true
      window.clearTimeout(t)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [provider, token, mapboxLineCoords])

  useEffect(() => {
    if (provider !== 'mapbox') return
    const map = mapRef.current
    if (!map) return

    const apply = () => {
      const line = map.getSource('route-line') as mapboxgl.GeoJSONSource | undefined
      const pointsSource = map.getSource('route-points') as mapboxgl.GeoJSONSource | undefined
      if (!line || !pointsSource) return

      line.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: mapboxLineCoords },
            properties: {},
          },
        ],
      })
      pointsSource.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: mapboxLineCoords[0] },
            properties: { kind: 'pickup' },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: mapboxLineCoords[mapboxLineCoords.length - 1] },
            properties: { kind: 'destination' },
          },
        ],
      })
      const bounds = new mapboxgl.LngLatBounds()
      mapboxLineCoords.forEach((coord) => bounds.extend(coord as [number, number]))
      map.resize()
      map.fitBounds(bounds, { padding: 40, duration: 300 })
    }

    if (!map.isStyleLoaded()) {
      map.once('load', apply)
      return
    }
    apply()
  }, [mapboxLineCoords, provider])

  if (effectiveProvider === 'mapbox') {
    return <div ref={mapDivRef} className="h-full w-full" />
  }

  return (
    <MapContainer
      center={pickup}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom={false}
      attributionControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Polyline positions={points} pathOptions={{ color: '#143F73', weight: 4 }} />
      <CircleMarker center={pickup} radius={7} pathOptions={{ color: '#FFFFFF', fillColor: '#A5CD39', fillOpacity: 1 }} />
      <CircleMarker center={destination} radius={7} pathOptions={{ color: '#FFFFFF', fillColor: '#61BFC7', fillOpacity: 1 }} />
      <FitBounds bounds={bounds} />
    </MapContainer>
  )
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap()
  map.fitBounds(bounds, { padding: [40, 40] })
  return null
}
