/**
 * 品牌资料（B 端）数据源：品牌规范、Logo、产品图与送测物料。
 *
 * 与 C 端「下载中心」（`downloads` 集合）**数据完全分开**：受众不同（渠道 / 媒体 / 合作方 vs 终端用户），
 * 独立集合 `brand-assets` 承载，互不混类。字段与前台「品牌资料」区块一一对应。
 *
 * 名称、格式与体积均为占位示例，上线前由运营替换为真实文件 / 外链地址。
 */
export type BrandAssetItem = {
  id: string
  /** 资料名称 */
  name: string
  /** 说明 */
  desc: string
  /** 分类：规范 / Logo / 图片 / 送测 … */
  category: string
  /** 文件地址：可为 `/uploads/<文件名>`（本服务素材库），也可为外链 / 对象存储地址 */
  fileUrl: string
  /** 文件格式（如 PDF / ZIP / AI / PNG） */
  format: string
  /** 文件大小 */
  size: string
  /** 更新日期 */
  date: string
  /** 是否需要留资 / 申请授权：打开后点击给出留资提示（跳 /inquiry） */
  requireLead: boolean
}

/** 分类筛选项（首项「全部」表示不筛选） */
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
