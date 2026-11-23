/**
 * 后台体验点地图（高德 JS API）。
 * - 复用前台的 `loadAmap`（Key 来自构建期 `VITE_AMAP_KEY`，不写死）；
 * - 仅有经纬度的体验点会上图；无 Key / 脚本失败时降级为提示，不影响列表布局；
 * - 点击标记回调体验点 id，供列表联动。
 */
import { useEffect, useRef, useState } from 'react'
import { loadAmap, type AMapMap } from '../site/VenueMap'

export type AdminVenuePoint = {
  id: string
  name: string
  address?: string
  city?: string
  province?: string
  lat?: number
  lng?: number
}

/** 转义地图信息窗 HTML */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char] ?? char
  })
}

export function AdminVenueMap({
  venues,
  activeId,
  onSelect,
}: {
  venues: AdminVenuePoint[]
  activeId?: string | null
  onSelect?: (id: string) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<AMapMap | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [reason, setReason] = useState('')
  const selectRef = useRef(onSelect)
  selectRef.current = onSelect

  const points = venues.filter(
    (venue) => typeof venue.lat === 'number' && typeof venue.lng === 'number' && Number.isFinite(venue.lat) && Number.isFinite(venue.lng),
  )

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return
    setState('loading')

    loadAmap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return
        const map = new AMap.Map(containerRef.current, {
          zoom: 4.6,
          center: [104.2, 35.6],
          viewMode: '2D',
          zooms: [3, 18],
        })
        mapRef.current = map
        const markers = points.map((venue) => {
          const marker = new AMap.Marker({
            position: [venue.lng, venue.lat],
            title: venue.name,
          })
          const info = new AMap.InfoWindow({
            content: `<div style="min-width:180px"><b>${escapeHtml(venue.name)}</b>${
              venue.address ? `<div style="color:#666;margin-top:4px">${escapeHtml(venue.address)}</div>` : ''
            }</div>`,
            offset: new AMap.Pixel(0, -28),
          })
          marker.on('click', () => {
            info.open(map, [venue.lng, venue.lat])
            selectRef.current?.(venue.id)
          })
          return marker
        })
        if (markers.length > 0) {
          map.add(markers)
          map.setFitView(markers, false, [40, 40, 40, 40])
        }
        setState('ready')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setReason(error instanceof Error ? error.message : '地图不可用')
        setState('unavailable')
      })

    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.destroy()
        mapRef.current = null
      }
    }
    // points 由 venues 派生；以 venues 作为重建依据
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues])

  // 选中项高亮：把地图中心移到该点（标记样式由 SDK 默认样式承担）
  useEffect(() => {
    if (!activeId || !mapRef.current) return
    const target = points.find((venue) => venue.id === activeId)
    if (!target || target.lat === undefined || target.lng === undefined) return
    mapRef.current.setZoomAndCenter?.(11, [target.lng, target.lat], false, 300)
  }, [activeId, points])

  return (
    <div className="venues-map-wrap">
      <div ref={containerRef} className="venues-map" role="img" aria-label="体验点地图" />
      {state === 'loading' && <p className="venues-map__hint">地图加载中…</p>}
      {state === 'unavailable' && (
        <div className="venues-map__fallback" role="status">
          <strong>地图暂不可用</strong>
          <p>{reason}。可切换回「列表」布局继续编辑；地图不会影响体验点数据。</p>
        </div>
      )}
      {state === 'ready' && points.length === 0 && (
        <p className="venues-map__hint">当前筛选结果中没有带经纬度的体验点。</p>
      )}
      {state === 'ready' && points.length > 0 && (
        <p className="venues-map__hint">已展示 {points.length} 个有坐标的体验点，点击标记可选中。</p>
      )}
    </div>
  )
}
