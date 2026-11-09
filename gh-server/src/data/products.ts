/** 产品列表页数据：以光魂（小雪人数码）OLED 电竞显示器为主线 + 少量周边，供商品接口层消费 */
import type { DeviceVariant } from './device-variant'
import type { ProductReviewView } from './productReviews'

export type ProductCategory = 'OLED旗舰' | '双模高刷' | '电竞IPS' | '周边'
/** 视频接口规格（显示器主接口） */
export type ProductConnection = 'DP 2.1' | 'HDMI 2.1' | 'USB-C'

/** 结构化参数项（唯一完整规格源；group 用于详情页分组折叠） */
export type ProductAttribute = {
  label: string
  value: string
  /** 规格分组：显示 / 接口 / 电源 / 机械 / 物理尺寸 / 包装 / 认证 */
  group?: string
}

/** SKU 规格组（如 颜色 / 版本）；values 支持数组或「逗号分隔」文本（后台录入） */
export type ProductSkuOption = {
  name: string
  values: string | string[]
}

/** SKU 明细：option1..3 按规格组顺序填写；options 为前端规范化后的等价数组 */
export type ProductSku = {
  id?: string
  option1?: string
  option2?: string
  option3?: string
  options?: string[]
  price?: string
  stock?: number | string
  skuCode?: string
}

export type Product = {
  id: string
  model: string
  name: string
  category: ProductCategory
  connection?: ProductConnection
  specs: string[]
  status: { level: 'success' | 'warning'; text: string }
  price: string
  /** 参考价的数值形式（元），仅用于排序与价格区间筛选 */
  priceValue: number
  /** 上新日期，用于「上新时间」排序 */
  releasedAt: string
  variant: DeviceVariant
  flag?: string
  /** 卖点 / 亮点列表 */
  features?: string[]
  /** 结构化参数（面板 / 分辨率 / 刷新率 / 响应时间 / 亮度 / 接口等） */
  attributes?: ProductAttribute[]
  /** 包装清单 */
  inBox?: string[]
  /** 保修政策 */
  warranty?: string
  /** 兼容系统 */
  os?: string[]
  /** 整机重量（克） */
  weight?: number
  /** 相册图片地址（按产品单独上传；可排序，不设硬上限，建议 ≤ 20 张）。空 / 缺省时前台回退内置 4 视角图 */
  gallery?: string[]
  /** 详情富文本 HTML（长图 / 图文混排；前台渲染前复用 sanitizeRichText 白名单净化）。空 / 缺省时不渲染 */
  detailHtml?: string
  /** SKU 规格组（颜色 / 版本等；缺省则不显示选择器） */
  skuOptions?: ProductSkuOption[]
  /** SKU 明细（价格 / 库存 / 编码；缺省则沿用产品参考价） */
  skus?: ProductSku[]
  /** H5 长图切片（桌面）；按顺序垂直拼接 */
  h5LongImages?: string[]
  /** H5 长图切片（移动端，可选；按索引与桌面切片对应，缺省回退桌面图） */
  h5LongImagesMobile?: string[]
  /** 购买链接（详情页 / 对比页主按钮「立即购买」取此值；未填则回退） */
  buyUrl?: string
  /** 性能摘要（标称 / 实测）：后台可维护；有值时覆盖内置摘要 */
  summaryRows?: ProductSummaryRowInput[]
  /**
   * 3D 预览（详情页主图区）：单文件 .glb 地址。
   * 只有 `model3dEnabled === true` 且本字段非空时，前台才显示 3D 入口；
   * 缺省 / 关闭时行为与现在完全一致（纯图片相册）。
   */
  model3d?: string
  /** 3D 加载中的首帧封面（可选，缺省用相册首图） */
  model3dPoster?: string
  /** 3D 预览总开关（默认关闭；模型未就绪时保持关闭，前台不出现 3D 按钮） */
  model3dEnabled?: boolean
  /** 主图视频地址（后台维护；留空则前台不显示视频入口） */
  videoUrl?: string
  /** 主图视频封面（可选；留空用相册首图） */
  videoPoster?: string
  /** 同系列标识（后台维护；留空按产品分类自动归类到对应系列） */
  seriesId?: string
}

