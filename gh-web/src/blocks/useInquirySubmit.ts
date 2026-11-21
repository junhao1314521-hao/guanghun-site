/**
 * 咨询提交共用逻辑（§1.6）。
 * ============================================================
 * 完整表单（InquiryForm）与首页快速提问（InquiryDockBlock）此前各自维护一份
 * 「必填校验 + 验证码 + 提交 + 错误重试」，行为容易漂移；这里收敛为一份：
 * - `quick = true` 只校验联系方式与问题描述（首页快速提问）；
 * - 完整表单额外校验称呼、产品型号；
 * - 验证码开关跟随站点配置，失败后统一刷新验证码。
 */
import { useState, type FormEvent } from 'react'
import { submitInquiry, type InquiryBody, type InquiryResult } from '../api/support-extra'
import { useSiteAuth } from '../hooks/useSiteConfig'

export type InquiryStatus = 'idle' | 'submitting' | 'success' | 'error'
export type InquiryErrors = Partial<Record<'name' | 'contact' | 'model' | 'message' | 'captcha', string>>

export function useInquirySubmit(quick: boolean) {
  const auth = useSiteAuth()
  const [status, setStatus] = useState<InquiryStatus>('idle')
  const [result, setResult] = useState<InquiryResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [errors, setErrors] = useState<InquiryErrors>({})
  const [captchaCode, setCaptchaCode] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaNonce, setCaptchaNonce] = useState(0)

  /** 提交表单：从表单元素读取蜜罐值，校验通过后调用接口 */
  async function submitForm(event: FormEvent<HTMLFormElement>, body: InquiryBody) {
    event.preventDefault()
    const honeypot = String(new FormData(event.currentTarget).get('website') ?? '')
    const next: InquiryErrors = {}
    if (!quick) {
      if (!body.name.trim()) next.name = '请填写称呼'
      if (!body.model.trim()) next.model = '请填写产品型号'
    }
    if (!body.contact.trim()) next.contact = '请填写联系方式'
    if (!body.message.trim()) next.message = '请描述遇到的问题'
    if (auth.captcha && !captchaCode.trim()) next.captcha = '请输入图形验证码'
    setErrors(next)
    if (Object.keys(next).length > 0) {
      setStatus('idle')
      return
    }
    setStatus('submitting')
    setErrorMsg('')
    try {
      const res = await submitInquiry({ ...body, captchaToken, captchaCode, website: honeypot })
      setResult(res)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '提交失败，请稍后重试')
      setStatus('error')
      // 服务端每次校验都消费令牌，失败后强制刷新验证码
      setCaptchaCode('')
      setCaptchaNonce((n) => n + 1)
    }
  }

  /** 清空错误与验证码（重置 / 再提交一单） */
  function resetSubmit() {
    setResult(null)
    setErrorMsg('')
    setErrors({})
    setCaptchaCode('')
    setCaptchaNonce((n) => n + 1)
    setStatus('idle')
  }

  /** 清空单个字段错误（输入时即时消除红框） */
  function clearError(key: keyof InquiryErrors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: '' } : prev))
  }

  return {
    status,
    result,
    errorMsg,
    errors,
    captchaCode,
    captchaToken,
    captchaNonce,
    setCaptchaCode,
    setCaptchaToken,
    setStatus,
    submitForm,
    resetSubmit,
    clearError,
  }
}
