'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix leaflet marker icons broken by webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export type RoutePoint = { lat: number; lng: number; recorded_at?: string }

export type RouteLayer = {
  points: RoutePoint[]
  color: string
  label?: string
}

type Props = {
  layers: RouteLayer[]
  center?: [number, number]
  zoom?: number
  followLatest?: boolean
}

// Sorocaba, SP — centro padrão se não houver pontos
const DEFAULT_CENTER: [number, number] = [-23.5015, -47.4526]

function FlyToLatest({ layers }: { layers: RouteLayer[] }) {
  const map = useMap()

  useEffect(() => {
    const allPoints = layers.flatMap(l => l.points)
    if (allPoints.length === 0) return
    const last = allPoints[allPoints.length - 1]
    map.flyTo([last.lat, last.lng], map.getZoom(), { animate: true, duration: 1 })
  }, [layers, map])

  return null
}

export default function RouteMap({ layers, center, zoom = 15, followLatest = false }: Props) {
  const allPoints = layers.flatMap(l => l.points)
  const resolvedCenter: [number, number] =
    center ??
    (allPoints.length > 0
      ? [allPoints[allPoints.length - 1].lat, allPoints[allPoints.length - 1].lng]
      : DEFAULT_CENTER)

  return (
    <MapContainer
      center={resolvedCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {layers.map((layer, i) => {
        const positions = layer.points.map(p => [p.lat, p.lng] as [number, number])
        if (positions.length === 0) return null
        return (
          <div key={i}>
            {positions.length > 1 && (
              <Polyline positions={positions} color={layer.color} weight={4} opacity={0.85} />
            )}
            {/* Marcador no último ponto de cada rota */}
            <Marker position={positions[positions.length - 1]}>
              <Popup>{layer.label ?? `Rota ${i + 1}`}</Popup>
            </Marker>
          </div>
        )
      })}

      {followLatest && <FlyToLatest layers={layers} />}
    </MapContainer>
  )
}
