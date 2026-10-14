/**
 * 后台数据分析聚合（真实统计口径）。
 * ============================================================
 * 保持 `GET /api/admin/analytics/:scope` 的**响应形状不变**（`AdminAnalytics`：KPI + 序列 + 明细表），
 * 但数据全部来自真实来源，无写死数字：
 *
 * - `traffic`   ：埋点 `view` 事件 → 总浏览 / 今日 / 覆盖页面 / 热门页面；近 7 日按日趋势 + 热门页面 TOP N。
 * - `products`  ：集合真实计数（产品数 / 评测文章数 / 榜单配置数）+ 产品页浏览（埋点 `view` 路径 `/products*`）。
 * - `downloads` ：埋点 `download` 事件 → 总下载点击 / 今日 / 下载项数 / 近 7 日均；近 7 日趋势 + TOP 下载项。
 * - `content`   ：文章集合按分类真实计数、近期发布与总量。
 *
 * 无数据一律为 0（不编造）；`delta` 为与上一周期（近 7 日 vs 前 7 日、今日 vs 昨日）的真实环比，
 * 无可比基线时显示 `—`。时间口径为**上海时区（UTC+8）自然日**。
 */
import type { AdminAnalytics } from './admin'
import { listCollection } from './collectionStore'
import {
  countLike,
  countSince,
  dailyCounts,
  distinctBetween,
  distinctKeyCount,
  recentDays,
  today,
  todayCount,
  topKeys,
  totalCount,
  type MetricKind,
} from './metricsStore'

/** 分析范围 */
export type AnalyticsScope = 'traffic' | 'products' | 'downloads' | 'content'

/** 近 N 日窗口 */
const WINDOW_DAYS = 7

/** 当前时刻回溯 offsetMs 的 ISO 时间 */
function isoBefore(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString()
}

/** 环比百分比文案：基线为 0 时返回 `—` */
function pctDelta(current: number, baseline: number): { delta: string; trend: 'up' | 'down' } {
  if (baseline <= 0) return { delta: current > 0 ? '+100%' : '—', trend: 'up' }
  const pct = ((current - baseline) / baseline) * 100
  const rounded = Math.round(pct * 10) / 10
  const sign = rounded > 0 ? '+' : ''
  return { delta: `${sign}${rounded}%`, trend: rounded >= 0 ? 'up' : 'down' }
}

/** 数字 → 千分位字符串（表格单元格） */
function n(value: number): number {
  return value
}

/** MM-DD 展示（序列标签） */
function shortDay(day: string): string {
  return day.slice(5)
}

/** 占比文案 */
function share(count: number, total: number): string {
  return total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'
}

/** 近 7 日 vs 前 7 日的计数环比 */
function weeklyDelta(kind: MetricKind): { delta: string; trend: 'up' | 'down' } {
  const last7 = countSince(kind, isoBefore(WINDOW_DAYS * 86_400_000))
  const prev7 = countSince(kind, isoBefore(2 * WINDOW_DAYS * 86_400_000)) - last7
  return pctDelta(last7, prev7)
}

/* ---------------- 访问分析 ---------------- */

function buildTraffic(): AdminAnalytics {
  const total = totalCount('view')
  const todayViews = todayCount('view')
  const pages = distinctKeyCount('view')

  // 今日 vs 昨日
  const yesterdayStart = new Date(`${recentDays(2)[0]}T00:00:00+08:00`).toISOString()
  const todayStart = new Date(`${today()}T00:00:00+08:00`).toISOString()
  const yesterdayViews = countSince('view', yesterdayStart) - countSince('view', todayStart)

  // 覆盖页面数：近 7 日 vs 前 7 日（去重）
  const pagesLast7 = distinctBetween('view', isoBefore(WINDOW_DAYS * 86_400_000), new Date().toISOString())
  const pagesPrev7 = distinctBetween(
    'view',
    isoBefore(2 * WINDOW_DAYS * 86_400_000),
    isoBefore(WINDOW_DAYS * 86_400_000),
  )

  const top = topKeys('view', 10)
  const daily = dailyCounts('view', WINDOW_DAYS)

  return {
    title: '访问分析',
    desc: '站点整体访问趋势与主要落地页表现（数据来自前台真实埋点）。',
    summary: [
      { key: 'pv', label: '页面浏览（PV）', value: total, ...weeklyDelta('view') },
      { key: 'today', label: '今日浏览', value: todayViews, ...pctDelta(todayViews, yesterdayViews) },
      { key: 'pages', label: '覆盖页面', value: pages, ...pctDelta(pagesLast7, pagesPrev7) },
      {
        key: 'hot',
        label: '热门页最高浏览',
        value: top[0]?.count ?? 0,
        delta: '—',
        trend: 'up',
      },
      // 行为事件（前台埋点：CTA / 预约 / 对比 / 订阅）——与浏览、下载同口径展示
      { key: 'cta', label: 'CTA 点击', value: totalCount('cta'), ...weeklyDelta('cta') },
      { key: 'reserve', label: '预约提交', value: totalCount('reserve'), ...weeklyDelta('reserve') },
      { key: 'compare', label: '加入对比', value: totalCount('compare'), ...weeklyDelta('compare') },
      { key: 'subscribe', label: '邮件订阅', value: totalCount('subscribe'), ...weeklyDelta('subscribe') },
    ],
    series: daily.map((point) => ({ label: shortDay(point.day), value: point.count })),
    tableTitle: '热门页面',
    columns: ['页面', '浏览（PV）', '占比'],
    rows: top.map((row) => [row.key, n(row.count), share(row.count, total)]),
  }
}

