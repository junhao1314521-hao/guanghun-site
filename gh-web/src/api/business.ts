/** 接口层 · 商业合作资源：页面通过本模块取数，不直接 import data/business */
import { transport } from './client'
import {
  BRAND_ASSETS,
  COOP_CASES,
  COOP_CONTACTS,
  COOP_DIRECTIONS,
  COOP_TYPE_OPTIONS,
  RELEASE_PREPARE,
  RELEASE_RULES,
  RELEASE_STEPS,
  type BrandAsset,
  type CoopCase,
  type CoopDirection,
} from '../data/business'

export type BusinessPayload = {
  directions: CoopDirection[]
  releaseSteps: string[]
  releaseRules: string[]
  releasePrepare: string[]
  cases: CoopCase[]
  brandAssets: BrandAsset[]
  coopTypeOptions: string[]
  contacts: typeof COOP_CONTACTS
}

/** 商业合作页数据：一次返回全部区块内容（合作方向、送测流程、案例、品牌资料与联系方式） */
export function fetchBusiness(signal?: AbortSignal): Promise<BusinessPayload> {
  return transport({ path: '/api/business', signal }, () => ({
    directions: COOP_DIRECTIONS,
    releaseSteps: RELEASE_STEPS,
    releaseRules: RELEASE_RULES,
    releasePrepare: RELEASE_PREPARE,
    cases: COOP_CASES,
    brandAssets: BRAND_ASSETS,
    coopTypeOptions: COOP_TYPE_OPTIONS,
    contacts: COOP_CONTACTS,
  }))
}