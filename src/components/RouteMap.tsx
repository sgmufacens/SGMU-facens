'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const liveDotIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#1d4ed8;border:3px solid white;
    box-shadow:0 0 0 4px rgba(29,78,216,0.35);
    animation:pulse-ring 1.5s ease-out infinite;
  "></div>
  <style>@keyframes pulse-ring{0%{box-shadow:0 0 0 0 rgba(29,78,216,0.5)}70%{box-shadow:0 0 0 10px rgba(29,78,216,0)}100%{box-shadow:0 0 0 0 rgba(29,78,216,0)}}</style>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
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
  liveCenter?: [number, number]
  zoom?: number
  followLatest?: boolean
  roadMatching?: boolean
}

const DEFAULT_CENTER: [number, number] = [-23.5015, -47.4526]

// Chama OSRM para encaixar os pontos GPS nas ruas reais
async function fetchRoadMatch(points: RoutePoint[]): Promise<[number, number][]> {
  if (points.length < 2) return points.map(p => [p.lat, p.lng])
  const pts = points.slice(-100)
  const coords = pts.map(p => `${p.lng},${p.lat}`).join(';')
  const radiuses = pts.map(() => '50').join(';')
  try {
    const res = await fetch(
      `https://router.project-osrm.org/match/v1/driving/${coords}?overview=full&geometries=geojson&radiuses=${radiuses}`
    )
    const data = await res.json()
    if (data.matchings?.length > 0) {
      return data.matchings.flatMap((m: any) =>
        m.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
      )
    }
  } catch { /* fallback para linha reta */ }
  return pts.map(p => [p.lat, p.lng])
}

// Centraliza o mapa no liveCenter (posição GPS em tempo real)
function LiveCenter({ position }: { position: [number, number] }) {
  const map = useMap()
  const prevRef = useRef<[number, number] | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    // Só move se saiu dos limites visíveis ou é a primeira posição
    const latLng = L.latLng(position[0], position[1])
    if (!prev || !map.getBounds().contains(latLng)) {
      map.panTo(latLng, { animate: true, duration: 0.4 })
    }
    prevRef.current = position
  }, [position, map])

  return null
}

// Segue o último ponto salvo quando não há liveCenter
function FollowLatest({ layers }: { layers: RouteLayer[] }) {
  const map = useMap()

  useEffect(() => {
    const allPoints = layers.flatMap(l => l.points)
    if (allPoints.length === 0) return
    const last = allPoints[allPoints.length - 1]
    const latLng = L.latLng(last.lat, last.lng)
    if (!map.getBounds().contains(latLng)) {
      map.panTo(latLng, { animate: true, duration: 0.4 })
    }
  }, [layers, map])

  return null
}

export default function RouteMap({ layers, center, liveCenter, zoom = 15, followLatest = false, roadMatching = false }: Props) {
  const [matchedLines, setMatchedLines] = useState<Map<number, [number, number][]>>(new Map())
  const prevLengths = useRef<number[]>([])

  // Road matching: chama OSRM quando os pontos mudam
  useEffect(() => {
    if (!roadMatching) return
    layers.forEach((layer, i) => {
      if (layer.points.length < 2) return
      if (layer.points.length === prevLengths.current[i]) return
      prevLengths.current[i] = layer.points.length
      fetchRoadMatch(layer.points).then(matched => {
        setMatchedLines(prev => new Map(prev).set(i, matched))
      })
    })
  }, [layers, roadMatching])

  const allPoints = layers.flatMap(l => l.points)
  const resolvedCenter: [number, number] =
    liveCenter ??
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
        const positions: [number, number][] = roadMatching && matchedLines.has(i)
          ? matchedLines.get(i)!
          : layer.points.map(p => [p.lat, p.lng])

        if (positions.length === 0) return null
        const lastPos = layer.points.length > 0
          ? [layer.points[layer.points.length - 1].lat, layer.points[layer.points.length - 1].lng] as [number, number]
          : positions[positions.length - 1]

        return (
          <div key={i}>
            {positions.length > 1 && (
              <Polyline positions={positions} color={layer.color} weight={4} opacity={0.85} />
            )}
            <Marker position={lastPos}>
              <Popup>{layer.label ?? `Rota ${i + 1}`}</Popup>
            </Marker>
          </div>
        )
      })}

      {liveCenter && (
        <>
          <LiveCenter position={liveCenter} />
          <Marker position={liveCenter} icon={liveDotIcon} />
        </>
      )}
      {followLatest && !liveCenter && <FollowLatest layers={layers} />}
    </MapContainer>
  )
}
