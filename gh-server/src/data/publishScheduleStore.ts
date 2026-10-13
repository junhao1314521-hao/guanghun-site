/**
 * 定时发布存储（schema v7）。
 *
 * - 存储：单库 `data/gh.sqlite` 中的 `publish_schedules` 表；写入即事务落库，重启不丢。
 * - 创建即捕获快照：登记一条排程时**当场快照当前内容**（与 backupStore.snapshot 同结构），
 *   到点直接应用该快照——避免「到点才快照」期间内容被改动导致发布非预期版本。
 * - 到点应用：复用 `restoreSnapshot`（整表覆盖）+ `createRelease`（生成发布记录，便于回滚），
 *   随后将状态置为 `applied`；应用异常置 `failed` 并记 error，**不抛出**（fail-safe，不让调度崩溃）。
 * - 取消：仅 `pending` 可取消（置 `canceled`）；已应用 / 失败 / 已取消的不可取消。
 *
 * 状态机：pending → {applied | failed | canceled}（终态不可逆）。
 */
import { randomBytes } from 'node:crypto'
import { getDb, runInTransaction } from './db'
import { snapshot, restoreSnapshot, type BackupSnapshot } from './backupStore'
import { createRelease } from './releaseStore'
import { logger } from '../lib/logger'

export type ScheduleStatus = 'pending' | 'applied' | 'failed' | 'canceled'

/** 对外排程条目（不含内部快照） */
export type ScheduleItem = {
  id: string
  /** 计划应用时间（ISO 8601） */
  at: string
  note?: string
  status: ScheduleStatus
  createdBy?: string
  createdAt: string
  appliedAt?: string
  error?: string
}

/** 行形状（SQLite 列名 snake_case） */
type ScheduleRow = {
  id: string
  at: string
  note: string | null
  snapshot: string | null
  status: string
  created_by: string | null
  created_at: string
  applied_at: string | null
  error: string | null
}

/** 生成稳定且可读的新 id */
function newId(): string {
  return `sch-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`
}

/** 行 → 对外条目 */
function rowToItem(row: ScheduleRow): ScheduleItem {
  const item: ScheduleItem = {
    id: row.id,
    at: row.at,
    status: row.status as ScheduleStatus,
    createdAt: row.created_at,
  }
  if (row.note) item.note = row.note
  if (row.created_by) item.createdBy = row.created_by
  if (row.applied_at) item.appliedAt = row.applied_at
  if (row.error) item.error = row.error
  return item
}

/** 解析快照（损坏 / 缺失返回 undefined） */
function parseSnapshot(raw: string | null): BackupSnapshot | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as BackupSnapshot
    if (!parsed || typeof parsed !== 'object' || !parsed.data) return undefined
    return parsed
  } catch {
    return undefined
  }
}

/**
 * 创建一条定时发布：当场快照当前内容并登记。
 * @param input.at     计划应用时间（ISO 8601；须晚于「现在」）
 * @param input.note   备注（可选）
 * @param input.createdBy 操作者（后台用户名）
 */
export function createSchedule(input: { at: string; note?: string; createdBy?: string }): ScheduleItem {
  const at = input.at.trim()
  const parsed = new Date(at)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('计划时间格式不合法（需 ISO 8601）')
  }
  if (parsed.getTime() <= Date.now()) {
    throw new Error('计划时间须晚于当前时间')
  }
  const snap = snapshot()
  const item: ScheduleItem = {
    id: newId(),
    at,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  if (input.note) item.note = input.note
  if (input.createdBy) item.createdBy = input.createdBy
  runInTransaction((db) => {
    db.prepare(
      'INSERT INTO publish_schedules(id, at, note, snapshot, status, created_by, created_at) VALUES(?, ?, ?, ?, ?, ?, ?)',
    ).run(item.id, item.at, item.note ?? null, JSON.stringify(snap), 'pending', item.createdBy ?? null, item.createdAt)
  })
  logger.info('已登记定时发布', { id: item.id, at: item.at })
  return item
}

/** 列表（按计划时间倒序；同刻按登记顺序倒序） */
export function listSchedules(): ScheduleItem[] {
  const rows = getDb()
    .prepare(
      'SELECT id, at, note, snapshot, status, created_by, created_at, applied_at, error FROM publish_schedules ORDER BY at DESC, rowid DESC',
    )
    .all() as ScheduleRow[]
  return rows.map(rowToItem)
}

/**
 * 取消定时发布：仅 `pending` 可取消。
 * 已应用 / 失败 / 已取消的返回 false（前端据此提示「不可取消」）。
 */
export function cancelSchedule(id: string): boolean {
  const result = runInTransaction((db) =>
    db.prepare("UPDATE publish_schedules SET status = 'canceled' WHERE id = ? AND status = 'pending'").run(id),
  )
  const hit = Number(result.changes) > 0
  if (hit) logger.info('已取消定时发布', { id })
  return hit
}

/**
 * 应用所有已到点且仍 pending 的排程（由调度器周期调用；也供「重启补跑」使用）。
 *
 * 单条失败不影响其余：每条独立 try/catch，异常置 `failed` + error，不抛出。
 * 应用成功后顺便生成一条发布记录（便于在「预览与发布」里回滚）。
 */
export function applyPendingSchedules(): number {
  const now = new Date().toISOString()
  const rows = getDb()
    .prepare(
      "SELECT id, at, note, snapshot, status, created_by, created_at, applied_at, error FROM publish_schedules WHERE status = 'pending' AND at <= ? ORDER BY at ASC, rowid ASC",
    )
    .all(now) as ScheduleRow[]
  let applied = 0
  for (const row of rows) {
    try {
      const snap = parseSnapshot(row.snapshot)
      if (!snap) {
        throw new Error('快照缺失或损坏')
      }
      restoreSnapshot(snap)
      createRelease({ actor: row.created_by ?? 'schedule', note: row.note ?? `定时发布 ${row.at}` })
      runInTransaction((db) =>
        db.prepare("UPDATE publish_schedules SET status = 'applied', applied_at = ? WHERE id = ?").run(
          new Date().toISOString(),
          row.id,
        ),
      )
      applied += 1
      logger.info('定时发布已应用', { id: row.id, at: row.at })
    } catch (err) {
      const message = (err as Error).message
      runInTransaction((db) =>
        db.prepare("UPDATE publish_schedules SET status = 'failed', error = ? WHERE id = ?").run(message, row.id),
      )
      logger.error('定时发布应用失败', { id: row.id, at: row.at, error: message })
    }
  }
  return applied
}
