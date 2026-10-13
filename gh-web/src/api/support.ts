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