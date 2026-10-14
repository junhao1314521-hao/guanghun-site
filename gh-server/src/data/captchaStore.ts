/**
 * 图形验证码存储（内存，零外部依赖）。
 * ============================================================
 * 用途：登录 / 注册 / 咨询 / 订阅 / 合作等**公开表单**的反垃圾第一道闸——
 * 服务端生成一次性验证码（token + 4 位字符），前端取图后连同 token 回传校验。
 *
 * 设计要点：
 * - **一次性**：校验成功或过期即从内存表移除（`consumeCaptcha`），不可重放；
 * - **有效期**：默认 5 分钟（`CAPTCHA_TTL_MS` 可覆盖），过期条目在读写时顺带清理；
 * - **容量上限**：最多保留 `CAPTCHA_MAX`（默认 2000）条，超出按插入顺序淘汰最旧，防内存膨胀；
 * - **不落库**：验证码为短周期数据，进程重启即失效（多实例部署请交由网关 / Redis 承担）；
 * - **SVG 图形**：以轻微旋转 / 噪点 / 干扰线弱化机器识别，深浅主题下均用中性色，保持可读。
 *
 * 校验开关：见 `captchaRequired()`——默认开启，`CAPTCHA_ENABLED=0` 时关闭（便于本地联调与单测）。
 */

import { randomBytes, randomInt } from 'node:crypto'

/** 验证码字符集：剔除易混淆的 0/O/1/I/L，降低人工识别成本 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** 验证码长度 */
const CODE_LENGTH = 4

/** 有效期（毫秒）：`CAPTCHA_TTL_MS` 可覆盖，默认 5 分钟 */
function ttlMs(): number {
  const raw = Number(process.env.CAPTCHA_TTL_MS)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5 * 60 * 1000
}

/** 内存容量上限：`CAPTCHA_MAX` 可覆盖，默认 2000 */
function maxEntries(): number {
  const raw = Number(process.env.CAPTCHA_MAX)
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 2000
}

/**
 * 环境级总开关：是否启用验证码校验。
 * - `CAPTCHA_ENABLED=1` 强制开启（即使处于测试态也可显式开启，便于单测覆盖验证码分支）；
 * - `CAPTCHA_ENABLED=0` 强制关闭（本地联调 / 自动化测试用）；
 * - 未显式配置：生产 / 开发默认**开启**，自动化测试（NODE_ENV=test）默认**关闭**——
 *   避免既有契约 / 账号 / e2e 用例需先构造验证码。
 */
export function captchaRequired(): boolean {
  const raw = process.env.CAPTCHA_ENABLED
  if (raw === '0') return false
  if (raw === '1') return true
  return process.env.NODE_ENV !== 'test'
}

/**
 * 综合判定「本次请求是否需要校验验证码」：环境总开关 + 后台站点配置开关（`site.auth.captcha`）。
 * 任一关闭即免校验（后台可在「站点配置 → 安全」里临时关闭验证码，便于内部联调）。
 */
export function captchaNeeded(siteCaptchaEnabled?: boolean): boolean {
  if (!captchaRequired()) return false
  return siteCaptchaEnabled !== false
}

/** 待校验条目：验证码明文 + 过期时间 */
type CaptchaEntry = { code: string; expiresAt: number }

/** 内存表：token → 条目（Map 保留插入顺序，便于淘汰最旧） */
const STORE = new Map<string, CaptchaEntry>()

/** 生成随机验证码明文 */
function randomCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[randomInt(0, ALPHABET.length)]
  return code
}

/** 生成高对比度随机字符色（深蓝—靛—青之间，避免过浅） */
function randomInk(): string {
  const palette = ['#1f2d5a', '#274690', '#0f5a63', '#3b2f6b', '#1b4d7a']
  return palette[randomInt(0, palette.length)]
}

/**
 * 生成验证码图形（内联 SVG）。
 * 以中性色基准 + 轻微随机旋转 / 噪点 / 干扰线弱化机器识别；宽 120 高 40。
 */
function renderSvg(code: string): string {
  const width = 120
  const height = 40
  const chars = code.split('').map((char, index) => {
    const x = 16 + index * 24
    const y = 27 + randomInt(-3, 4)
    const rotate = randomInt(-18, 19)
    const ink = randomInk()
    const size = randomInt(20, 26)
    return `<text x="${x}" y="${y}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="${size}" font-weight="700" fill="${ink}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`
  })
  // 干扰线：3 条，半透明
  const lines = Array.from({ length: 3 }).map(() => {
    const x1 = randomInt(0, width)
    const y1 = randomInt(0, height)
    const x2 = randomInt(0, width)
    const y2 = randomInt(0, height)
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8a93a6" stroke-width="1" opacity="0.4"/>`
  })
  // 噪点：18 个
  const dots = Array.from({ length: 18 }).map(() => {
    const cx = randomInt(0, width)
    const cy = randomInt(0, height)
    return `<circle cx="${cx}" cy="${cy}" r="1" fill="#b6bccb" opacity="0.6"/>`
  })
  // 背景：浅色底 + 轻微渐变，保证深浅主题下都清晰
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="图形验证码">` +
    `<rect width="${width}" height="${height}" rx="6" fill="#eef1f6"/>` +
    `${dots.join('')}${lines.join('')}${chars.join('')}` +
    '</svg>'
  )
}

/** 淘汰过期条目（读写时顺带调用） */
function prune(): void {
  const now = Date.now()
  for (const [token, entry] of STORE) {
    if (entry.expiresAt <= now) STORE.delete(token)
  }
}

/** 生成一组验证码：返回 token（前端回传用）与 SVG 图形（前端内联展示） */
export function createCaptcha(): { token: string; svg: string; expiresInSec: number } {
  prune()
  // 容量控制：超限时按插入顺序淘汰最旧
  while (STORE.size >= maxEntries()) {
    const oldest = STORE.keys().next().value
    if (oldest === undefined) break
    STORE.delete(oldest)
  }
  const token = randomBytes(16).toString('hex')
  const code = randomCode()
  STORE.set(token, { code, expiresAt: Date.now() + ttlMs() })
  return { token, svg: renderSvg(code), expiresInSec: Math.round(ttlMs() / 1000) }
}

/**
 * 校验并消费验证码：
 * - 开关关闭（`captchaRequired() === false`）→ 直接返回 true（不消费）；
 * - token / 输入任一为空 → false；
 * - 命中且未过期且**忽略大小写**匹配 → 消费该 token 并返回 true；
 * - 其余（不存在 / 已使用 / 过期 / 不匹配）→ false（不存在时不泄漏原因）。
 */
export function verifyCaptcha(token: string, input: string): boolean {
  if (!captchaRequired()) return true
  const key = token.trim()
  const answer = input.trim().toUpperCase()
  if (!key || !answer) return false
  const entry = STORE.get(key)
  if (!entry) return false
  if (entry.expiresAt <= Date.now()) {
    STORE.delete(key)
    return false
  }
  // 一次性：无论对错均消费，避免枚举试探
  STORE.delete(key)
  return entry.code === answer
}
