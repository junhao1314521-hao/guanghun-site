/**
 * 账号注销后的数据保留与到期清理。
 *
 * 保留口径（与前台设置页、隐私政策文案一致）：
 * - 咨询工单：注销时去标识化，保留 24 个月后物理删除；
 * - 设备保修记录：保留至「保修结束（购买日 + 36 个月）+ 6 个月」后物理删除，
 *   删除时 SN 释放，可被新账号正常登记。
 *
 * 由调度器每天执行一次；函数本身接受 `now` 以支持测试注入时间。
 */
import { getDb } from './db'

/** 工单保留期（月） */
const INQUIRY_RETENTION_MONTHS = 24
/** 保修结束后额外保留期（月） */
const WARRANTY_EXTRA_MONTHS = 6
/** 保修期（月），与 deviceStore 保持一致 */
const WARRANTY_MONTHS = 36

type CollectionRow = { id: string; data: string }

/** 按自然月偏移（UTC 语义，仅用于保留期判断） */
function addMonths(iso: string, months: number): Date | null {
  const source = new Date(iso)
  if (Number.isNaN(source.getTime())) return null
  const target = new Date(source.getTime())
  target.setUTCMonth(target.getUTCMonth() + months)
  return target
}

/** 删除超过保留期的已注销工单 */
function purgeInquiries(now: Date): number {
  const rows = getDb()
    .prepare("SELECT id, data FROM collections WHERE key = 'inquiries'")
    .all() as CollectionRow[]
  const remove = getDb().prepare("DELETE FROM collections WHERE key = 'inquiries' AND id = ?")
  let removed = 0
  for (const row of rows) {
    let item: Record<string, unknown>
    try {
      item = JSON.parse(row.data) as Record<string, unknown>
    } catch {
      continue
    }
    const anonymizedAt = typeof item.anonymizedAt === 'string' ? item.anonymizedAt : ''
    const expiresAt = anonymizedAt ? addMonths(anonymizedAt, INQUIRY_RETENTION_MONTHS) : null
    if (!expiresAt || now.getTime() < expiresAt.getTime()) continue
    remove.run(row.id)
    removed += 1
  }
  return removed
}

/** 删除超过「保修结束 + 6 个月」的已注销设备记录 */
function purgeDevices(now: Date): number {
  const rows = getDb()
    .prepare(
      'SELECT id, purchased_at, anonymized_at FROM device_registrations WHERE anonymized_at IS NOT NULL',
    )
    .all() as Array<{ id: string; purchased_at: string; anonymized_at: string }>
  const remove = getDb().prepare('DELETE FROM device_registrations WHERE id = ?')
  let removed = 0
  for (const row of rows) {
    const warrantyEnd = addMonths(row.purchased_at, WARRANTY_MONTHS + WARRANTY_EXTRA_MONTHS)
    // 购买日期异常时退化为「注销后 24 个月」，避免记录永久残留
    const fallback = addMonths(row.anonymized_at, INQUIRY_RETENTION_MONTHS)
    const expiresAt = warrantyEnd ?? fallback
    if (!expiresAt || now.getTime() < expiresAt.getTime()) continue
    remove.run(row.id)
    removed += 1
  }
  return removed
}

/** 执行一次到期清理，返回删除条数（供日志与测试断言） */
export function purgeExpiredAnonymizedData(now: Date = new Date()): {
  inquiries: number
  devices: number
} {
  return { inquiries: purgeInquiries(now), devices: purgeDevices(now) }
}
