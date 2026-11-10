/**
 * 品牌壁纸数据源（C 端 · 独立集合 `wallpapers`）。
 *
 * 一条记录 = 一张壁纸：标题、说明、主题、三档图片地址、像素尺寸、体积与精选标记。
 * 首版只做 16:9 桌面壁纸，不建主题表；主题为固定枚举（见 `WALLPAPER_THEMES`）。
 *
 * 图片按用途分三档，均由桌面尺寸原图预渲染，避免首屏加载数兆大图：
 * - `thumbUrl`   960 × 540  WebP，首屏弧线卡片与网格
 * - `previewUrl` 1920 × 1080 WebP，大图弹层
 * - `fileUrl`    2560 × 1440 JPG，下载
 */
export type WallpaperTheme = '星海' | '赛博' | '秘境'

export type WallpaperItem = {
  id: string
  /** 壁纸标题 */
  title: string
  /** 一句说明（大图弹层展示） */
  desc: string
  /** 主题枚举 */
  theme: WallpaperTheme
  /** 下载地址：2560 × 1440 JPG */
  fileUrl: string
  /** 大图预览：1920 × 1080 WebP（缺省时前台回落到 fileUrl） */
  previewUrl?: string
  /** 缩略图：960 × 540 WebP（缺省时前台回落到 fileUrl） */
  thumbUrl?: string
  /** 下载文件像素宽 */
  width: number
  /** 下载文件像素高 */
  height: number
  /** 下载文件体积（展示用，如 235 KB） */
  size: string
  /** 是否本期精选（Hero 背景与首屏定位使用第一条精选） */
  featured: boolean
  /** 上架日期 */
  date: string
}

/** 主题元信息（顺序即前台 chips 顺序；「全部」由前台自行拼接） */
export const WALLPAPER_THEMES: Array<{ key: WallpaperTheme; label: string; desc: string }> = [
  { key: '星海', label: '星海', desc: '银河、星云与深空地平线。' },
  { key: '赛博', label: '赛博', desc: '霓虹城市、光路与未来秩序。' },
  { key: '秘境', label: '秘境', desc: '遗迹、镜面与漂浮的异世界。' },
]

export const WALLPAPERS: WallpaperItem[] = [
  {
    id: 'wp-violet-gate',
    title: '紫曜之门',
    desc: '长廊尽头亮起紫色的门，像一条通往另一个夜晚的入口。',
    theme: '秘境',
    fileUrl: '/media/wallpapers/violet-gate-2560.jpg',
    previewUrl: '/media/wallpapers/violet-gate.webp',
    thumbUrl: '/media/wallpapers/violet-gate-960.webp',
    width: 2560,
    height: 1440,
    size: '235 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-crystal-lake',
    title: '镜湖水晶',
    desc: '湖面静得没有一丝波纹，水晶结构悬在岸边，把光折成碎片。',
    theme: '秘境',
    fileUrl: '/media/wallpapers/crystal-lake-2560.jpg',
    previewUrl: '/media/wallpapers/crystal-lake.webp',
    thumbUrl: '/media/wallpapers/crystal-lake-960.webp',
    width: 2560,
    height: 1440,
    size: '349 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-neon-metropolis',
    title: '霓虹之城',
    desc: '入夜之后，城市自己发光，街区的轮廓被霓虹重新描了一遍。',
    theme: '赛博',
    fileUrl: '/media/wallpapers/neon-metropolis-2560.jpg',
    previewUrl: '/media/wallpapers/neon-metropolis.webp',
    thumbUrl: '/media/wallpapers/neon-metropolis-960.webp',
    width: 2560,
    height: 1440,
    size: '787 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-cloud-citadel',
    title: '云端悬城',
    desc: '城邦浮在云层之上，光从底部透上来，像一座安静的灯塔。',
    theme: '秘境',
    fileUrl: '/media/wallpapers/cloud-citadel-2560.jpg',
    previewUrl: '/media/wallpapers/cloud-citadel.webp',
    thumbUrl: '/media/wallpapers/cloud-citadel-960.webp',
    width: 2560,
    height: 1440,
    size: '322 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-star-sea-horizon',
    title: '星海地平线',
    desc: '行星弧线切开星空，地平线上浮着一层很薄的光。',
    theme: '星海',
    fileUrl: '/media/wallpapers/star-sea-horizon-2560.jpg',
    previewUrl: '/media/wallpapers/star-sea-horizon.webp',
    thumbUrl: '/media/wallpapers/star-sea-horizon-960.webp',
    width: 2560,
    height: 1440,
    size: '740 KB',
    featured: true,
    date: '2026-11-10',
  },
  {
    id: 'wp-crystal-canyon',
    title: '水晶回廊',
    desc: '水晶在两侧立成回廊，光沿着切面一层层向深处推进。',
    theme: '赛博',
    fileUrl: '/media/wallpapers/crystal-canyon-2560.jpg',
    previewUrl: '/media/wallpapers/crystal-canyon.webp',
    thumbUrl: '/media/wallpapers/crystal-canyon-960.webp',
    width: 2560,
    height: 1440,
    size: '827 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-galactic-heart',
    title: '银河之心',
    desc: '星云在中心聚成一枚漩涡，越往里，光越安静。',
    theme: '星海',
    fileUrl: '/media/wallpapers/galactic-heart-2560.jpg',
    previewUrl: '/media/wallpapers/galactic-heart.webp',
    thumbUrl: '/media/wallpapers/galactic-heart-960.webp',
    width: 2560,
    height: 1440,
    size: '607 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-skyline-core',
    title: '天际光核',
    desc: '城市天际线尽头悬着一枚光核，把整片天空压成冷蓝色。',
    theme: '赛博',
    fileUrl: '/media/wallpapers/skyline-core-2560.jpg',
    previewUrl: '/media/wallpapers/skyline-core.webp',
    thumbUrl: '/media/wallpapers/skyline-core-960.webp',
    width: 2560,
    height: 1440,
    size: '324 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-nebula-ring',
    title: '星云之环',
    desc: '星云被引力拉成一枚薄环，中心的暗处仍在缓慢旋转。',
    theme: '星海',
    fileUrl: '/media/wallpapers/nebula-ring-2560.jpg',
    previewUrl: '/media/wallpapers/nebula-ring.webp',
    thumbUrl: '/media/wallpapers/nebula-ring-960.webp',
    width: 2560,
    height: 1440,
    size: '362 KB',
    featured: false,
    date: '2026-11-10',
  },
  {
    id: 'wp-galactic-vortex',
    title: '星涡之门',
    desc: '星尘绕着一道竖立的环卷成漩涡，像一扇正在开启的门。',
    theme: '星海',
    fileUrl: '/media/wallpapers/galactic-vortex-2560.jpg',
    previewUrl: '/media/wallpapers/galactic-vortex.webp',
    thumbUrl: '/media/wallpapers/galactic-vortex-960.webp',
    width: 2560,
    height: 1440,
    size: '376 KB',
    featured: false,
    date: '2026-11-10',
  },
]
