/**
 * 公开表单反垃圾字段组件（前端侧）。
 * ============================================================
 * - `CaptchaField`：图形验证码字段——自动取图 / 可点击刷新 / 内联错误。
 *   仅当后台站点配置 `site.auth.captcha !== false` 时渲染（后台「站点配置 → 安全」可关闭）；
 *   关闭时返回 null，同时服务端也会跳过校验，前后端开关一致。
 * - `HoneypotField`：蜜罐字段——视觉与无障碍均不可见，真人不会填、机器人会填；
 *   服务端命中即静默丢弃（见 gh-server/src/lib/formGuard.ts）。
 *
 * 契约：验证码回传字段为 `captchaToken`（随 `CaptchaField` 的 onTokenChange 上抛）+ `captchaCode`（用户输入）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCaptcha, type CaptchaChallenge } from '../../api/captcha'
import { useSiteAuth } from '../../hooks/useSiteConfig'

export type CaptchaFieldProps = {
  /** 用户当前输入的验证码（受控） */
  code: string
  onCodeChange: (code: string) => void
  /** token 变化回调：取图成功上抛 token，取图失败上抛空串 */
  onTokenChange: (token: string) => void
  /** 内联错误文案（由父表单校验产出） */
  error?: string
  disabled?: boolean
  /** 输入框 id（默认 captcha-code），用于 label 关联 */
  inputId?: string
}

/** 图形验证码字段：自动取图 + 点击刷新 + 内联错误 */
export function CaptchaField({ code, onCodeChange, onTokenChange, error, disabled, inputId = 'captcha-code' }: CaptchaFieldProps) {
  const enabled = useSiteAuth().captcha
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null)
  const [loading, setLoading] = useState(false)
  // 用 ref 承载回调，避免父组件传入内联函数导致取图副作用反复触发
  const tokenCb = useRef(onTokenChange)
  tokenCb.current = onTokenChange

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const next = await fetchCaptcha()
      setChallenge(next)
      tokenCb.current(next.token)
    } catch {
      // 取图失败：清空 token，交由提交时服务端返回「验证码不正确」并提示刷新
      setChallenge(null)
      tokenCb.current('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (enabled) void load()
  }, [enabled, load])

  // 后台关闭验证码时整体不渲染（与服务端跳过校验对齐）
  if (!enabled) return null

  return (
    <div className="field" style={{ marginTop: 'var(--gh-space-4)' }}>
      <label className="field__label" htmlFor={inputId}>
        验证码<span className="req">*</span>
      </label>
      <div className="row" style={{ gap: 'var(--gh-space-3)', alignItems: 'stretch', flexWrap: 'wrap' }}>
        <input
          id={inputId}
          className={`input${error ? ' input--error' : ''}`}
          value={code}
          placeholder="请输入图中字符"
          autoComplete="off"
          disabled={disabled}
          aria-invalid={Boolean(error)}
          style={{ flex: '1 1 160px', minWidth: 140 }}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
        />
        {/* 图形：内联 SVG（服务端生成，无外链）；点击可刷新 */}
        <button
          className="btn btn--ghost btn--sm captcha-figure"
          type="button"
          disabled={disabled || loading}
          aria-label="点击刷新验证码"
          title="点击刷新验证码"
          onClick={() => void load()}
        >
          {challenge?.svg ? (
            <span className="captcha-figure__svg" dangerouslySetInnerHTML={{ __html: challenge.svg }} />
          ) : (
            <span className="captcha-figure__ph">{loading ? '加载中…' : '点击获取'}</span>
          )}
        </button>
      </div>
      {error ? (
        <span className="field__error">{error}</span>
      ) : (
        <span className="field__hint">看不清可点击图片刷新；不区分大小写。</span>
      )}
    </div>
  )
}

/**
 * 蜜罐字段：以视觉隐藏（position/尺寸归零）承载 `website` 输入。
 * 真人不可见也不会填；机器人自动填表时会写入，服务端据此静默丢弃。
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
      <label htmlFor="hp-website">请勿填写此字段</label>
      <input id="hp-website" name="website" type="text" autoComplete="off" tabIndex={-1} />
    </div>
  )
}