/* ---------------- 产品评测分析 ---------------- */

function buildProducts(): AdminAnalytics {
  const products = listCollection('products')
  const articles = listCollection('articles')
  const rankings = listCollection('rankings')

  const reviewCount = articles.filter((article) => article.categoryLabel === '评测').length
  const productViewTotal = countLike('view', '/products%')

  // 产品页浏览：按路径末段（产品 id）聚合，映射回集合名称
  const viewById = new Map<string, number>()
  for (const row of topKeys('view', 2000, '/products/%')) {
    const id = row.key.slice('/products/'.length).split('/')[0]
    if (!id) continue
    viewById.set(id, (viewById.get(id) ?? 0) + row.count)
  }

  const rows = products
    .map((product) => {
      const name = product.model || product.name || product.id
      return { label: name, value: viewById.get(product.id) ?? 0 }
    })
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh-Hans-CN'))

  return {
    title: '产品评测分析',
    desc: '产品与评测内容规模，以及产品页真实浏览量。',
    summary: [
      { key: 'products', label: '产品数', value: products.length, delta: '—', trend: 'up' },
      { key: 'reviews', label: '评测文章数', value: reviewCount, delta: '—', trend: 'up' },
      { key: 'rankings', label: '榜单配置数', value: rankings.length, delta: '—', trend: 'up' },
      { key: 'views', label: '产品页浏览', value: productViewTotal, delta: '—', trend: 'up' },
    ],
    series: rows.slice(0, 6).map((row) => ({ label: row.label, value: row.value })),
    tableTitle: '产品表现明细',
    columns: ['产品', '浏览量'],
    rows: rows.map((row) => [row.label, n(row.value)]),
  }
}

/* ---------------- 下载服务分析 ---------------- */

function buildDownloads(): AdminAnalytics {
  const items = listCollection('downloads')
  const nameById = new Map(items.map((item) => [item.id, item.name]))

  const total = totalCount('download')
  const todayDownloads = todayCount('download')
  const distinct = distinctKeyCount('download')
  const last7 = countSince('download', isoBefore(WINDOW_DAYS * 86_400_000))

  const yesterdayStart = new Date(`${recentDays(2)[0]}T00:00:00+08:00`).toISOString()
  const todayStart = new Date(`${today()}T00:00:00+08:00`).toISOString()
  const yesterdayDownloads = countSince('download', yesterdayStart) - countSince('download', todayStart)

  const top = topKeys('download', 10)
  const daily = dailyCounts('download', WINDOW_DAYS)

  return {
    title: '下载服务分析',
    desc: '驱动、固件、说明书与工具的下载点击分布（数据来自前台真实埋点）。',
    summary: [
      { key: 'total', label: '总下载点击', value: total, ...weeklyDelta('download') },
      { key: 'today', label: '今日下载', value: todayDownloads, ...pctDelta(todayDownloads, yesterdayDownloads) },
      { key: 'items', label: '被下载资料数', value: distinct, delta: '—', trend: 'up' },
      { key: 'avg', label: '近 7 日均', value: Math.round(last7 / WINDOW_DAYS), delta: '—', trend: 'up' },
    ],
    series: daily.map((point) => ({ label: shortDay(point.day), value: point.count })),
    tableTitle: '资源下载明细',
    columns: ['资源', '下载点击', '占比'],
    rows: top.map((row) => [nameById.get(row.key) ?? row.key, n(row.count), share(row.count, total)]),
  }
}

/* ---------------- 内容合作分析 ---------------- */

function buildContent(): AdminAnalytics {
  const articles = listCollection('articles')
  const total = articles.length

  const categories = new Map<string, number>()
  for (const article of articles) {
    const label = article.categoryLabel || article.category || '未分类'
    categories.set(label, (categories.get(label) ?? 0) + 1)
  }

  const published = articles
    .filter((article) => typeof article.date === 'string' && article.date)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))

  const threshold = recentDays(30)[0]
  const recentCount = articles.filter((article) => typeof article.date === 'string' && article.date >= threshold).length
  const totalReading = articles.reduce((sum, article) => sum + (Number(article.readingMin) || 0), 0)

  const series = Array.from(categories.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh-Hans-CN'))

  return {
    title: '内容合作分析',
    desc: '文章按分类的真实计数、总量与近期发布情况。',
    summary: [
      { key: 'articles', label: '文章总数', value: total, delta: '—', trend: 'up' },
      { key: 'categories', label: '内容分类数', value: categories.size, delta: '—', trend: 'up' },
      { key: 'recent', label: '近 30 天发布', value: recentCount, delta: '—', trend: 'up' },
      { key: 'reading', label: '总阅读时长（分）', value: totalReading, delta: '—', trend: 'up' },
    ],
    series,
    tableTitle: '内容发布明细',
    columns: ['标题', '分类', '发布时间'],
    rows: published.slice(0, 10).map((article) => [article.title, article.categoryLabel || article.category || '', article.date]),
  }
}

/** 范围 → 构造器 */
const BUILDERS: Record<AnalyticsScope, () => AdminAnalytics> = {
  traffic: buildTraffic,
  products: buildProducts,
  downloads: buildDownloads,
  content: buildContent,
}

/** 判断是否为已知分析范围 */
export function isAnalyticsScope(scope: string): scope is AnalyticsScope {
  return scope === 'traffic' || scope === 'products' || scope === 'downloads' || scope === 'content'
}

/** 构造指定范围的真实分析数据；未知范围返回 undefined（路由层 404） */
export function buildAnalytics(scope: string): AdminAnalytics | undefined {
  return isAnalyticsScope(scope) ? BUILDERS[scope]() : undefined
}