/** 后台录入的摘要行：实测留空时只展示标称值 */
export type ProductSummaryRowInput = {
  label?: string
  nominal?: string
  measured?: string
}

/** 淘宝官方店购买链接（item id 直达商品页） */
const TB = (id: string) => `https://item.taobao.com/item.htm?id=${id}`

export const PRODUCTS: Product[] = [
  {
    id: 'gh-54027x1qe', model: '27X1QE-W54', name: '闪电 540Hz 电竞OLED显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['26.5 英寸', '2K 540Hz / HD 720Hz', '0.03 ms', 'W-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 5399, releasedAt: '2026-09-20', variant: 'monitor', flag: '旗舰',
    features: ['第四代 W-OLED 面板，2K 540Hz 满速刷新', '0.03 ms GTG 灰阶响应，告别拖影', '368 万像素级控光，原生 100 万:1 对比度', '满速 DP 2.1（80 Gbps）· 原厂石墨烯散热', 'CNC 阳极氧化铝背板 · AR 光面抗反涂层', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: '第四代 W-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '26.5 英寸 · 2560×1440' },
      { group: '显示', label: '刷新率', value: '540 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '显示', label: '对比度', value: '1,000,000:1' },
      { group: '显示', label: '色域', value: '99% DCI-P3 · 原生 10bit' },
      { group: '接口', label: '接口', value: 'DP 2.1 (UHBR20) · HDMI 2.1 · USB-C' },
      { group: '接口', label: '同步技术', value: 'G-SYNC 兼容 · FreeSync · VRR+' },
      { group: '认证', label: 'HDR 认证', value: 'DisplayHDR True Black 400' },
      { group: '电源', label: '功耗', value: '典型 38 W / 峰值 72 W' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 130 mm · 俯仰 -5°~20°' },
      { group: '物理尺寸', label: '净重', value: '6.5 kg（含支架）' },
      { group: '认证', label: '认证', value: 'CE / FCC / CCC' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    weight: 6500,
    gallery: ['/media/products/transparent/gh-54027x1qe.webp'],
    buyUrl: TB('1072729325444'),
  },
  {
    id: 'gh-28027x1qe', model: '27X1QE-W28', name: '闪电 280Hz 电竞OLED显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['26.5 英寸', '2K 280Hz', '1500 nit', 'W-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 2999, releasedAt: '2026-08-15', variant: 'monitor', flag: '热销',
    features: ['第四代 W-OLED 面板，26.5 英寸 2K@280Hz', '峰值亮度 1500 nit，368 万像素级控光', 'CNC 阳极氧化铝背板 · 原厂石墨烯散热', '四边窄边框设计', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: '第四代 W-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '26.5 英寸 · 2560×1440' },
      { group: '显示', label: '刷新率', value: '280 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '显示', label: '峰值亮度', value: '1500 nit' },
      { group: '接口', label: '接口', value: 'DP 2.1 · HDMI 2.1' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 / 旋转 / 俯仰' },
      { group: '机械', label: '背板', value: 'CNC 阳极氧化铝 · 石墨烯散热' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    gallery: ['/media/products/transparent/gh-28027x1qe.webp'],
    buyUrl: TB('758519598484'),
  },
  {
    id: 'gh-32x1ue', model: '32X1UE-W16', name: 'Meta 双模 4K 电竞显示器', category: '双模高刷', connection: 'DP 2.1',
    specs: ['31.5 英寸', '4K@165 / FHD@330', 'META OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 5499, releasedAt: '2026-09-05', variant: 'monitor', flag: '双模',
    features: ['31.5 英寸双模：4K@165Hz 与 FHD@330Hz 一机两用', '进口 LG META OLED 面板', '满速 DP 2.1 接口', '四微边全面屏设计', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: 'META OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '31.5 英寸 · 3840×2160' },
      { group: '显示', label: '刷新率', value: '4K@165 Hz / FHD@330 Hz（双模）' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '接口', label: '接口', value: 'DP 2.1 · HDMI 2.1' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 / 旋转 / 俯仰' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    gallery: ['/media/products/transparent/gh-32x1ue.webp'],
    buyUrl: TB('817280696488'),
  },
  {
    id: 'gh-27x1ue-q16', model: '27X1UE-Q16', name: '无双战神 Q16 4K QD-OLED 显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['26.5 英寸', '4K 165Hz', 'QD-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 3999, releasedAt: '2026-05-20', variant: 'monitor', flag: '4K',
    features: ['26.5 英寸 4K QD-OLED 面板', '165Hz 刷新率，0.03 ms 灰阶响应', '量子点广色域，原生 10bit', '四微边全面屏设计', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: 'QD-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '26.5 英寸 · 3840×2160' },
      { group: '显示', label: '刷新率', value: '165 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '接口', label: '接口', value: 'DP 2.1 · HDMI 2.1' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 / 旋转 / 俯仰' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    gallery: ['/media/products/transparent/gh-27x1ue-q16.webp'],
    buyUrl: TB('740313579537'),
  },
  {
    id: 'gh-32x1ue-q24', model: '32X1UE-Q24', name: 'Q24 31.5 英寸 4K 240Hz QD-OLED 显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['31.5 英寸', '4K 240Hz', 'QD-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 4688, releasedAt: '2026-07-10', variant: 'monitor', flag: '大屏',
    gallery: ['/media/products/transparent/gh-32x1ue-q24.webp'],
    features: ['31.5 英寸 4K 240Hz 第四代 QD-OLED', 'BLACKSHIELD 涂层，提升抗反与黑位表现', '满速率 DP 2.1 接口', '四微边全面屏设计 · CNC 阳极氧化铝背板', '硬件低蓝光，三年质保含烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: '第四代 QD-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '31.5 英寸 · 3840×2160' },
      { group: '显示', label: '刷新率', value: '240 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '显示', label: '涂层', value: 'BLACKSHIELD 抗反涂层' },
      { group: '接口', label: '接口', value: 'DP 2.1 · HDMI 2.1' },
      { group: '机械', label: '背板', value: 'CNC 阳极氧化铝' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    buyUrl: TB('727917110371'),
  },
  {
    id: 'gh-27x1qe-q32', model: '27X1QE-Q32', name: 'Q32 26.5 英寸 2K 320Hz QD-OLED 显示器', category: 'OLED旗舰', connection: 'HDMI 2.1',
    specs: ['26.5 英寸', '2K 320Hz', 'QD-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 3099, releasedAt: '2026-06-12', variant: 'monitor', flag: '高刷',
    gallery: ['/media/products/transparent/gh-27x1qe-q32.webp'],
    features: ['26.5 英寸 2K 320Hz QD-OLED', '0.03 ms 灰阶响应，高速画面无拖影', 'HDMI 2.1 接口', '四微边全面屏设计', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: 'QD-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '26.5 英寸 · 2560×1440' },
      { group: '显示', label: '刷新率', value: '320 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '接口', label: '接口', value: 'HDMI 2.1 · DP 1.4' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 / 旋转 / 俯仰' },
    ],
    inBox: ['显示器 × 1', 'HDMI 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    buyUrl: TB('750656102714'),
  },
  {
    id: 'gh-27x1qe-500', model: '27X1QE-500', name: '闪电 500 电竞OLED显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['26.5 英寸', '2K 500Hz', '0.03 ms', 'QD-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 4399, releasedAt: '2026-10-08', variant: 'monitor', flag: '500Hz',
    features: ['26.5 英寸 2K 500Hz QD-OLED', '0.03 ms 灰阶响应，满速 DP 2.1（80 Gbps）', '四微边全视屏设计 · CNC 阳极氧化铝背板', '旋转升降支架', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: 'QD-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '26.5 英寸 · 2560×1440' },
      { group: '显示', label: '刷新率', value: '500 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '接口', label: '接口', value: 'DP 2.1 (UHBR20) · HDMI 2.1' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 旋转升降' },
      { group: '机械', label: '背板', value: 'CNC 阳极氧化铝' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    gallery: ['/media/products/transparent/gh-27x1qe-500.webp'],
    buyUrl: TB('811263399696'),
  },
  {
    id: 'gh-27x1ue-qd', model: '27X1UE-QD', name: 'QD 26.5 英寸 4K 240Hz QD-OLED 显示器', category: 'OLED旗舰', connection: 'DP 2.1',
    specs: ['26.5 英寸', '4K 240Hz', 'QD-OLED'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 4799, releasedAt: '2026-04-18', variant: 'monitor', flag: '4K',
    features: ['26.5 英寸 4K 240Hz QD-OLED', '满速 DP 2.1 接口', '0.03 ms 灰阶响应 · 硬件低蓝光', '四微边全面屏设计', '三年质保，含 OLED 烧屏保护'],
    attributes: [
      { group: '显示', label: '面板', value: 'QD-OLED' },
      { group: '显示', label: '尺寸 / 分辨率', value: '26.5 英寸 · 3840×2160' },
      { group: '显示', label: '刷新率', value: '240 Hz' },
      { group: '显示', label: '响应时间', value: '0.03 ms (GTG)' },
      { group: '接口', label: '接口', value: 'DP 2.1 · HDMI 2.1' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 / 旋转 / 俯仰' },
    ],
    inBox: ['显示器 × 1', 'DP 2.1 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保（含 OLED 烧屏保护），全国联保',
    os: ['Windows 10 / 11', 'macOS', 'PS5 / Xbox Series X'],
    gallery: ['/media/products/transparent/gh-27x1ue-qd.webp'],
    buyUrl: TB('878280736062'),
  },
  {
    id: 'gh-g27k180', model: 'G27K-180', name: '画圣 5K 双模电竞显示器', category: '双模高刷', connection: 'DP 2.1',
    specs: ['27 英寸', '5K@180 / 2K@330', 'Fast IPS'], status: { level: 'success', text: '在售' },
    price: '', priceValue: 3799, releasedAt: '2026-03-06', variant: 'monitor', flag: '极创',
    features: ['27 英寸 Fast IPS 双模：5K@180Hz 与 2K@330Hz 切换', '5K 超频 180Hz，兼顾细腻画质与高刷', '2K 330Hz 模式适合竞技类 FPS', '极创（Jichuang）系列产品'],
    attributes: [
      { group: '显示', label: '面板', value: 'Fast IPS' },
      { group: '显示', label: '尺寸 / 分辨率', value: '27 英寸 · 5K（5120×2880）' },
      { group: '显示', label: '刷新率', value: '5K@180 Hz / 2K@330 Hz（双模）' },
      { group: '接口', label: '接口', value: 'DP 2.1 · HDMI 2.1' },
      { group: '机械', label: '支架', value: 'VESA 100×100 · 升降 / 旋转 / 俯仰' },
    ],
    inBox: ['显示器 × 1', 'DP 线 × 1', '电源适配器 × 1', '说明书 / 保修卡 × 1'],
    warranty: '整机三年质保，全国联保',
    os: ['Windows 10 / 11', 'macOS'],
    gallery: ['/media/products/transparent/gh-g27k180.webp'],
    buyUrl: TB('1006891718756'),
  },
]

/** 筛选与排序选项 */
export const CATEGORY_FILTERS: Array<'全部' | ProductCategory> = ['全部', 'OLED旗舰', '双模高刷', '电竞IPS', '周边']
export const CONNECTION_FILTERS: ProductConnection[] = ['DP 2.1', 'HDMI 2.1', 'USB-C']
export const SORT_OPTIONS = ['综合排序', '价格从低到高', '价格从高到低', '上新时间']

/** 更多筛选：价格区间（元） */
export type PriceRange = { id: string; label: string; min: number; max: number }
export const PRICE_RANGES: PriceRange[] = [
  { id: 'all', label: '不限', min: 0, max: Infinity },
  { id: 'lt1000', label: '1000 元以下', min: 0, max: 999 },
  { id: '1000-3000', label: '1000–3000 元', min: 1000, max: 3000 },
  { id: 'gt3000', label: '3000 元以上', min: 3001, max: Infinity },
]

/** 更多筛选：库存状态 */
export const STATUS_FILTERS: Array<'全部' | '在售' | '缺货'> = ['全部', '在售', '缺货']

/** 性能摘要行：标称 / 实测并列（R8.2：specTable 已合并进 summary） */
export type SpecSummaryRow = {
  label: string
  /** 摘要值（无标称 / 实测并列时使用） */
  value?: string
  /** 标称值（厂商公布） */
  nominal?: string
  /** 实测值（实验室） */
  measured?: string
  note?: string
  missing?: boolean
}
export type SpecSummaryGroup = { title: string; rows: SpecSummaryRow[] }

/** 详情页数据：按产品 id 组织；缺省时由列表数据兜底 */
export type ProductDetail = {
  id: string
  model: string
  name: string
  badges: string[]
  status: Product['status']
  price: string
  /** 参考价数值（元）；未填文字价时前台按此显示「¥x,xxx 起」 */
  priceValue?: number
  tag: string
  summary: SpecSummaryGroup[]
  tabs: string[]
  /** 列表页同款核心参数（首屏规格标签） */
  specs?: string[]
  /** 以下为运营可维护的扩展字段（来自产品记录，缺省则不展示） */
  features?: string[]
  attributes?: ProductAttribute[]
  inBox?: string[]
  warranty?: string
  os?: string[]
  weight?: number
  /** 相册图片地址（按产品维护；缺省回退内置视角图） */
  gallery?: string[]
  /** 详情富文本 HTML（按产品维护；渲染前经白名单净化） */
  detailHtml?: string
  /** SKU 规格组 / 明细 / H5 长图（来自产品记录） */
  skuOptions?: ProductSkuOption[]
  skus?: ProductSku[]
  h5LongImages?: string[]
  h5LongImagesMobile?: string[]
  /** 购买链接（详情页主按钮「立即购买」取此值，见 §4.22 3-2） */
  buyUrl?: string
  /** 3D 预览（后台开关打开且模型地址存在时才下发，前台据此显示 3D 入口） */
  model3d?: string
  model3dPoster?: string
  model3dEnabled?: boolean
  /** 设备形态（相册兜底 / 占位图使用） */
  variant?: DeviceVariant
  /** 主图视频（后台维护；缺省时前台不显示视频入口） */
  videoUrl?: string
  videoPoster?: string
  /** 同系列标识（后台留空时按分类派生） */
  seriesId?: string
  /** 用户评价（后台审核通过后下发；缺省时不渲染评价模块） */
  reviews?: ProductReviewView[]
}

/** 详情页占位数据（以旗舰 540Hz OLED 为完整示例，其余型号复用同一结构） */
export const PRODUCT_DETAILS: Record<string, ProductDetail> = {
  'gh-54027x1qe': {
    id: 'gh-54027x1qe',
    model: '54027X1QE-W54',
    name: '闪电 540Hz 电竞OLED显示器',
    badges: ['旗舰', 'W-OLED · DP 2.1'],
    status: { level: 'success', text: '在售' },
    price: '¥4,999',
    tag: 'OLED旗舰',
    summary: [
      {
        title: '性能摘要（标称 / 实测）',
        rows: [
          { label: '刷新率', nominal: '540 Hz', measured: '540 Hz', note: 'DP 2.1 满速下达成' },
          { label: '响应时间', nominal: '0.03 ms', measured: '0.04 ms (GTG)', note: '过驱档位「标准」' },
          { label: 'HDR 峰值亮度', nominal: '1500 nit', measured: '1,320 nit', note: '10% 窗口' },
          { label: '色域容积', nominal: '99% DCI-P3', measured: '97.6% DCI-P3', note: '实测色域容积' },
          { label: '对比度', nominal: '1,000,000:1', measured: '∞', note: 'OLED 纯黑，仪器底噪以下' },
          { label: '均匀度（9 点）', nominal: '—', measured: '未测量', note: '测试方法审核中', missing: true },
        ],
      },
      {
        title: '实测补充（小雪人评测实验室 · 2026-09-25 · n=3）',
        rows: [
          { label: 'SDR 亮度', value: '468 nit' },
          { label: '运动响应 BET', value: '1.8 ms' },
        ],
      },
    ],
    tabs: ['参数规格', '测试记录'],
  },
}

/** 详情页英文标签（数据层双语）：集合英文覆盖层已译 name / specs / flag，此处补齐详情结构 */
const CATEGORY_EN: Record<string, string> = { OLED旗舰: 'OLED Flagship', 双模高刷: 'Dual-mode', 电竞IPS: 'Gaming IPS', 周边: 'Accessories' }
const STATUS_EN: Record<string, string> = { 在售: 'In stock', 缺货: 'Out of stock', 预售: 'Pre-order' }

/** 详情页英文数据（结构与中文一致，仅译文案） */
export const PRODUCT_DETAILS_EN: Record<string, ProductDetail> = {
  'gh-54027x1qe': {
    id: 'gh-54027x1qe',
    model: '54027X1QE-W54',
    name: 'Lightning 540Hz OLED Gaming Monitor',
    badges: ['Flagship', 'W-OLED · DP 2.1'],
    status: { level: 'success', text: 'In stock' },
    price: '¥4,999',
    tag: 'OLED Flagship',
    summary: [
      {
        title: 'Performance summary (nominal / measured)',
        rows: [
          { label: 'Refresh rate', nominal: '540 Hz', measured: '540 Hz', note: 'At full DP 2.1 bandwidth' },
          { label: 'Response time', nominal: '0.03 ms', measured: '0.04 ms (GTG)', note: 'Overdrive «Standard»' },
          { label: 'HDR peak brightness', nominal: '1500 nit', measured: '1,320 nit', note: '10% window' },
          { label: 'Color gamut', nominal: '99% DCI-P3', measured: '97.6% DCI-P3', note: 'Measured volume' },
          { label: 'Contrast', nominal: '1,000,000:1', measured: '∞', note: 'OLED black, below instrument floor' },
          { label: 'Uniformity (9-point)', nominal: '—', measured: 'Not measured', note: 'Method under review', missing: true },
        ],
      },
      {
        title: 'Additional measurements (Snowman Lab · 2026-09-25 · n=3)',
        rows: [
          { label: 'SDR brightness', value: '468 nit' },
          { label: 'Motion response (BET)', value: '1.8 ms' },
        ],
      },
    ],
    tabs: ['Specifications', 'Test records'],
  },
}

/** 分类 → 系列 slug（与 product-extra.ts 的 SERIES 同口径）；后台未填 seriesId 时派生 */
const CATEGORY_SERIES: Record<ProductCategory, string> = {
  OLED旗舰: 'oled',
  双模高刷: 'dual',
  电竞IPS: 'ips',
  周边: 'accessory',
}

/** 从产品记录中取出运营可维护的扩展字段（仅取已定义项，供详情合并） */
function extendedFields(base: Product, locale: string = 'zh'): Partial<ProductDetail> {
  const out: Partial<ProductDetail> = {}
  if (base.variant) out.variant = base.variant
  // 主图视频 / 系列：后台留空时按分类派生，保证前台零配置可用
  if (base.videoUrl) out.videoUrl = base.videoUrl
  if (base.videoPoster) out.videoPoster = base.videoPoster
  out.seriesId = base.seriesId || CATEGORY_SERIES[base.category]
  // 性能摘要：后台录入优先（有值即覆盖内置示例），实测留空时前台只展示标称值
  const summaryRows = (Array.isArray(base.summaryRows) ? base.summaryRows : [])
    .map((row) => ({
      label: String(row?.label ?? '').trim(),
      nominal: String(row?.nominal ?? '').trim(),
      measured: String(row?.measured ?? '').trim(),
    }))
    .filter((row) => row.label && (row.nominal || row.measured))
    .map((row) => ({
      label: row.label,
      nominal: row.nominal,
      measured: row.measured,
      value: row.measured || row.nominal,
      missing: !row.nominal && !row.measured,
    }))
  if (summaryRows.length > 0) {
    out.summary = [
      {
        title: locale === 'en' ? 'Performance summary (nominal / measured)' : '性能摘要（标称 / 实测）',
        rows: summaryRows,
      },
    ]
  }
  if (base.features !== undefined) out.features = base.features
  if (base.attributes !== undefined) out.attributes = base.attributes
  if (base.inBox !== undefined) out.inBox = base.inBox
  if (base.warranty !== undefined) out.warranty = base.warranty
  if (base.os !== undefined) out.os = base.os
  if (base.weight !== undefined) out.weight = base.weight
  if (base.gallery !== undefined) out.gallery = base.gallery
  if (base.detailHtml !== undefined) out.detailHtml = base.detailHtml
  if (base.skuOptions !== undefined) out.skuOptions = base.skuOptions
  if (base.skus !== undefined) out.skus = base.skus
  if (base.h5LongImages !== undefined) out.h5LongImages = base.h5LongImages
  if (base.h5LongImagesMobile !== undefined) out.h5LongImagesMobile = base.h5LongImagesMobile
  if (base.buyUrl !== undefined) out.buyUrl = base.buyUrl
  // 3D 预览：三个字段同时满足才下发，避免「开了开关却没模型」时前台出现空入口
  const model3dOn = base.model3dEnabled === true || String(base.model3dEnabled) === 'true'
  if (model3dOn && base.model3d) {
    out.model3dEnabled = true
    out.model3d = base.model3d
    if (base.model3dPoster) out.model3dPoster = base.model3dPoster
  }
  return out
}

/**
 * 用产品记录（集合存储，后台可改）覆盖详情内置示例中「同一语义」的字段。
 * 只覆盖 name / model / status / price / tag / badges 首位（flag），
 * 其余详情结构（summary / tabs 等）保留示例值。
 */
function withRecordFields(detail: ProductDetail, base: Product, locale: string): ProductDetail {
  const badges = detail.badges.length > 0 ? [...detail.badges] : []
  if (base.flag) {
    if (badges.length > 0) badges[0] = base.flag
    else badges.push(base.flag)
  }
  return {
    ...detail,
    id: base.id,
    model: base.model,
    name: base.name,
    status:
      locale === 'en'
        ? { level: base.status.level, text: STATUS_EN[base.status.text] ?? base.status.text }
        : base.status,
    price: base.price,
    priceValue: base.priceValue,
    specs: base.specs,
    tag: locale === 'en' ? (CATEGORY_EN[base.category] ?? base.category) : base.category,
    badges,
  }
}

/**
 * 兜底摘要：后台未录入 summaryRows 时，用结构化参数的前 6–8 条生成真实指标，
 * 不再伪造「类别规格 1/2/3」这种占位标签。
 */
function fallbackSummary(base: Product, locale: string): SpecSummaryGroup[] {
  const rows = (base.attributes ?? [])
    .filter((attr) => attr.label?.trim() && attr.value?.trim())
    .slice(0, 8)
    .map((attr) => ({ label: attr.label.trim(), nominal: attr.value.trim(), value: attr.value.trim() }))
  if (!rows.length) return []
  return [{ title: locale === 'en' ? 'Key specifications' : '关键参数', rows }]
}

/** 兜底：把列表数据补成详情结构，保证任意型号进入详情页都不空白（列表来自集合存储，形状与 PRODUCTS 一致） */
export function getProductDetail(products: Product[], id: string, locale: string = 'zh'): ProductDetail | null {
  const base = products.find((item) => item.id === id)
  if (!base) return null
  if (locale === 'en') {
    const detailedEn = PRODUCT_DETAILS_EN[id]
    if (detailedEn) return withRecordFields({ ...detailedEn, ...extendedFields(base, locale) }, base, locale)
    return {
      id: base.id,
      model: base.model,
      name: base.name,
      badges: base.flag ? [base.flag, base.specs.join(' · ')] : [base.specs.join(' · ')],
      status: { level: base.status.level, text: STATUS_EN[base.status.text] ?? base.status.text },
      price: base.price,
      priceValue: base.priceValue,
      specs: base.specs,
      tag: CATEGORY_EN[base.category] ?? base.category,
      summary: fallbackSummary(base, locale),
      tabs: ['Specifications', 'Test records'],
      ...extendedFields(base, locale),
    }
  }
  const detailed = PRODUCT_DETAILS[id]
  if (detailed) return withRecordFields({ ...detailed, ...extendedFields(base, locale) }, base, locale)
  return {
    id: base.id,
    model: base.model,
    name: base.name,
    badges: base.flag ? [base.flag, base.specs.join(' · ')] : [base.specs.join(' · ')],
    status: base.status,
    price: base.price,
    priceValue: base.priceValue,
    specs: base.specs,
    tag: base.category,
    summary: fallbackSummary(base, locale),
    tabs: ['参数规格', '测试记录'],
    ...extendedFields(base),
  }
}
