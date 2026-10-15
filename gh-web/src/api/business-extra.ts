/** 接口层 · 商业合作深度线：页面通过本模块取数，不直接 import data/business-extra */
import { transport, ApiError } from './client'
import {
  BIZ_CASES,
  BIZ_SCENES,
  BIZ_VENUES,
  BIZ_VENUE_CITIES,
  BIZ_VENUE_PROVINCES,
  getBizCaseDetail,
  getBizVenueDetail,
} from '../data/business-extra'
import type {
  CaseDetail,
  CaseSummary,
  SceneItem,
  VenueDetail,
  VenueSummary,
} from '../data/business-extra'

/** 场景与方案：一次返回全部场景卡（关联产品在前端渲染为链接） */
export function fetchBizScenes(signal?: AbortSignal): Promise<{ items: SceneItem[] }> {
  return transport({ path: '/api/business/scenes', signal }, () => ({ items: BIZ_SCENES }))
}

/** 合作案例列表：一次返回全量摘要，筛选在前端完成 */
export function fetchBizCases(signal?: AbortSignal): Promise<{ items: CaseSummary[] }> {
  return transport({ path: '/api/business/cases', signal }, () => ({ items: BIZ_CASES }))
}

/** 合作案例详情：按 id 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchBizCase(id: string, signal?: AbortSignal): Promise<CaseDetail> {
  return transport({ path: `/api/business/cases/${id}`, signal }, () => {
    const detail = getBizCaseDetail(id)
    if (!detail) throw new ApiError('未找到该合作案例', 404)
    return detail
  })
}

/** 线下体验点：一次返回网点列表与城市 / 省份选项，筛选在前端完成 */
export function fetchBizVenues(
  signal?: AbortSignal,
): Promise<{ items: VenueSummary[]; cities: string[]; provinces: string[] }> {
  return transport({ path: '/api/business/venues', signal }, () => ({
    items: BIZ_VENUES,
    cities: BIZ_VENUE_CITIES,
    provinces: BIZ_VENUE_PROVINCES,
  }))
}

/** 体验点详情：按 id 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchBizVenue(id: string, signal?: AbortSignal): Promise<VenueDetail> {
  return transport({ path: `/api/business/venues/${id}`, signal }, () => {
    const detail = getBizVenueDetail(id)
    if (!detail) throw new ApiError('未找到该体验点', 404)
    return detail
  })
}