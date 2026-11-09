/**
 * 后台 · 天梯榜批量导入（挂载于 /api/admin，需登录 + `content` 权限）。
 *
 * 契约：
 *   GET  /admin/rankings/metrics
 *        → { items: [{ id, label, unit, better, digits, count }] }（供导入页下拉）
 *   POST /admin/rankings/import
 *        body { metric: string, mode?: 'replace' | 'append', rows: ImportRow[] }
 *        → { ok: true, metric: { id, label, total }, imported }
 *        单条数据不合法 → 400 + { error, errors: string[] }（逐行说明）
 *
 * 导入规则：
 * - `metric` 支持指标 id（如 `contrast`）或中文名（如 `对比度`）；
 * - 名次由服务端按 `better` 方向重排后自动生成（`inf` 视为该方向的极值），不信任 CSV 名次列；
 * - `append` 时按型号合并：同型号以新数据覆盖，其余旧行保留；`replace` 则整榜替换；
 * - `productId` 必须指向产品库中已存在的产品（可选）。
 */
import { Router } from 'express'
import { getCollectionItem, listCollection, updateCollectionItem } from '../data/collectionStore'
import type { LadderMetric, LadderRow } from '../data/ladder'
import { auditWrite } from '../middleware/audit'
import { requireSession } from '../middleware/adminAuth'
import { requireScope } from '../middleware/rbac'

export const rankingsImportRouter = Router()

/** 导入行（客户端解析 CSV 后的结构化形状） */
type ImportRow = {
  model?: unknown
  name?: unknown
  score?: unknown
  inf?: unknown
  productId?: unknown
}

/** 归一化后的导入行 */
type CleanRow = {
  model: string
  name: string
  score: number | null
  inf: boolean
  productId?: string
}

/** 真值判定：兼容 CSV 中的中文 / 布尔 / 数字写法 */
function truthy(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return ['1', 'true', 'yes', 'y', '是', '∞', 'inf', 'infinity'].includes(value.trim().toLowerCase())
  return false
}

/** 取字符串字段并去空白 */
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** 按 id 或中文名定位指标 */
function findMetric(metrics: LadderMetric[], key: string): LadderMetric | undefined {
  const value = key.trim()
  return metrics.find((metric) => metric.id === value) ?? metrics.find((metric) => metric.label === value)
}

/** 排序值：inf 视为该方向的极值 */
function sortValue(row: CleanRow, better: LadderMetric['better']): number {
  if (row.inf) return better === 'high' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
  return row.score ?? Number.NaN
}

/** 排序并按顺序重排名次（两位零填充，>99 时自然增长） */
function rerank(rows: CleanRow[], better: LadderMetric['better']): LadderRow[] {
  const sorted = [...rows].sort((a, b) => {
    const va = sortValue(a, better)
    const vb = sortValue(b, better)
    return better === 'high' ? vb - va : va - vb
  })
  return sorted.map((row, index) => {
    const item: LadderRow = {
      rank: String(index + 1).padStart(2, '0'),
      model: row.model,
      name: row.name,
      score: row.inf ? null : row.score,
    }
    if (row.inf) item.inf = true
    if (row.productId) item.productId = row.productId
    return item
  })
}

/** 校验单行；返回错误文案或归一化结果 */
function cleanRow(raw: ImportRow, productIds: Set<string>): { error: string } | { row: CleanRow } {
  const model = text(raw.model)
  if (!model) return { error: '型号不能为空' }
  if (model.length > 80) return { error: '型号过长（最多 80 个字符）' }
  const name = text(raw.name)
  if (!name) return { error: '品牌不能为空' }
  const inf = truthy(raw.inf)
  const rawScore = raw.score
  let score: number | null = null
  if (!inf) {
    if (rawScore === null || rawScore === undefined || rawScore === '') return { error: '数值不能为空（对比度 ∞ 请填“无限=是”）' }
    const parsed = typeof rawScore === 'number' ? rawScore : Number(String(rawScore).trim())
    if (!Number.isFinite(parsed)) return { error: `数值不是有效数字：${String(rawScore)}` }
    score = parsed
  }
  const productId = text(raw.productId)
  if (productId && !productIds.has(productId)) return { error: `产品 ID 不存在：${productId}` }
  return { row: { model, name, score, inf, productId: productId || undefined } }
}

rankingsImportRouter.get('/rankings/metrics', requireSession, requireScope('content'), (_req, res) => {
  const items = listCollection('rankings').map((metric) => ({
    id: metric.id,
    label: metric.label,
    unit: metric.unit,
    better: metric.better,
    digits: metric.digits,
    count: metric.rows.length,
  }))
  res.json({ items })
})

rankingsImportRouter.post(
  '/rankings/import',
  requireSession,
  requireScope('content'),
  auditWrite('import-rankings', (req) => String((req.body as { metric?: unknown })?.metric ?? '')),
  (req, res) => {
    const body = (req.body ?? {}) as { metric?: unknown; mode?: unknown; rows?: unknown }
    const metrics = listCollection('rankings')
    const metricKey = text(body.metric)
    const metric = findMetric(metrics, metricKey)
    if (!metric) {
      res.status(400).json({ error: '请选择有效的榜单指标' })
      return
    }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      res.status(400).json({ error: '导入内容为空' })
      return
    }
    if (body.rows.length > 5000) {
      res.status(400).json({ error: '单次导入不能超过 5000 行' })
      return
    }

    const productIds = new Set(listCollection('products').map((product) => product.id))
    const clean: CleanRow[] = []
    const errors: string[] = []
    const seen = new Set<string>()
    body.rows.forEach((raw, index) => {
      const outcome = cleanRow((raw ?? {}) as ImportRow, productIds)
      if ('error' in outcome) {
        errors.push(`第 ${index + 1} 行：${outcome.error}`)
        return
      }
      const key = outcome.row.model
      if (seen.has(key)) {
        errors.push(`第 ${index + 1} 行：型号重复（${key}）`)
        return
      }
      seen.add(key)
      clean.push(outcome.row)
    })
    if (errors.length > 0) {
      res.status(400).json({ error: errors[0], errors })
      return
    }

    // 追加模式：保留旧行，同型号以新行覆盖
    let merged = clean
    if (body.mode === 'append') {
      const existing = getCollectionItem('rankings', metric.id)?.rows ?? []
      const incoming = new Map(clean.map((row) => [row.model, row]))
      const kept: CleanRow[] = existing
        .filter((row) => !incoming.has(row.model))
        .map((row) => ({ model: row.model, name: row.name, score: row.score, inf: Boolean(row.inf), productId: row.productId }))
      merged = [...kept, ...clean]
    }

    const rows = rerank(merged, metric.better)
    updateCollectionItem('rankings', metric.id, { rows })
    res.json({
      ok: true,
      imported: clean.length,
      metric: { id: metric.id, label: metric.label, total: rows.length },
    })
  },
)
