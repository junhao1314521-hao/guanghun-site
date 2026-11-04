/** 体验点通用工具：导航链接、距离、机型分类。 */
import type { VenueSummary } from '../data/business-extra'

export type VenuePoint = VenueSummary & { lat: number; lng: number }

export type NavVenue = {
  name: string
  address?: string
  province?: string
  city?: string
  lat?: number
  lng?: number
}

export function hasCoords<T extends { lat?: number; lng?: number }>(venue: T): venue is T & { lat: number; lng: number } {
  return typeof venue.lat === 'number' && typeof venue.lng === 'number' && Number.isFinite(venue.lat) && Number.isFinite(venue.lng)
}

/**
 * 高德「到这里去」：
 * - 有坐标 → 直接发起驾车导航（callnative=1 优先唤起高德 App，桌面回退网页）；
 * - 无坐标但有地址 → 打开高德搜索，由用户点选结果后导航；
 * - 都没有 → 用门店名 + 省份搜索。
 */
export function venueNavigationUrl(venue: NavVenue): string {
  if (hasCoords(venue)) {
    const to = `${venue.lng},${venue.lat},${encodeURIComponent(venue.name)}`
    return `https://uri.amap.com/navigation?to=${to}&mode=car&policy=1&src=guanghun&coordinate=gaode&callnative=1`
  }
  const keyword = venue.address || `${venue.province ?? ''}${venue.city ?? ''}${venue.name}`
  return `https://uri.amap.com/search?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(venue.city || venue.province || '')}&callnative=1`
}

/** 复制地址（浏览器不支持剪贴板时回退 execCommand） */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // 继续走回退
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

export function distanceKm(from: { lat: number; lng: number }, venue: VenueSummary): number | null {
  if (!hasCoords(venue)) return null
  const R = 6371
  const dLat = ((venue.lat - from.lat) * Math.PI) / 180
  const dLng = ((venue.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.lat * Math.PI) / 180) * Math.cos((venue.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function formatDistance(km: number): string {
  if (km < 10) return `${km.toFixed(1)} km`
  if (km < 1000) return `${Math.round(km)} km`
  return `${Math.round(km / 100) / 10} 千 km`
}

/** 机型筛选族：门店 products 里包含关键词即命中 */
export const VENUE_MODEL_FAMILIES = ['全部', '闪电', '枪神', '鹰眼', '极创', '光魂', '超凡剑圣', '全系'] as const

export function venueModelMatch(venue: VenueSummary, family: string): boolean {
  if (family === '全部') return true
  return (venue.products ?? []).some((model) => model.includes(family))
}

/** 省份简称（用于地图聚合与筛选展示） */
export const PROVINCE_SHORT: Record<string, string> = {
  广东省: '广东',
  山东省: '山东',
  河南省: '河南',
  安徽省: '安徽',
  浙江省: '浙江',
  云南省: '云南',
  山西省: '山西',
  黑龙江省: '黑龙江',
  四川省: '四川',
  湖南省: '湖南',
  湖北省: '湖北',
  河北省: '河北',
  辽宁省: '辽宁',
  新疆维吾尔自治区: '新疆',
  天津市: '天津',
  广西壮族自治区: '广西',
  吉林省: '吉林',
}

export function provinceShort(province: string): string {
  return PROVINCE_SHORT[province] ?? province
}

export const VENUE_REGIONS: { name: string; provinces: string[] }[] = [
  { name: '华南', provinces: ['广东省', '广西壮族自治区'] },
  { name: '华东', provinces: ['山东省', '安徽省', '浙江省'] },
  { name: '华中', provinces: ['河南省', '湖南省', '湖北省'] },
  { name: '华北', provinces: ['山西省', '河北省', '天津市'] },
  { name: '东北', provinces: ['黑龙江省', '辽宁省', '吉林省'] },
  { name: '西南', provinces: ['云南省', '四川省'] },
  { name: '西北', provinces: ['新疆维吾尔自治区'] },
]

export function venueRegionName(province: string): string {
  return VENUE_REGIONS.find((region) => region.provinces.includes(province))?.name ?? ''
}

export function venueLocation(venue: VenueSummary): string {
  return [venue.city, venue.area].filter(Boolean).join(' · ') || provinceShort(venue.province)
}

/** 门店类型文案：自营旗舰优先展示，合作体验点次之，服务网点最后 */
export function venueTypeLabel(type?: string): string {
  if (type === 'flagship') return '官方直营'
  if (type === 'service') return '授权服务点'
  return '合作体验点'
}

const VENUE_TYPE_RANK: Record<string, number> = { flagship: 0, experience: 1, service: 2 }

export function venueTypeRank(type?: string): number {
  return VENUE_TYPE_RANK[type ?? ''] ?? 1
}
