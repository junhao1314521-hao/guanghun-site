/**
 * 接口层 · 邮件订阅（公开）
 * ============================================================
 *   POST /api/subscribe → 写入 subscribers 集合 + 记 subscribe 埋点 → { ok, receivedAt }
 *
 * 反垃圾：图形验证码 + 蜜罐字段（与咨询 / 预约同一套守卫）。
 */
import { transport } from './client'

export type SubscribeBody = {
  email: string
  /** 来源标记（home / footer 等） */
  source?: string
  captchaToken?: string
  captchaCode?: string
  /** 蜜罐字段（真人不可见） */
  website?: string
}

export type SubscribeResult = { ok: boolean; receivedAt: string }

/** 提交订阅：POST /api/subscribe */
export function submitSubscribe(body: SubscribeBody, signal?: AbortSignal): Promise<SubscribeResult> {
  return transport<SubscribeResult>(
    { path: '/api/subscribe', method: 'POST', body, signal },
    // 离线 / 演示环境：本地回执（不落库），保证 UI 可继续
    () => ({ ok: true, receivedAt: new Date().toISOString() }),
  )
}
