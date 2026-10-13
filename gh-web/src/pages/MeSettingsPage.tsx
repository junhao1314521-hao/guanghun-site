import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword } from '../api/auth'
import { fetchMySettings, updateMySettings } from '../api/account'
import { DemoToast, useDemoToast } from '../components/ui/DemoToast'
import { invalidateSession } from '../hooks/useSession'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 账号设置（二级页面）：账号与安全、基本资料、修改密码、登录设备、注销账号。
 * 基本资料与修改密码为真实接口（`PUT /api/account/settings`、`POST /api/auth/password`）；
 * 注销账号尚未接入后端，点击给出演示提示。
 */
export function MeSettingsPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { action: demoAction, notify, dismiss } = useDemoToast()

  const { data, loading, error } = useApi((signal) => fetchMySettings(signal), [])

  // 基本资料（改名 / 手机号）
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileMsg, setProfileMsg] = useState<string | null>(null)
  const [profileErr, setProfileErr] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)

  // 修改密码
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdMsg, setPwdMsg] = useState<string | null>(null)
  const [savingPwd, setSavingPwd] = useState(false)

  useEffect(() => {
    if (data?.user) {
      setName(data.user.name)
      setPhone(data.user.phone)
    }
  }, [data])

  const readyKey = loading ? 'loading' : 'ready'
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setProfileMsg(null)
    setProfileErr(null)
    setSavingProfile(true)
    try {
      await updateMySettings({ name: name.trim(), phone: phone.trim() })
      invalidateSession()
      setProfileMsg('基本资料已保存。')
    } catch (ex) {
      setProfileErr(ex instanceof Error ? ex.message : '保存失败，请稍后重试')
    } finally {
      setSavingProfile(false)
    }
  }

  const submitPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPwdError(null)
    setPwdMsg(null)
    if (!current || !next) {
      setPwdError('请填写当前密码与新密码')
      return
    }
    if (next.length < 6) {
      setPwdError('新密码至少 6 位')
      return
    }
    if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) {
      setPwdError('新密码需同时包含字母与数字')
      return
    }
    if (next !== confirm) {
      setPwdError('两次输入的新密码不一致')
      return
    }
    setSavingPwd(true)
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setPwdMsg('密码已修改，请使用新密码重新登录。')
      invalidateSession()
      // 改密后会话失效：稍后回登录页
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } catch (ex) {
      setPwdError(ex instanceof Error ? ex.message : '修改失败，请稍后重试')
    } finally {
      setSavingPwd(false)
    }
  }

  return (
    <div ref={rootRef}>
      {error ? (
        <div className="empty">
          <div className="empty__title">设置加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
        </div>
      ) : loading || !data ? (
        <div aria-busy="true" aria-label="设置加载中" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-4)' }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 120 }} />
          ))}
        </div>
      ) : (
        <>
          {/* 账号与安全 */}
          <section style={{ marginBottom: 'var(--gh-space-8)' }}>
            <div className="section__head">
              <div>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                  账号与安全
                </h2>
                <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  手机与邮箱可分别用于找回；更换后需重新验证。
                </p>
              </div>
            </div>
            <div className="card reveal">
              <div className="dl-meta">
                {data.security.map((item) => (
                  <div key={item.k}>
                    <div className="dl-meta__k">{item.k}</div>
                    <div className="dl-meta__v">{item.v}</div>
                    <div className="field__hint" style={{ marginTop: 'var(--gh-space-1)' }}>
                      {item.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 基本资料 */}
          <section style={{ marginBottom: 'var(--gh-space-8)' }}>
            <div className="section__head">
              <div>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                  基本资料
                </h2>
                <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  昵称与手机号用于个人中心展示与联系。
                </p>
              </div>
            </div>
            <form className="card reveal" onSubmit={saveProfile} noValidate>
              <div className="form-grid-2">
                <div className="field">
                  <label className="field__label" htmlFor="profileName">
                    昵称
                  </label>
                  <input
                    className="input"
                    id="profileName"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="profilePhone">
                    手机号
                  </label>
                  <input
                    className="input"
                    id="profilePhone"
                    value={phone}
                    placeholder="未绑定"
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
              </div>
              {profileErr && (
                <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
                  {profileErr}
                </span>
              )}
              {profileMsg && (
                <div className="alert alert--success" role="status" style={{ marginTop: 'var(--gh-space-3)' }}>
                  {profileMsg}
                </div>
              )}
              <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
                <button className={`btn btn--primary${savingProfile ? ' btn--loading' : ''}`} type="submit" disabled={savingProfile}>
                  保存资料
                </button>
              </div>
            </form>
          </section>

          {/* 修改密码 */}
          <section style={{ marginBottom: 'var(--gh-space-8)' }}>
            <div className="section__head">
              <div>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                  修改密码
                </h2>
                <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  修改后其他设备的登录态将失效，需重新登录。
                </p>
              </div>
            </div>
            <form className="card reveal" onSubmit={submitPassword} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="pwdCurrent">
                  当前密码
                </label>
                <input
                  className="input"
                  id="pwdCurrent"
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(event) => setCurrent(event.target.value)}
                />
              </div>
              <div className="form-grid-2" style={{ marginTop: 'var(--gh-space-4)' }}>
                <div className="field">
                  <label className="field__label" htmlFor="pwdNext">
                    新密码
                  </label>
                  <input
                    className="input"
                    id="pwdNext"
                    type="password"
                    autoComplete="new-password"
                    value={next}
                    onChange={(event) => setNext(event.target.value)}
                  />
                  <span className="field__hint">至少 6 位，需包含字母与数字。</span>
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="pwdConfirm">
                    确认新密码
                  </label>
                  <input
                    className="input"
                    id="pwdConfirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                  />
                </div>
              </div>
              {pwdError && (
                <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
                  {pwdError}
                </span>
              )}
              {pwdMsg && (
                <div className="alert alert--success" role="status" style={{ marginTop: 'var(--gh-space-3)' }}>
                  {pwdMsg}
                </div>
              )}
              <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
                <button className={`btn btn--primary${savingPwd ? ' btn--loading' : ''}`} type="submit" disabled={savingPwd}>
                  修改密码
                </button>
                <Link className="btn btn--ghost" to="/forgot">
                  忘记当前密码？
                </Link>
              </div>
            </form>
          </section>

          {/* 登录设备 */}
          <section style={{ marginBottom: 'var(--gh-space-8)' }}>
            <div className="section__head">
              <div>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                  登录设备
                </h2>
                <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  如非本人操作，请退出该设备并修改密码。
                </p>
              </div>
            </div>
            <div className="table-wrap reveal">
              <table className="table">
                <thead>
                  <tr>
                    <th>设备</th>
                    <th>最近使用</th>
                    <th>备注</th>
                    <th>
                      <span className="sr-only">操作</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.loginDevices.map((device) => (
                    <tr key={`${device.name}-${device.meta}`}>
                      <td>{device.name}</td>
                      <td className="mono">{device.meta}</td>
                      <td className="muted">{device.place}</td>
                      <td>
                        {device.current ? (
                          <span className="tag">当前设备</span>
                        ) : (
                          <button className="btn btn--sm btn--ghost" type="button" onClick={() => notify('退出该设备')}>
                            退出
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 注销账号 */}
          <section>
            <div className="section__head">
              <div>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                  注销账号
                </h2>
                <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  注销后账号数据将按隐私政策处理，且不可恢复。
                </p>
              </div>
            </div>
            <div className="card reveal">
              <p className="card__desc">注销前请确认已导出所需资料；绑定关系与历史工单将一并处理。</p>
              <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
                <button className="btn btn--danger" type="button" onClick={() => notify('注销账号')}>
                  注销账号
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <DemoToast action={demoAction} onDismiss={dismiss} />
    </div>
  )
}
