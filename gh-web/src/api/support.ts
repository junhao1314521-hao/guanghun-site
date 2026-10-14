/** 接口层 · 服务支持资源：页面通过本模块取数，不直接 import data/support */
import { transport } from './client'
import {
  DOWNLOADS,
  FAQS,
  QUICK_ENTRIES,
  SUPPORT_SPOTS,
  WARRANTY_POINTS,
  type DownloadRow,
  type Faq,
  type QuickEntry,
  type SupportSpot,
} from '../data/support'

export type SupportPayload = {
  quickEntries: QuickEntry[]
  downloads: DownloadRow[]
  warrantyPoints: string[]
  spots: SupportSpot[]
  faqs: Faq[]
}

/** 服务网点与体验点（后台「服务信息」维护，前台服务支持页展示） */
export type ServiceSpot = {
  id: string
  name: string
  city: string
  type: string
  phone: string
  hours: string
  status: string
  address: string
}

/** 离线回退：与集合 seed 一致的服务网点条目 */
const SERVICE_SPOTS_FALLBACK: ServiceSpot[] = [
  { id: 'si-001', name: '光魂深圳旗舰体验店', city: '深圳', type: '体验点', phone: '400-000-0000', hours: '10:00–21:00', status: '营业中', address: '南山区科技园光魂大厦 1F' },
  { id: 'si-002', name: '光魂北京授权服务网点', city: '北京', type: '服务网点', phone: '400-000-0001', hours: '09:30–18:30', status: '营业中', address: '海淀区中关村大街 88 号' },
  { id: 'si-003', name: '光魂上海授权服务网点', city: '上海', type: '服务网点', phone: '400-000-0002', hours: '09:30–18:30', status: '营业中', address: '徐汇区漕溪北路 100 号' },
]

/** 服务支持页数据：一次返回全部区块内容（快速入口、下载、保修要点、网点与问答） */
export function fetchSupport(signal?: AbortSignal): Promise<SupportPayload> {
  return transport({ path: '/api/support', signal }, () => ({
    quickEntries: QUICK_ENTRIES,
    downloads: DOWNLOADS,
    warrantyPoints: WARRANTY_POINTS,
    spots: SUPPORT_SPOTS,
    faqs: FAQS,
  }))
}

/** 服务网点与体验点：后台「服务信息」维护，前台服务支持页展示 */
export function fetchServiceSpots(signal?: AbortSignal): Promise<{ items: ServiceSpot[] }> {
  return transport({ path: '/api/service-info', signal }, () => ({ items: SERVICE_SPOTS_FALLBACK }))
}