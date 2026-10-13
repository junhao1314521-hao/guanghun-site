/**
 * 后台操作审计日志（追加型持久化）——阶段 5a 起改用 SQLite。
 *
 * - 存储：单库 `data/gh.sqlite`（`DB_PATH` 可覆盖）中的 `audit_log` 表；旧
 *   `data/audit-log.json` 仅在首次启动时被一次性导入（不删除）。
 * - 写入：任一 `appendAudit` 后立即**事务落库**（插入 + 超限裁剪同事务），重启不丢。
 * - 上限：默认 2000 条（`AUDIT_LOG_MAX` 可覆盖），超出丢弃**最旧**记录。
 * - 顺序：按 `seq` 升序返回（`seq` 越小越新，新记录 seq = 当前最小值 -1），列表首条即最近一次操作。
 * - 容错：DB 打开 / 建表失败 → 结构化日志 + 明确错误（不静默降级）。
 *
 * 条目形状：`{ id, at, actor, action, target, detail?, ip }`
 */
import { getDb, runInTransaction } from './db'

/** 审计条目（对外形状） */
export type AuditEntry = {
  /** 稳定唯一 id */
  id: string
  /** 发生时间（ISO 8601） */
  at: string
  /** 操作者（后台用户名） */
  actor: string
  /** 动作：login / logout / create / update / delete / save-page / save-site / upload / delete-upload / reset … */
  action: string
  /** 操作对象：资源 key + 记录 id，或页面 key */
  target: string
  /** 补充说明（如登录失败原因），可选 */
  detail?: string
  /** 客户端 IP */
  ip: string
}

/** 追加时所需的最小输入（id / at 由本模块生成） */
export type AuditInput = {
  actor: string
  action: string
  target: string
  detail?: string
  ip?: string
}

/** 默认保留上限（条目数） */
const DEFAULT_MAX = 2000

/** 解析保留上限（AUDIT_LOG_MAX 可覆盖，非法值回退默认） */
function maxEntries(): number {
  const raw = Number(process.env.AUDIT_LOG_MAX)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : DEFAULT_MAX
}

/** 初始化（或重新检查）：确保 DB 就绪（审计无需 seed，空日志即合法） */
export function initAuditLog(): void {
  getDb()
}

/** 生成稳定且可读的新 id */
let seq = 0
function newId(): string {
  seq += 1
  return `audit-${Date.now().toString(36)}-${seq.toString(36)}`
}

/** 追加一条审计记录：插入（最新在前）→ 裁剪超限 → 同事务落库 */
export function appendAudit(input: AuditInput): AuditEntry {
  getDb()
  const entry: AuditEntry = {
    id: newId(),
    at: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    target: input.target,
    ip: input.ip ?? '',
    ...(input.detail ? { detail: input.detail } : {}),
  }
  const max = maxEntries()
  runInTransaction((tx) => {
    const min = (tx.prepare('SELECT COALESCE(MIN(seq), 0) AS m FROM audit_log').get() as { m: number }).m
    tx.prepare('INSERT INTO audit_log(id, at, actor, action, target, detail, ip, seq) VALUES(?, ?, ?, ?, ?, ?, ?, ?)').run(
      entry.id,
      entry.at,
      entry.actor,
      entry.action,
      entry.target,
      entry.detail ?? null,
      entry.ip,
      min - 1,
    )
    // 保留最新 max 条（seq 最小者），其余（最旧）删除
    tx.prepare('DELETE FROM audit_log WHERE seq NOT IN (SELECT seq FROM audit_log ORDER BY seq ASC LIMIT ?)').run(max)
  })
  return entry
}

/** 列出审计记录（时间倒序）；limit 省略表示取全部，offset 省略为 0 */
export function listAudit(options: { limit?: number; offset?: number } = {}): { items: AuditEntry[]; total: number } {
  const db = getDb()
  const total = (db.prepare('SELECT COUNT(*) AS n FROM audit_log').get() as { n: number }).n
  const offset = Math.max(0, options.offset ?? 0)
  const limit = options.limit ?? total
  const rows = db
    .prepare('SELECT id, at, actor, action, target, detail, ip FROM audit_log ORDER BY seq ASC LIMIT ? OFFSET ?')
    .all(limit, offset) as Array<{ id: string; at: string; actor: string; action: string; target: string; detail: string | null; ip: string }>
  const items = rows.map((row) => ({
    id: row.id,
    at: row.at,
    actor: row.actor,
    action: row.action,
    target: row.target,
    ip: row.ip,
    ...(row.detail !== null && row.detail !== undefined ? { detail: row.detail } : {}),
  }))
  return { items, total }
}
