/** 接口层 · 关于光魂页资源：页面通过本模块取数，不直接 import data/about */
import { transport } from './client'
import {
  CULTURE_TAGS,
  FACTS,
  JOBS,
  LAB_POINTS,
  LEGAL_CARDS,
  NEWS,
  PHILOSOPHY_POINTS,
  TIMELINE,
} from '../data/about'

export type AboutPayload = {
  PHILOSOPHY_POINTS: typeof PHILOSOPHY_POINTS
  FACTS: typeof FACTS
  LAB_POINTS: typeof LAB_POINTS
  TIMELINE: typeof TIMELINE
  NEWS: typeof NEWS
  CULTURE_TAGS: typeof CULTURE_TAGS
  JOBS: typeof JOBS
  LEGAL_CARDS: typeof LEGAL_CARDS
}

/** 关于页数据：一次返回品牌理念、关键事实、实验室、历程、新闻、文化与招聘、合规等全部区块 */
export function fetchAbout(signal?: AbortSignal): Promise<AboutPayload> {
  return transport({ path: '/api/about', signal }, () => ({
    PHILOSOPHY_POINTS,
    FACTS,
    LAB_POINTS,
    TIMELINE,
    NEWS,
    CULTURE_TAGS,
    JOBS,
    LEGAL_CARDS,
  }))
}