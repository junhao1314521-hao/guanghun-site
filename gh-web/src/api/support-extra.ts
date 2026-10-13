/** 接口层 · 服务支持深度线资源：页面通过本模块取数，不直接 import data/support-extra */
import { ApiError, transport } from './client'
import {
  CONTACT_PAYLOAD,
  DOWNLOAD_CATEGORIES,
  DOWNLOAD_ITEMS,
  DOWNLOAD_TYPES,
  FAQ_CATEGORIES,
  FAQ_ITEMS,
  getDownloadDetail,
  getFaqDetail,
  getModelSupport,
} from '../data/support-extra'
import type {
  ContactPayload,
  DownloadDetail,
  DownloadItem,
  FaqDetail,
  FaqItem,
  ModelSupport,
} from '../data/support-extra'

export type DownloadsPayload = { items: DownloadItem[]; categories: string[]; types: string[] }
export type FaqPayload = { items: FaqItem[]; categories: string[] }
export type InquiryBody = { name: string; contact: string; model: string; topic: string; message: string }
export type InquiryResult = { ok: boolean; ticketId: string; receivedAt: string }

/** 下载中心列表：一次返回全部资料与筛选项（类别 / 类型），过滤在前端完成 */
export function fetchDownloads(signal?: AbortSignal): Promise<DownloadsPayload> {
  return transport({ path: '/api/downloads', signal }, () => ({
    items: DOWNLOAD_ITEMS,
    categories: DOWNLOAD_CATEGORIES,
    types: DOWNLOAD_TYPES,
  }))
}

/** 下载详情：按 id 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchDownload(id: string, signal?: AbortSignal): Promise<DownloadDetail> {
  return transport({ path: `/api/downloads/${id}`, signal }, () => {
    const detail = getDownloadDetail(id)
    if (!detail) throw new ApiError('未找到该资料', 404)
    return detail
  })
}

/** 常见问题列表：一次返回全部问答与类别筛选项 */
export function fetchFaqs(signal?: AbortSignal): Promise<FaqPayload> {
  return transport({ path: '/api/faq', signal }, () => ({ items: FAQ_ITEMS, categories: FAQ_CATEGORIES }))
}

/** 问答详情：按 id 查询，未命中抛 404 */
export function fetchFaq(id: string, signal?: AbortSignal): Promise<FaqDetail> {
  return transport({ path: `/api/faq/${id}`, signal }, () => {
    const detail = getFaqDetail(id)
    if (!detail) throw new ApiError('未找到该问答', 404)
    return detail
  })
}

/** 型号支持：按型号 id 聚合下载、问答与使用指南，未命中抛 404 */
export function fetchModelSupport(id: string, signal?: AbortSignal): Promise<ModelSupport> {
  return transport({ path: `/api/support/model/${id}`, signal }, () => {
    const model = getModelSupport(id)
    if (!model) throw new ApiError('未找到该型号的支持资料', 404)
    return model
  })
}

/** 提交咨询：真实 POST；占位环境仅回执工单号（后端不落库） */
export function submitInquiry(body: InquiryBody, signal?: AbortSignal): Promise<InquiryResult> {
  return transport({ path: '/api/inquiry', method: 'POST', body, signal }, () => ({
    ok: true,
    ticketId: `INQ-${Date.now()}`,
    receivedAt: new Date().toISOString(),
  }))
}

/** 联系方式：渠道、服务时间与办公 / 体验点 */
export function fetchContact(signal?: AbortSignal): Promise<ContactPayload> {
  return transport({ path: '/api/contact', signal }, () => CONTACT_PAYLOAD)
}