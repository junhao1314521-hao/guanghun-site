/**
 * 体验点独立页地图：省份聚合 / 单店点位 / 我的位置。
 * - 全国视图：按省聚合为「广东 7」气泡，点击下钻到该省；
 * - 已选省市 / 附近模式：显示单店点位，点击弹出信息窗（含「到这里去」导航）；
 * - 无 Key / 脚本失败：降级提示，不影响列表。
 */
import { useEffect, useRef, useState } from 'react'
import { hasCoords, provinceShort, venueNavigationUrl, type VenuePoint } from '../../lib/venue'
import type { VenueSummary } from '../../data/business-extra'
import { loadAmap, type AMapMap } from './VenueMap'

type Props = {
  venues: VenueSummary[]
  mode: 'clusters' | 'pins'
  activeId?: string | null
  userPoint?: { lat: number; lng: number } | null
  onSelect?: (id: string) => void
  onClusterSelect?: (province: string) => void
}

/** 辅助函数：把文本中的 & < > " ' 转义为 HTML 实体。 */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    return map[char] ?? char
  })
}

/** 生成地图信息窗 HTML（名称、地址、产品与导航/详情链接）。 */
function infoHtml(venue: VenuePoint): string {
  const models = (venue.products ?? []).map((model) => `<span class="venue-map__model">${escapeHtml(model)}</span>`).join('')
  return `<div class="venue-map__info">
    <b>${escapeHtml(venue.name)}</b>
    <span>${escapeHtml(venue.address || '地址待补充')}</span>
    ${models ? `<div class="venue-map__models">${models}</div>` : ''}
    <div class="venue-map__actions">
      <a class="venue-map__nav" href="${venueNavigationUrl(venue)}" target="_blank" rel="noopener noreferrer">到这里去 →</a>
      <a class="venue-map__detail" href="/business/venues/${encodeURIComponent(venue.id)}">查看详情</a>
    </div>
  </div>`
}

