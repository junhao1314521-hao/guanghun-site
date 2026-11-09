/** 接口层 · 服务支持资源：页面通过本模块取数，不直接 import data/support */
import { transport } from './client'
import {
  FAQS,
  QUICK_ENTRIES,
  SUPPORT_SPOTS,
  WARRANTY_POINTS,
  type Faq,
  type QuickEntry,
  type SupportSpot,
} from '../data/support'

export type SupportPayload = {
  quickEntries: QuickEntry[]
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

/** 服务支持页数据：一次返回全部区块内容（快速入口、保修要点、网点与问答） */
export function fetchSupport(signal?: AbortSignal): Promise<SupportPayload> {
  return transport({ path: '/api/support', signal }, () => ({
    quickEntries: QUICK_ENTRIES,
    warrantyPoints: WARRANTY_POINTS,
    spots: SUPPORT_SPOTS,
    faqs: FAQS,
  }))
}

/** 服务支持 · 可选择的设备型号（只含有主图、已收录支持资料的型号） */
export type SupportDevice = {
  id: string
  model: string
  line: string
  summary: string
  image: string
}

/** 离线回退：与 MODEL_SUPPORTS / 静态图库一致的四款在售型号 */
const SUPPORT_DEVICES_FALLBACK: SupportDevice[] = [
  { id: 'gh-54027x1qe', model: '54027X1QE-W54', line: 'OLED旗舰', summary: '26.5 英寸 2K@540Hz 旗舰 OLED', image: '/media/products/transparent/gh-54027x1qe.webp' },
  { id: 'gh-32x1ue', model: '32X1UE-W16', line: '双模高刷', summary: '31.5 英寸 4K@165 / FHD@330 双模 OLED', image: '/media/products/transparent/gh-32x1ue.webp' },
  { id: 'gh-27x1qe-500', model: '27X1QE-500', line: 'OLED旗舰', summary: '26.5 英寸 2K@500Hz QD-OLED', image: '/media/products/transparent/gh-27x1qe-500.webp' },
  { id: 'gh-g27k180', model: 'G27K-180', line: '双模高刷', summary: '27 英寸 Fast IPS 双模', image: '/media/products/transparent/gh-g27k180.webp' },
]

/** 服务支持页设备选择器：后台型号集合 → 前台卡片 */
export function fetchSupportModels(signal?: AbortSignal): Promise<{ items: SupportDevice[] }> {
  return transport({ path: '/api/support/models', signal }, () => ({ items: SUPPORT_DEVICES_FALLBACK }))
}

/** 服务网点与体验点：后台「服务信息」维护，前台服务支持页展示 */
export function fetchServiceSpots(signal?: AbortSignal): Promise<{ items: ServiceSpot[] }> {
  return transport({ path: '/api/service-info', signal }, () => ({ items: SERVICE_SPOTS_FALLBACK }))
}