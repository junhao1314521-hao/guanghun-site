import { useEffect, useRef, useState } from 'react'

/**
 * 高德地图（JS API 2.0）体验点地图。
 * - Key / 安全密钥来自构建期环境变量（VITE_AMAP_KEY / VITE_AMAP_SECURITY_CODE），不写死在代码里；
 * - 无 Key、脚本加载失败或没有坐标时，降级为提示，不影响下方网点列表；
 * - 点位与筛选后的网点保持一致，点击点位回调选中网点。
 */
export type MapVenue = {
  id: string
  name: string
  address?: string
  phone?: string
  lat?: number
  lng?: number
}

type AMapApi = {
  Map: new (container: HTMLElement, opts: Record<string, unknown>) => AMapMap
  Marker: new (opts: Record<string, unknown>) => AMapMarker
  InfoWindow: new (opts: Record<string, unknown>) => AMapInfoWindow
  Pixel: new (x: number, y: number) => unknown
}
type AMapMap = {
  add: (overlays: unknown | unknown[]) => void
  remove: (overlays: unknown | unknown[]) => void
  setFitView: (overlays?: unknown[], immediately?: boolean, avoid?: number[]) => void
  destroy: () => void
}
type AMapMarker = { on: (event: string, handler: () => void) => void }
type AMapInfoWindow = { open: (map: AMapMap, position: unknown) => void; close: () => void }

declare global {
  interface Window {
    AMap?: AMapApi
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

let loaderPromise: Promise<AMapApi> | null = null

function loadAmap(): Promise<AMapApi> {
  const key = import.meta.env.VITE_AMAP_KEY as string | undefined
  const securityCode = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined
  if (!key) return Promise.reject(new Error('未配置高德地图 Key'))
  if (window.AMap) return Promise.resolve(window.AMap)
  if (loaderPromise) return loaderPromise

  window._AMapSecurityConfig = securityCode ? { securityJsCode: securityCode } : undefined
  loaderPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}`
    script.onload = () => {
      if (window.AMap) resolve(window.AMap)
      else reject(new Error('高德地图脚本未返回 AMap'))
    }
    script.onerror = () => reject(new Error('高德地图脚本加载失败'))
    document.head.appendChild(script)
  })
  return loaderPromise
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char] ?? char
  })
}

export function VenueMap({
  venues,
  activeId,
  onSelect,
}: {
  venues: MapVenue[]
  activeId?: string | null
  onSelect?: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<AMapMap | null>(null)
  const markersRef = useRef<Array<{ id: string; marker: AMapMarker; position: unknown }>>([])
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [reason, setReason] = useState('')

  const points = venues.filter((venue) => Number.isFinite(venue.lat) && Number.isFinite(venue.lng))

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    loadAmap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return
        const first = points[0]
        const map = new AMap.Map(containerRef.current, {
          zoom: points.length > 1 ? 5 : 13,
          center: first ? [first.lng, first.lat] : [113.9345, 22.5405],
          viewMode: '2D',
          zooms: [4, 18],
        })
        mapRef.current = map
        setState('ready')
      })
      .catch((error: Error) => {
        if (cancelled) return
        setReason(error.message)
        setState('unavailable')
      })

    return () => {
      cancelled = true
      mapRef.current?.destroy()
      mapRef.current = null
      markersRef.current = []
    }
    // 初始化只执行一次；点位变化由下面的 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const AMap = window.AMap
    const map = mapRef.current
    if (!AMap || !map || state !== 'ready') return

    for (const item of markersRef.current) map.remove(item.marker)
    markersRef.current = []

    const created: AMapMarker[] = []
    for (const venue of points) {
      const marker = new AMap.Marker({
        position: [venue.lng, venue.lat],
        title: venue.name,
        content: `<div class="venue-map__pin" aria-hidden="true"></div>`,
        offset: new AMap.Pixel(-9, -9),
      })
      marker.on('click', () => {
        onSelect?.(venue.id)
        const info = new AMap.InfoWindow({
          offset: new AMap.Pixel(0, -18),
          content: `<div class="venue-map__info"><b>${escapeHtml(venue.name)}</b><span>${escapeHtml(
            venue.address ?? '',
          )}</span>${venue.phone ? `<em>${escapeHtml(venue.phone)}</em>` : ''}</div>`,
        })
        info.open(map, [venue.lng, venue.lat])
      })
      map.add(marker)
      markersRef.current.push({ id: venue.id, marker, position: [venue.lng, venue.lat] })
      created.push(marker)
    }
    if (created.length > 0) map.setFitView(created, false, [60, 60, 60, 60])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, points.map((venue) => `${venue.id}:${venue.lat},${venue.lng}`).join('|'), onSelect])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !activeId) return
    const target = markersRef.current.find((item) => item.id === activeId)
    if (target) {
      map.setFitView([target.marker], false, [80, 80, 80, 80])
    }
  }, [activeId])

  if (state === 'unavailable') {
    return (
      <div className="venue-map venue-map--fallback" role="status">
        <span className="venue-map__fallback-title">地图暂不可用</span>
        <span className="venue-map__fallback-desc">{reason || '请使用下方列表查看网点'}，下方网点列表仍可正常使用。</span>
      </div>
    )
  }

  return (
    <div className="venue-map">
      <div ref={containerRef} className="venue-map__canvas" aria-label="体验点地图" />
      {state === 'loading' && <div className="venue-map__loading">地图加载中…</div>}
      {state === 'ready' && points.length === 0 && (
        <div className="venue-map__empty">当前筛选下暂无带坐标的体验点</div>
      )}
    </div>
  )
}
