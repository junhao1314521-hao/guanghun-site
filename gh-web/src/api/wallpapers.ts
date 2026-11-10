import { transport } from './client'

/** 品牌壁纸（C 端公开数据，集合 `wallpapers`） */
export type WallpaperTheme = '星海' | '赛博' | '秘境'

export type WallpaperItem = {
  id: string
  title: string
  desc: string
  theme: WallpaperTheme
  /** 下载地址：2560 × 1440 JPG */
  fileUrl: string
  /** 大图预览：1920 × 1080 WebP */
  previewUrl?: string
  /** 缩略图：960 × 540 WebP */
  thumbUrl?: string
  width: number
  height: number
  size: string
  featured: boolean
  date: string
  /** 服务端文件探测结果：missing 表示文件未就位，前台禁用下载 */
  fileStatus?: 'ok' | 'missing' | 'placeholder' | 'external' | 'unknown'
}

export type WallpaperThemeMeta = {
  key: WallpaperTheme
  label: string
  desc: string
  count: number
}

export type WallpaperPayload = {
  items: WallpaperItem[]
  themes: WallpaperThemeMeta[]
}

/** 拉取壁纸列表 + 主题枚举（含实时数量） */
export function fetchWallpapers(signal?: AbortSignal): Promise<WallpaperPayload> {
  return transport<WallpaperPayload>({ path: '/api/wallpapers', signal }, () => ({ items: [], themes: [] }))
}
