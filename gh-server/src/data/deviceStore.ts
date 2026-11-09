/**
 * 会员设备登记（保修备案）。
 *
 * 口径：
 * - **整机保修 36 个月**（面板不单独计算），保修到期 = 购买日期 + 36 个月，由服务端计算；
 * - 序列号 **全局唯一**（跨账号），已驳回的记录不占用序列号，允许用户修正后重新提交；
 * - 登记后状态为 `pending`（待审核），后台核对购买凭证后转 `active`（通过）或 `rejected`（驳回）；
 * - 仅 `pending` / `rejected` 允许本人删除，已通过的保修记录不可由用户删除。
 *
 * 数据落 SQLite `device_registrations` 表（见 db.ts v10）。
 */
import { randomBytes } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import path from 'node:path'
import { getDb, runInTransaction } from './db'
import { resolveUploadDir, saveUpload } from './uploadStore'

/** 整机保修时长（月） */
export const WARRANTY_MONTHS = 36

/** 审核状态 */
export type DeviceReviewStatus = 'pending' | 'active' | 'rejected'

/** 对外设备视图（前台 / 后台共用，字段由服务端计算） */
export type DeviceView = {
  id: string
  model: string
  sn: string
  purchasedAt: string
  channel: string
  receiptUrl: string
  status: DeviceReviewStatus
  /** 状态文案：待审核 / 在保 / 已过保 / 已驳回 */
  statusText: string
  /** 保修到期日（YYYY-MM-DD） */
  warrantyEnd: string
  /** 剩余天数（过保为负数） */
  remainingDays: number
  rejectReason: string
  createdAt: string
}

/** 后台视图：额外带登记人 */
export type AdminDeviceView = DeviceView & {
  userId: string
  username: string
  reviewedBy: string
  reviewedAt: string
}

type DeviceRow = {
  id: string
  user_id: string
  model: string
  sn: string
  purchased_at: string
  channel: string | null
  receipt_url: string
  status: string
  reject_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

type AdminDeviceRow = DeviceRow & { username: string | null }

/** 日期键（YYYY-MM-DD，UTC 语义，仅用于日历日运算） */
function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** 严格解析 YYYY-MM-DD；非法返回 null */
function parseDateKey(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  // 排除 2024-02-31 这类被自动进位的日期
  return dateKey(date) === value ? date : null
}

/** 当前日期（按中国时区取日历日，避免服务器 UTC 跨日偏差） */
function todayKey(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** 加若干个月；目标月无该日时取当月最后一天 */
function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = date.getUTCDate()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)))
}