/** 组件：渲染体验点地图，支持省份聚合与单店点位两种模式。 */
export function VenueExplorerMap({ venues, mode, activeId, userPoint, onSelect, onClusterSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<AMapMap | null>(null)
  const overlaysRef = useRef<unknown[]>([])
  const infoRef = useRef<{ close: () => void } | null>(null)
  const selectRef = useRef(onSelect)
  const clusterRef = useRef(onClusterSelect)
  selectRef.current = onSelect
  clusterRef.current = onClusterSelect
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading')
  const [reason, setReason] = useState('')

  const points = venues.filter(hasCoords)

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    loadAmap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return
        const map = new AMap.Map(containerRef.current, {
          zoom: 4.6,
          center: [104.2, 35.6],
          viewMode: '2D',
          zooms: [3, 18],
          mapStyle: 'amap://styles/whitesmoke',
          features: ['bg', 'road', 'building'],
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
      infoRef.current?.close()
      infoRef.current = null
      mapRef.current?.destroy()
      mapRef.current = null
      overlaysRef.current = []
    }
  }, [])

  /**
   * 高德地图会动态生成瓦片 <img> 与内部 iframe，它们没有 alt / title：
   * 瓦片是装饰性图片 → alt="" + aria-hidden；iframe 补标题。
   * 用 MutationObserver 持续覆盖地图后续生成的节点，避免无障碍审计报错。
   */
  useEffect(() => {
    const container = containerRef.current
    if (!container || state !== 'ready') return
    const patch = () => {
      container.querySelectorAll<HTMLImageElement>('img:not([alt])').forEach((img) => {
        img.setAttribute('alt', '')
        img.setAttribute('aria-hidden', 'true')
      })
      container.querySelectorAll<HTMLIFrameElement>('iframe:not([title])').forEach((frame) => {
        frame.setAttribute('title', '体验点地图')
      })
    }
    patch()
    const observer = new MutationObserver(patch)
    observer.observe(container, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [state])

  const pointsKey = points.map((venue) => `${venue.id}:${venue.lat},${venue.lng}`).join('|')

  useEffect(() => {
    const AMap = window.AMap
    const map = mapRef.current
    if (!AMap || !map || state !== 'ready') return

    infoRef.current?.close()
    for (const overlay of overlaysRef.current) map.remove(overlay)
    overlaysRef.current = []

    if (points.length === 0) return

    const created: unknown[] = []

    if (mode === 'clusters') {
      const groups = new Map<string, VenuePoint[]>()
      for (const venue of points) {
        const list = groups.get(venue.province) ?? []
        list.push(venue)
        groups.set(venue.province, list)
      }
      const positioned = []
      for (const [province, group] of groups) {
        const lng = group.reduce((sum, venue) => sum + venue.lng, 0) / group.length
        const lat = group.reduce((sum, venue) => sum + venue.lat, 0) / group.length
        const label = provinceShort(province)
        const pixel = map.lngLatToContainer?.([lng, lat])
        positioned.push({
          province,
          count: group.length,
          label,
          lng,
          lat,
          px: pixel?.x ?? 0,
          py: pixel?.y ?? 0,
          ox: pixel?.x ?? 0,
          oy: pixel?.y ?? 0,
          w: 34 + label.length * 12,
          h: 34,
        })
      }
      // 省份气泡在东部密集区做轻微避让：只移动视觉偏移，不改变真实经纬度
      const gap = 8
      for (let iter = 0; iter < 120; iter++) {
        let moved = false
        for (let i = 0; i < positioned.length; i++) {
          for (let k = i + 1; k < positioned.length; k++) {
            const a = positioned[i]
            const b = positioned[k]
            const dx = b.px - a.px
            const dy = b.py - a.py
            const overlapX = (a.w + b.w) / 2 + gap - Math.abs(dx)
            const overlapY = (a.h + b.h) / 2 + gap - Math.abs(dy)
            if (overlapX > 0 && overlapY > 0) {
              moved = true
              if (overlapX < overlapY) {
                const shift = overlapX / 2 * (dx >= 0 ? 1 : -1)
                a.px -= shift
                b.px += shift
              } else {
                const shift = overlapY / 2 * (dy >= 0 ? 1 : -1)
                a.py -= shift
                b.py += shift
              }
            }
          }
        }
        for (const item of positioned) {
          item.px += (item.ox - item.px) * 0.02
          item.py += (item.oy - item.py) * 0.02
        }
        if (!moved && iter > 20) break
      }
      for (const item of positioned) {
        const marker = new AMap.Marker({
          position: [item.lng, item.lat],
          anchor: 'center',
          offset: new AMap.Pixel(item.px - item.ox, item.py - item.oy),
          content: `<div class="venue-cluster${item.count >= 5 ? ' venue-cluster--lg' : ''}"><span class="venue-cluster__count">${item.count}</span><span class="venue-cluster__name">${escapeHtml(item.label)}</span></div>`,
        })
        marker.on('click', () => clusterRef.current?.(item.province))
        map.add(marker)
        created.push(marker)
      }
    } else {
      for (const venue of points) {
        const active = venue.id === activeId ? ' is-active' : ''
        const marker = new AMap.Marker({
          position: [venue.lng, venue.lat],
          anchor: 'center',
          title: venue.name,
          content: `<div class="venue-pin${active}"></div>`,
        })
        marker.on('click', () => {
          selectRef.current?.(venue.id)
        })
        map.add(marker)
        created.push(marker)
      }
      if (userPoint) {
        const marker = new AMap.Marker({
          position: [userPoint.lng, userPoint.lat],
          anchor: 'center',
          content: '<div class="venue-me" aria-label="我的位置"></div>',
        })
        map.add(marker)
        created.push(marker)
      }
    }

    overlaysRef.current = created
    map.setFitView(created, false, [70, 70, 90, 70])
  }, [state, mode, pointsKey, activeId, userPoint?.lat, userPoint?.lng])

  // 点击列表门店 / 地图点位后：地图移动到该门店并弹出地址窗口
  useEffect(() => {
    const AMap = window.AMap
    const map = mapRef.current
    if (!AMap || !map || state !== 'ready') return
    const venue = activeId ? points.find((item) => item.id === activeId) : null
    if (!venue) {
      infoRef.current?.close()
      return
    }
    map.setZoomAndCenter?.(13, [venue.lng, venue.lat], false, 500)
    infoRef.current?.close()
    const info = new AMap.InfoWindow({
      offset: new AMap.Pixel(0, -14),
      isCustom: true,
      autoMove: true,
      content: infoHtml(venue),
    })
    info.open(map, [venue.lng, venue.lat])
    infoRef.current = info
  }, [activeId, state, pointsKey])

  if (state === 'unavailable') {
    return (
      <div className="venue-explorer-map venue-explorer-map--fallback" role="status">
        <span className="venue-explorer-map__fallback-title">地图暂不可用</span>
        <span className="venue-explorer-map__fallback-desc">{reason || '请使用下方列表查看门店'}，下方列表仍可正常使用。</span>
      </div>
    )
  }

  return (
    <div className="venue-explorer-map">
      <div ref={containerRef} className="venue-explorer-map__canvas" aria-label="产品体验点地图" />
      {state === 'loading' && <div className="venue-explorer-map__loading">地图加载中…</div>}
      {state === 'ready' && points.length === 0 && (
        <div className="venue-explorer-map__empty">当前筛选下暂无带坐标的体验点</div>
      )}
    </div>
  )
}
