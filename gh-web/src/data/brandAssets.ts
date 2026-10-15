/**
 * 品牌资料（B 端，前端镜像）：与 `gh-server/src/data/brandAssets.ts` 同源，用于离线兜底。
 * 运行时以 `/api/business/brand-assets` 为准；接口不可用时回退本文件。
 */
export type BrandAssetItem = {
  id: string
  name: string
  desc: string
  category: string
  fileUrl: string
  format: string
  size: string
  date: string
  requireLead: boolean
}

export const BRAND_ASSET_CATEGORIES = ['全部', '规范', 'Logo', '图片', '送测']

export const BRAND_ASSET_ITEMS: BrandAssetItem[] = [
  {
    id: 'brand-vi-manual',
    name: '品牌视觉手册（VI）',
    desc: '含 Logo 使用规范、安全边距、配色与字体规范。',
    category: '规范',
    fileUrl: '/uploads/brand-vi-manual.pdf',
    format: 'PDF',
    size: '12.4 MB',
    date: '2026-09-10',
    requireLead: false,
  },
  {
    id: 'brand-logo-pack',
    name: '品牌 Logo 矢量包',
    desc: 'SVG / AI 双格式，含深浅两版与反白版。',
    category: 'Logo',
    fileUrl: '/uploads/brand-logo-pack.zip',
    format: 'ZIP',
    size: '8.6 MB',
    date: '2026-09-10',
    requireLead: false,
  },
  {
    id: 'brand-product-photos',
    name: '高清产品图包',
    desc: '透明底 PNG 产品图，含多机位；需授权后使用。',
    category: '图片',
    fileUrl: '/uploads/brand-product-photos.zip',
    format: 'ZIP',
    size: '120 MB',
    date: '2026-08-28',
    requireLead: true,
  },
  {
    id: 'brand-media-kit',
    name: '媒体送测说明与方法对照表',
    desc: '送测流程、测试方法版本与素材使用范围说明。',
    category: '送测',
    fileUrl: '/uploads/brand-media-kit.pdf',
    format: 'PDF',
    size: '3.2 MB',
    date: '2026-09-18',
    requireLead: true,
  },
]