/** 两个 YYYY-MM-DD 之间的天数差（b - a） */
function daysBetween(a: string, b: string): number {
  const from = Date.parse(`${a}T00:00:00Z`)
  const to = Date.parse(`${b}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

/** 序列号归一化：去空白并转大写（存储与唯一性判定都用归一化值） */
export function normalizeSn(sn: string): string {
  return sn.replace(/\s+/g, '').toUpperCase()
}

/** 计算保修到期日与剩余天数 */
function warrantyOf(purchasedAt: string): { warrantyEnd: string; remainingDays: number } {
  const purchased = parseDateKey(purchasedAt)
  if (!purchased) return { warrantyEnd: '', remainingDays: 0 }
  const end = dateKey(addMonths(purchased, WARRANTY_MONTHS))
  return { warrantyEnd: end, remainingDays: daysBetween(todayKey(), end) }
}

/** 状态文案：审核态优先，通过后按剩余天数区分在保 / 过保 */
function statusTextOf(status: DeviceReviewStatus, remainingDays: number): string {
  if (status === 'pending') return '待审核'
  if (status === 'rejected') return '已驳回'
  return remainingDays >= 0 ? '在保' : '已过保'
}

/** 行 → 视图 */
function toView(row: DeviceRow): DeviceView {
  const status = (row.status === 'active' || row.status === 'rejected' ? row.status : 'pending') as DeviceReviewStatus
  const { warrantyEnd, remainingDays } = warrantyOf(row.purchased_at)
  return {
    id: row.id,
    model: row.model,
    sn: row.sn,
    purchasedAt: row.purchased_at,
    channel: row.channel ?? '',
    receiptUrl: row.receipt_url,
    status,
    statusText: statusTextOf(status, remainingDays),
    warrantyEnd,
    remainingDays,
    rejectReason: row.reject_reason ?? '',
    createdAt: row.created_at,
  }
}

/** 某用户的设备列表（新登记在前） */
export function listDevices(userId: string): DeviceView[] {
  const rows = getDb()
    .prepare('SELECT * FROM device_registrations WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as unknown as DeviceRow[]
  return rows.map(toView)
}

/** 某用户的设备数量 */
export function countDevices(userId: string): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS n FROM device_registrations WHERE user_id = ?')
    .get(userId) as { n: number }
  return Number(row?.n ?? 0)
}

/** 序列号是否已被占用（已驳回的记录不占用） */
export function snTaken(sn: string): boolean {
  const row = getDb()
    .prepare("SELECT 1 AS hit FROM device_registrations WHERE sn = ? AND status <> 'rejected' LIMIT 1")
    .get(normalizeSn(sn)) as { hit?: number } | undefined
  return Boolean(row)
}

/** 登记结果 */
export type DeviceOutcome = { ok: true; device: DeviceView } | { ok: false; error: string }

/** 校验购买日期：格式合法、不晚于今天、不早于 2000 年 */
function validatePurchasedAt(value: string): string {
  if (!value) return '请选择购买日期'
  const parsed = parseDateKey(value)
  if (!parsed) return '购买日期格式应为 YYYY-MM-DD'
  const today = todayKey()
  if (value > today) return '购买日期不能晚于今天'
  if (value < '2000-01-01') return '购买日期不合法'
  return ''
}

/**
 * 登记设备：校验型号 / 序列号 / 购买日期 / 凭证，落库为待审核。
 * 调用前应已把凭证保存为可访问 URL（见 `saveReceipt`）。
 */
export function registerDevice(
  userId: string,
  input: { model: string; sn: string; purchasedAt: string; channel: string; receiptUrl: string },
): DeviceOutcome {
  const model = input.model.trim()
  const sn = normalizeSn(input.sn)
  if (!model) return { ok: false, error: '请填写型号' }
  if (model.length > 80) return { ok: false, error: '型号过长（最多 80 个字符）' }
  if (!sn) return { ok: false, error: '请填写序列号' }
  if (sn.length < 4 || sn.length > 64) return { ok: false, error: '序列号长度应为 4–64 位' }
  if (!/^[A-Z0-9._-]+$/.test(sn)) return { ok: false, error: '序列号仅支持字母、数字、点、下划线与连字符' }
  const dateError = validatePurchasedAt(input.purchasedAt)
  if (dateError) return { ok: false, error: dateError }
  if (!input.receiptUrl) return { ok: false, error: '请上传购买凭证' }
  if (snTaken(sn)) return { ok: false, error: '该序列号已被登记，请核对后重试' }

  const id = `dev-${randomBytes(8).toString('hex')}`
  const now = new Date().toISOString()
  try {
    runInTransaction((tx) => {
      // 同一用户此前的驳回记录不再累积：重新提交时清掉旧记录
      tx.prepare("DELETE FROM device_registrations WHERE user_id = ? AND sn = ? AND status = 'rejected'").run(userId, sn)
      tx.prepare(
        'INSERT INTO device_registrations(id, user_id, model, sn, purchased_at, channel, receipt_url, status, created_at) ' +
          "VALUES(?, ?, ?, ?, ?, ?, ?, 'pending', ?)",
      ).run(id, userId, model, sn, input.purchasedAt, input.channel.trim(), input.receiptUrl, now)
    })
  } catch (err) {
    return { ok: false, error: (err as Error).message.includes('UNIQUE') ? '该序列号已被登记，请核对后重试' : '登记失败，请稍后重试' }
  }
  const row = getDb().prepare('SELECT * FROM device_registrations WHERE id = ?').get(id) as unknown as DeviceRow
  return { ok: true, device: toView(row) }
}

/** 删除结果 */
export type DeleteDeviceOutcome = { ok: true } | { ok: false; error: string }

/** 本人删除设备：已审核通过（active）的保修记录不可删除 */
export function deleteDevice(userId: string, id: string): DeleteDeviceOutcome {
  const row = getDb().prepare('SELECT status FROM device_registrations WHERE id = ? AND user_id = ?').get(id, userId) as
    | { status: string }
    | undefined
  if (!row) return { ok: false, error: '未找到该设备' }
  if (row.status === 'active') return { ok: false, error: '已审核通过的设备不可删除，如需变更请联系售后' }
  getDb().prepare('DELETE FROM device_registrations WHERE id = ?').run(id)
  return { ok: true }
}

/* ============================================================
   购买凭证（前台会员上传，落盘到 uploads 目录）
   ============================================================ */

/** 允许的凭证类型 → 扩展名 / MIME */
const RECEIPT_TYPES: Record<string, { ext: string; mime: string }> = {
  'image/png': { ext: 'png', mime: 'image/png' },
  'image/jpeg': { ext: 'jpg', mime: 'image/jpeg' },
  'image/webp': { ext: 'webp', mime: 'image/webp' },
  'application/pdf': { ext: 'pdf', mime: 'application/pdf' },
}

/** 凭证大小上限（字节）：5MB */
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024

export type SaveReceiptResult = { ok: true; url: string } | { ok: false; error: string }

/** 保存购买凭证：接受 data URL（base64），仅图片 / PDF，≤5MB */
export function saveReceipt(dataUrl: string): SaveReceiptResult {
  const match = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl.trim())
  if (!match) return { ok: false, error: '凭证格式不正确，请重新选择文件' }
  const mime = match[1].toLowerCase()
  const type = RECEIPT_TYPES[mime]
  if (!type) return { ok: false, error: '凭证仅支持 JPG / PNG / WebP / PDF' }
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length === 0) return { ok: false, error: '凭证文件为空' }
  if (buffer.length > RECEIPT_MAX_BYTES) return { ok: false, error: '凭证文件不能超过 5MB' }
  const result = saveUpload(buffer, `receipt-${randomBytes(6).toString('hex')}.${type.ext}`, type.mime)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, url: result.item.url }
}

/** 登记失败时清理已落盘的凭证，避免产生孤儿文件 */
export function discardReceipt(url: string): void {
  if (!url.startsWith('/uploads/')) return
  const name = path.basename(url)
  if (!name) return
  try {
    unlinkSync(path.join(resolveUploadDir(), name))
  } catch {
    // 文件不存在 / 已被清理：忽略
  }
}

/* ============================================================
   后台审核
   ============================================================ */

/** 后台设备列表：待审核优先，其余按登记时间倒序 */
export function listAllDevices(status?: string): AdminDeviceView[] {
  const filter = status === 'pending' || status === 'active' || status === 'rejected' ? status : ''
  const rows = getDb()
    .prepare(
      'SELECT d.*, u.username AS username FROM device_registrations d ' +
        'LEFT JOIN users u ON u.id = d.user_id ' +
        (filter ? 'WHERE d.status = ? ' : '') +
        "ORDER BY CASE d.status WHEN 'pending' THEN 0 ELSE 1 END, d.created_at DESC",
    )
    .all(...(filter ? [filter] : [])) as unknown as AdminDeviceRow[]
  return rows.map((row) => ({
    ...toView(row),
    userId: row.user_id,
    username: row.username ?? '（账号已注销）',
    reviewedBy: row.reviewed_by ?? '',
    reviewedAt: row.reviewed_at ?? '',
  }))
}

/** 审核结果 */
export type ReviewOutcome = { ok: true; device: AdminDeviceView } | { ok: false; error: string }

/** 审核设备：仅待审核记录可操作；驳回必须填写原因 */
export function reviewDevice(
  id: string,
  reviewer: string,
  action: 'approve' | 'reject',
  reason = '',
): ReviewOutcome {
  const row = getDb()
    .prepare('SELECT d.*, u.username AS username FROM device_registrations d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?')
    .get(id) as unknown as AdminDeviceRow | undefined
  if (!row) return { ok: false, error: '未找到该设备记录' }
  if (row.status !== 'pending') return { ok: false, error: '该记录已审核，不能重复操作' }
  const rejectReason = reason.trim()
  if (action === 'reject' && !rejectReason) return { ok: false, error: '请填写驳回原因' }
  getDb()
    .prepare('UPDATE device_registrations SET status = ?, reject_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?')
    .run(action === 'approve' ? 'active' : 'rejected', action === 'reject' ? rejectReason : null, reviewer, new Date().toISOString(), id)
  const fresh = getDb()
    .prepare('SELECT d.*, u.username AS username FROM device_registrations d LEFT JOIN users u ON u.id = d.user_id WHERE d.id = ?')
    .get(id) as unknown as AdminDeviceRow
  return {
    ok: true,
    device: {
      ...toView(fresh),
      userId: fresh.user_id,
      username: fresh.username ?? '（账号已注销）',
      reviewedBy: fresh.reviewed_by ?? '',
      reviewedAt: fresh.reviewed_at ?? '',
    },
  }
}
