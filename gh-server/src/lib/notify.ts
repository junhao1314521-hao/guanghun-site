/**
 * 站内通知投递层（找回密码等场景使用）。
 *
 * 设计目标：**通道可插拔、未开通时优雅降级**。当前只实现 `webhook` 一种通道——
 * 它是所有短信 / 邮件服务商的通用出口：阿里云短信、腾讯云短信、企业邮箱都可以用一个
 * 云函数 / 中转服务包一层 HTTP 接口，官网这边只改环境变量即可生效，不需要改代码。
 *
 * 配置（写入 /opt/website/app/.env）：
 *   NOTIFY_CHANNEL=none|webhook        默认 none（不投递）
 *   NOTIFY_WEBHOOK_URL=https://...     通道为 webhook 时必填
 *   NOTIFY_WEBHOOK_TOKEN=...           可选，以 Authorization: Bearer 发送
 *   NOTIFY_TIMEOUT_MS=8000             可选，默认 8 秒
 *
 * 投递体（POST JSON）：
 *   { to, subject, text, purpose, at }
 * 网关可按 `purpose` 分流（password-reset / 其他），短信通道取 `text`。
 */
import { logger } from './logger'

export type NotifyChannel = 'none' | 'webhook'

/** 一条待投递通知；`to` 为邮箱或手机号，由网关自行判定 */
export type NotifyMessage = {
  to: string
  subject: string
  text: string
  /** 用途标识，便于网关路由与模板选择 */
  purpose: string
}

export type NotifyResult = {
  delivered: boolean
  channel: NotifyChannel
  /** 未送达原因（仅用于日志，不回传给前台） */
  reason?: string
}

/** 当前生效的通道；配置不全一律视为 none，避免半配置状态下静默失败 */
export function notifyChannel(): NotifyChannel {
  const raw = (process.env.NOTIFY_CHANNEL ?? 'none').trim().toLowerCase()
  if (raw === 'webhook' && (process.env.NOTIFY_WEBHOOK_URL ?? '').trim()) return 'webhook'
  return 'none'
}

/** 是否已接入真实投递通道（用于区分「直接返回令牌」与「真实发送」） */
export function isNotifyConfigured(): boolean {
  return notifyChannel() !== 'none'
}

/** 投递超时（毫秒） */
function notifyTimeoutMs(): number {
  const raw = Number(process.env.NOTIFY_TIMEOUT_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 8000
}

/** 投递一条通知；任何失败都只记日志并返回 delivered=false，不抛错、不阻塞主流程 */
export async function sendNotify(message: NotifyMessage): Promise<NotifyResult> {
  const channel = notifyChannel()
  if (channel === 'none') return { delivered: false, channel, reason: '未配置通知通道' }

  const url = (process.env.NOTIFY_WEBHOOK_URL ?? '').trim()
  const token = (process.env.NOTIFY_WEBHOOK_TOKEN ?? '').trim()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), notifyTimeoutMs())
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...message, at: new Date().toISOString() }),
      signal: controller.signal,
    })
    if (!res.ok) {
      logger.warn('通知投递失败', { channel, purpose: message.purpose, status: res.status })
      return { delivered: false, channel, reason: `HTTP ${res.status}` }
    }
    return { delivered: true, channel }
  } catch (err) {
    logger.warn('通知投递异常', { channel, purpose: message.purpose, error: (err as Error).message })
    return { delivered: false, channel, reason: (err as Error).message }
  } finally {
    clearTimeout(timer)
  }
}
