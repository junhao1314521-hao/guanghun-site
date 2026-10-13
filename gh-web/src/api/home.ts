/** 接口层 · 首页资源：页面通过本模块取数，不直接 import data/home */
import { transport } from './client'
import {
  BRAND_STATS,
  COOP_TAGS,
  FEATURED_PRODUCTS,
  HERO_SLIDES,
  LADDER_TEASER_ROWS,
  NEWS,
  SCENES,
  SERVICE_ENTRIES,
  SPOTS,
  TECH_ARTICLES,
  type ArticleCard,
  type FeaturedProduct,
  type HeroSlide,
  type LadderRow,
  type NewsItem,
  type Scene,
  type Spot,
} from '../data/home'

// 复用数据层既有类型，供组件以 props 声明（类型来源单一）
export type { ArticleCard, FeaturedProduct, HeroSlide, LadderRow, NewsItem, Scene, Spot }
export type BrandStats = typeof BRAND_STATS
export type ServiceEntries = typeof SERVICE_ENTRIES

/** 首页载荷：把首屏所需的 10 个切片聚合为一个对象，各切片保持原类型 */
export type HomePayload = {
  heroSlides: HeroSlide[]
  coopTags: string[]
  featuredProducts: FeaturedProduct[]
  scenes: Scene[]
  spots: Spot[]
  brandStats: BrandStats
  ladderTeaserRows: LadderRow[]
  news: NewsItem[]
  serviceEntries: ServiceEntries
  techArticles: ArticleCard[]
}

/**
 * 首页数据：一次返回首屏全部切片，页面据此一次性渲染；
 * 上线配置 `VITE_API_BASE` 后由传输器改为请求 `/api/home`，页面与组件无需改动。
 */
export function fetchHome(signal?: AbortSignal): Promise<HomePayload> {
  return transport({ path: '/api/home', signal }, () => ({
    heroSlides: HERO_SLIDES,
    coopTags: COOP_TAGS,
    featuredProducts: FEATURED_PRODUCTS,
    scenes: SCENES,
    spots: SPOTS,
    brandStats: BRAND_STATS,
    ladderTeaserRows: LADDER_TEASER_ROWS,
    news: NEWS,
    serviceEntries: SERVICE_ENTRIES,
    techArticles: TECH_ARTICLES,
  }))
}