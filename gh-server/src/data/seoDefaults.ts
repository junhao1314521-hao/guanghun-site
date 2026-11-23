/**
 * 静态路由的默认 SEO 元信息（单一真源，供服务端注入与后台 SEO 编辑共用）。
 *
 * 与 `gh-web/src/data/meta.ts` 的 PAGE_META 保持一致；详情页（产品 / 文章 / 下载等）
 * 的标题与描述由内容数据自动生成，不在后台覆盖范围内，故此处只列静态路由。
 */

export type StaticSeo = {
  title: string
  description: string
  indexable: boolean
  /** 规范地址覆盖（站点相对路径）；用于旧路由别名指向新地址，缺省按当前路径 */
  canonical?: string
}

export const STATIC_SEO: Record<string, StaticSeo> = {
  '/': { title: '光魂 · OLED 电竞显示器官网', description: '光魂 OLED 电竞显示器：2K 540Hz 与 4K 双模，参数、测试方法与固件版本可查。', indexable: true },
  '/products': { title: '全部产品 · 光魂', description: '光魂 OLED 电竞显示器，覆盖 540Hz 旗舰到主流电竞 IPS，可按品类、接口与价格筛选。', indexable: true },
  '/articles': { title: '文章与评测 · 光魂', description: '产品评测、使用教程与行业观察；测试方法与数据来源公开。', indexable: true },
  '/news': { title: '新闻与动态 · 光魂', description: '产品发布、品牌动态与活动公告。', indexable: true },
  '/ladder': { title: '天梯榜 · 光魂', description: '以实测数据排序的电竞装备天梯榜，测试方法与数据来源公开。', indexable: true },
  '/center': { title: '光魂 Center · 设备管理软件', description: '一套软件管理全部光魂设备：按键与宏、性能参数调节、灯效场景、固件更新与配置云同步。', indexable: true },
  '/support': { title: '服务与支持 · 光魂', description: '保修政策与要点、服务网点、常见问题与驱动 / 固件下载。', indexable: true },
  '/downloads': { title: '下载中心 · 光魂', description: '驱动、固件、说明书与工具下载，按类别、类型与型号筛选。', indexable: true },
  // 旧站下载中心永久别名：地址栏保持 /h-col-160.html，canonical 指向新下载中心，避免重复收录
  '/h-col-160.html': { title: '下载中心 · 光魂', description: '驱动、固件、说明书与工具下载，按类别、类型与型号筛选。', indexable: true, canonical: '/downloads' },
  '/wallpapers': { title: '品牌壁纸 · 光魂', description: '光魂 16:9 桌面壁纸，取自产品影像与品牌光影，免登录下载、无水印，仅限个人非商业用途。', indexable: true },
  '/brand/guanghun': { title: '光魂品牌 · 以实测数据定义电竞显示性能', description: '光魂品牌档案：自建测试实验室、公开可复现的测试方法，以及 OLED 旗舰、双模高刷与电竞 IPS 产品线。', indexable: true },
  '/brand/lab': { title: '光魂实验室 · 让每一个数字都有据可查', description: '光魂实验室负责响应时间、峰值亮度、色准与亮度均匀度等指标的测量，测试条件与记录可追溯。', indexable: true },
  '/brand/esports': { title: '光魂电竞 · 与选手一起打磨每一帧画面', description: '光魂电竞与职业战队、选手共同定义并验证显示产品，赛场反馈回流研发与测试流程。', indexable: true },
  // Center 的两个叙事原型仅供内部预览，不参与搜索收录
  '/center/anatomy': { title: 'Center 结构叙事原型 · 光魂', description: 'Center 页面结构叙事原型。', indexable: false },
  '/center/light': { title: 'Center 光场叙事原型 · 光魂', description: 'Center 页面光场叙事原型。', indexable: false },
  '/faq': { title: '常见问题 · 光魂', description: '安装、使用、保修与售后高频问题的解答。', indexable: true },
  '/contact': { title: '联系我们 · 光魂', description: '客服热线、商务邮箱、办事处地址与服务时间。', indexable: true },
  '/business': { title: '商业合作 · 光魂', description: '媒体送测、渠道分销与品牌联名等合作方式及联系方式。', indexable: true },
  '/business/partners': { title: '合作伙伴 / 代理商申请 · 光魂', description: '合作伙伴与代理商申请：合作政策筹备中，提交申请后由商务团队对接；品牌资料在线申请下载。', indexable: true },
  '/business/scenes': { title: '场景与方案 · 光魂', description: '面向电竞、创作、办公与差旅的场景化装备方案。', indexable: true },
  '/business/cases': { title: '合作案例 · 光魂', description: '光魂商业合作案例；暂未公开案例时可预约体验点或联系我们。', indexable: true },
  '/business/venues': { title: '产品体验点 · 光魂', description: '全国合作体验点地图：按城市、省份与机型查找实机体验。', indexable: true },
  '/about': { title: '探索光魂 · 品牌与测试方法', description: '品牌主张、在售产品线、公开的测试方法与服务承诺。', indexable: true },
  '/legal/privacy': { title: '隐私政策 · 光魂', description: '光魂官网隐私政策。', indexable: true },
  '/legal/terms': { title: '服务条款 · 光魂', description: '光魂官网服务条款。', indexable: true },
  '/legal/cookies': { title: 'Cookie 声明 · 光魂', description: '光魂官网 Cookie 使用声明。', indexable: true },
  '/legal/records': { title: '备案信息 · 光魂', description: '网站备案与主体信息。', indexable: true },
}

/** 是否是可编辑的静态路由 */
export function isEditableSeoPath(path: string): boolean {
  return Object.prototype.hasOwnProperty.call(STATIC_SEO, path)
}
