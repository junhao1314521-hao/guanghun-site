/**
 * 轻量埋点事件存储（公开端点 `/api/track/*` 的数据落点）。
 *
 * - 存储：SQLite `metrics_events(id, kind, key, at)`；`kind` ∈ `view`（页面浏览）/ `download`（下载点击）；
 *   `key` 为页面路径或下载项 id；`at` 为 ISO 8601（UTC）时间。只存必要字段与时间，**不记录 IP / UA**。
 * - 上限：默认保留最近 20000 条（`METRICS_MAX` 可覆盖），超出丢弃最旧，防止无界增长。
 * - 开关：`TRACK_ENABLED=0|false|off` 关闭写库（端点仍应答，仅不记录）；默认开启。
 * - 聚合：按「上海时区（UTC+8）」自然日分桶统计，供后台数据分析消费；**无数据即 0，不编造**。
 */
import { getDb, runInTransaction } from './db'

/** 事件类型：页面浏览 / 下载点击 */
export type MetricKind = 'view' | 'download'

/** 默认保留上限（条数） */
const DEFAULT_MAX = 20000

/** 上海时区相对 UTC 的偏移（毫秒） */
const SH_OFFSET_MS = 8 * 60 * 60 * 1000

/** 解析保留上限（METRICS_MAX 可覆盖，非法值回退默认） */
function maxEvents(): number {
  const raw = Number(process.env.METRICS_MAX)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX
}

/** 是否开启埋点写库（TRACK_ENABLED=0/false/off 关闭；默认开启） */
export function trackEnabled(): boolean {
  const raw = (process.env.TRACK_ENABLED ?? '').trim().toLowerCase()
  return !(raw === '0' || raw === 'false' || raw === 'off')
}

/** 生成稳定且可读的新 id */
let seq = 0
function newId(): string {
  seq += 1
  return `m-${Date.now().toString(36)}-${seq.toString(36)}`
}

/** 时间 → 上海时区自然日（YYYY-MM-DD） */
export function shanghaiDay(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Date(date.getTime() + SH_OFFSET_MS).toISOString().slice(0, 10)
}

/** 当前上海时区自然日 */
export function today(): string {
  return shanghaiDay(new Date())
}

/** 最近 days 天的上海时区自然日列表（升序，含今天） */
export function recentDays(days: number): string[] {
  const out: string[] = []
  const now = Date.now()
  for (let i = days - 1; i >= 0; i -= 1) out.push(shanghaiDay(new Date(now - i * 86_400_000)))
  return out
}

/** 某上海时区自然日的起点（对应 UTC ISO 时间） */
function dayStartIso(day: string): string {
  return new Date(`${day}T00:00:00+08:00`).toISOString()
}

/**
 * 记录一条埋点事件（幂等性由调用方控制；开启上限裁剪，单事务落库）。
 * 关闭或写库失败时**静默**（埋点不得影响主流程）。
 */
export function recordMetric(kind: MetricKind, key: string): void {
  if (!trackEnabled()) return
  const safe = key.slice(0, 300)
  const max = maxEvents()
  try {
    runInTransaction((tx) => {
      tx.prepare('INSERT INTO metrics_events(id, kind, key, at) VALUES(?, ?, ?, ?)').run(
        newId(),
        kind,
        safe,
        new Date().toISOString(),
      )
      tx.prepare(
        'DELETE FROM metrics_events WHERE rowid NOT IN (SELECT rowid FROM metrics_events ORDER BY rowid DESC LIMIT ?)',
      ).run(max)
    })
  } catch {
    // 埋点失败静默：不影响公开接口响应
  }
}

/** 某类型事件总量 */
export function totalCount(kind: MetricKind): number {
  return (getDb().prepare('SELECT COUNT(*) AS n FROM metrics_events WHERE kind = ?').get(kind) as { n: number }).n
}

/** 某类型事件去重 key 数 */
export function distinctKeyCount(kind: MetricKind): number {
  return (
    getDb().prepare('SELECT COUNT(DISTINCT key) AS n FROM metrics_events WHERE kind = ?').get(kind) as { n: number }
  ).n
}

/** 某类型自 sinceIso（含）起的事件数 */
export function countSince(kind: MetricKind, sinceIso: string): number {
  return (
    getDb().prepare('SELECT COUNT(*) AS n FROM metrics_events WHERE kind = ? AND at >= ?').get(kind, sinceIso) as {
      n: number
    }
  ).n
}

/** 某类型今日（上海时区）事件数 */
export function todayCount(kind: MetricKind): number {
  return countSince(kind, dayStartIso(today()))
}

/** 某类型指定区间 `[fromIso, toIso)` 的去重 key 数 */
export function distinctBetween(kind: MetricKind, fromIso: string, toIso: string): number {
  return (
    getDb()
      .prepare('SELECT COUNT(DISTINCT key) AS n FROM metrics_events WHERE kind = ? AND at >= ? AND at < ?')
      .get(kind, fromIso, toIso) as { n: number }
  ).n
}

/** 某类型 key 命中 LIKE 模式（如 `/products/%`）的事件数 */
export function countLike(kind: MetricKind, like: string): number {
  return (
    getDb().prepare('SELECT COUNT(*) AS n FROM metrics_events WHERE kind = ? AND key LIKE ?').get(kind, like) as {
      n: number
    }
  ).n
}

/** 某类型按 key 聚合的 TOP N（可选 `like` 前缀过滤）；按次数降序、key 升序 */
export function topKeys(
  kind: MetricKind,
  limit: number,
  like?: string,
): Array<{ key: string; count: number }> {
  const db = getDb()
  const rows = (
    like
      ? db
          .prepare(
            'SELECT key AS k, COUNT(*) AS n FROM metrics_events WHERE kind = ? AND key LIKE ? GROUP BY key ORDER BY n DESC, k ASC LIMIT ?',
          )
          .all(kind, like, limit)
      : db
          .prepare('SELECT key AS k, COUNT(*) AS n FROM metrics_events WHERE kind = ? GROUP BY key ORDER BY n DESC, k ASC LIMIT ?')
          .all(kind, limit)
  ) as Array<{ k: string; n: number }>
  return rows.map((row) => ({ key: row.k, count: row.n }))
}

/** 某类型最近 days 天的逐日计数（上海时区；无事件的日期计 0） */
export function dailyCounts(kind: MetricKind, days: number): Array<{ day: string; count: number }> {
  const buckets = new Map<string, number>()
  for (const day of recentDays(days)) buckets.set(day, 0)
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const rows = getDb()
    .prepare('SELECT at FROM metrics_events WHERE kind = ? AND at >= ?')
    .all(kind, since) as Array<{ at: string }>
  for (const row of rows) {
    const day = shanghaiDay(row.at)
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + 1)
  }
  return Array.from(buckets.entries()).map(([day, count]) => ({ day, count }))
}

/** 清空全部埋点事件（供测试 / 重置使用） */
export function resetMetrics(): void {
  runInTransaction((tx) => tx.prepare('DELETE FROM metrics_events').run())
}
