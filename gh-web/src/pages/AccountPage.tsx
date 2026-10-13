import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { DemoToast, useDemoToast } from '../components/ui/DemoToast'
import { fetchAccount, type AccountPayload } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 客户中心加载骨架：沿用概览卡与列表的行高，避免数据到位时布局跳动 */
function AccountSkeleton() {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }} aria-busy="true" aria-label="内容加载中">
      <div className="grid-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="card" key={index}>
            <div className="skeleton" style={{ height: 30, width: '40%' }} />
            <div className="skeleton" style={{ height: 14, width: '66%', marginTop: 'var(--gh-space-2)' }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)', marginTop: 'var(--gh-space-6)' }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="skeleton" key={index} style={{ height: 48 }} />
        ))}
      </div>
    </div>
  )
}

/** 客户中心（一级页面 · 骨架层）：左导航 + 右内容；数据为占位示例 */
export function AccountPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // 尚未接入后端的操作统一给出演示提示，避免死按钮
  const { action: demoAction, notify, dismiss } = useDemoToast()

  const { data, loading, error } = useApi((signal) => fetchAccount(signal), [reloadKey])
  const nav = data?.ACCOUNT_NAV ?? []

  // 左侧导航当前项：数据未就绪或未点选时回退到首项（与原先初始态一致）
  const [active, setActive] = useState('')
  const activeId = active || nav[0]?.id
  // 收藏列表本地可增删，让「取消收藏」成为真实可用的交互（仅记录被移除项，数据源仍来自接口）
  const [removed, setRemoved] = useState<string[]>([])
  const favorites: AccountPayload['FAVORITES'] = (data?.FAVORITES ?? []).filter((item) => !removed.includes(item.name))
  // 订阅开关本地覆盖，其余取接口返回的默认值
  const [subOverrides, setSubOverrides] = useState<Record<string, boolean>>({})
  const subs = Object.fromEntries((data?.FAVORITES ?? []).map((item) => [item.name, subOverrides[item.name] ?? item.subscribed]))

  const removeFavorite = (name: string) => setRemoved((prev) => [...prev, name])

  // 数据到位后区块才渲染，用 readyKey 触发一次动效重绑
  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  return (
    <div ref={rootRef}>
      {/* 页头 */}
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <span>客户中心</span>
        </nav>
        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <h1 className="section__title">客户中心</h1>
            <p className="section__desc">管理已登记的设备、跟踪咨询进度、管理收藏与订阅。</p>
          </div>
          <div className="row">
            <button className="btn btn--secondary" type="button" onClick={() => notify('退出登录')}>
              退出登录
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
          <div className="empty">
            <div className="empty__title">内容加载失败</div>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        </div>
      ) : loading || !data ? (
        <AccountSkeleton />
      ) : (
        <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
          <div className="center-layout">
            {/* 左侧导航 */}
            <aside className="card center-nav">
              <div className="row" style={{ gap: 'var(--gh-space-3)', marginBottom: 'var(--gh-space-4)' }}>
                <span className="avatar">{data.PROFILE.initial}</span>
                <div>
                  <div style={{ fontWeight: 'var(--gh-weight-medium)' }}>{data.PROFILE.name}</div>
                  <div className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                    {data.PROFILE.meta}
                  </div>
                </div>
              </div>
              <nav aria-label="客户中心导航">
                {nav.map((item) => (
                  <Link
                    className={`spot-row${activeId === item.id ? ' is-active' : ''}`}
                    to={`#${item.id}`}
                    key={item.id}
                    onClick={() => setActive(item.id)}
                  >
                    <span className="spot-row__name">{item.label}</span>
                    <span className="news-row__go" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                ))}
              </nav>
              <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
                昵称、尾号与上方数据以官方最终公布为准。
              </p>
            </aside>

            {/* 右侧内容 */}
            <div>
              {/* 概览 */}
              <section id="c-overview" style={{ marginBottom: 'var(--gh-space-8)' }}>
                <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                  概览
                </h2>
                <div className="grid-3" style={{ marginTop: 'var(--gh-space-5)' }}>
                  {data.OVERVIEW_STATS.map((item) => (
                    <div className="card reveal" key={item.label}>
                      <div className="stat__value">{item.value}</div>
                      <div className="stat__label">{item.label}</div>
                    </div>
                  ))}
                </div>
                <div className="alert alert--info reveal" style={{ marginTop: 'var(--gh-space-5)' }}>
                  {data.OVERVIEW_ALERT}
                </div>
              </section>

              {/* 我的设备 */}
              <section id="c-devices" style={{ marginBottom: 'var(--gh-space-8)' }}>
                <div className="section__head">
                  <div>
                    <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                      我的设备
                    </h2>
                    <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                      同一型号可登记多台；未接入验证源时显示「未验证」。
                    </p>
                  </div>
                  <button className="btn btn--secondary btn--sm" type="button" onClick={() => notify('登记新设备')}>
                    登记新设备
                  </button>
                </div>
                <div className="table-wrap reveal">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>型号</th>
                        <th>序列号</th>
                        <th>状态</th>
                        <th>保修剩余</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ACCOUNT_DEVICES.map((device) => (
                        <tr key={device.sn}>
                          <td>{device.model}</td>
                          <td className="mono">{device.sn}</td>
                          <td>
                            <span className={`status status--${device.status}`}>{device.statusText}</span>
                          </td>
                          <td className="mono">{device.warranty}</td>
                          <td>
                            {device.action.to ? (
                              <Link className={`btn btn--sm btn--${device.action.variant}`} to={device.action.to}>
                                {device.action.label}
                              </Link>
                            ) : (
                              <button
                                className={`btn btn--sm btn--${device.action.variant}`}
                                type="button"
                                onClick={() => notify(device.action.label)}
                              >
                                {device.action.label}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)' }}>
                  序列号与保修天数以官方最终公布为准；无数据的项显示「暂无」而非 0。
                </p>
              </section>

              {/* 我的咨询 */}
              <section id="c-tickets" style={{ marginBottom: 'var(--gh-space-8)' }}>
                <div className="section__head">
                  <div>
                    <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                      我的咨询
                    </h2>
                    <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                      状态流转：待处理 → 处理中 → 等待补充 → 已解决 → 已关闭。
                    </p>
                  </div>
                  <Link className="btn btn--primary btn--sm is-magnetic" to="/support#contact">
                    提交咨询
                  </Link>
                </div>
                <div className="news-list reveal">
                  {data.ACCOUNT_TICKETS.map((ticket) => (
                    <Link className="news-row" to="/support#contact" key={ticket.title}>
                      <span className="news-row__date">{ticket.date}</span>
                      <span className={`tag${ticket.accent ? ' tag--accent' : ''}`}>{ticket.tag}</span>
                      <span className="news-row__title">{ticket.title}</span>
                      <span className="news-row__go" aria-hidden="true">
                        →
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)' }}>
                  客户端不可见内部备注；补充材料后状态回到「处理中」。
                </p>
              </section>

              {/* 收藏与订阅 */}
              <section id="c-favorites" style={{ marginBottom: 'var(--gh-space-8)' }}>
                <div className="section__head">
                  <div>
                    <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                      收藏与订阅
                    </h2>
                    <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                      取消收藏后移出列表；关闭订阅后不再收到该类通知。
                    </p>
                  </div>
                </div>
                <div className="card reveal">
                  {favorites.map((item, index) => (
                    <div
                      className="row"
                      key={item.name}
                      style={{
                        justifyContent: 'space-between',
                        paddingBottom: index === favorites.length - 1 ? 0 : 'var(--gh-space-3)',
                        paddingTop: index === 0 ? 0 : 'var(--gh-space-3)',
                        borderBottom: index === favorites.length - 1 ? undefined : '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'var(--gh-weight-medium)' }}>{item.name}</div>
                        <div className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                          {item.spec}
                        </div>
                      </div>
                      <div className="row">
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={subs[item.name]}
                            onChange={(event) => setSubOverrides((prev) => ({ ...prev, [item.name]: event.target.checked }))}
                          />
                          <span className="switch__track" />
                          <span>新品与降价通知</span>
                        </label>
                        <button className="btn btn--sm btn--ghost" type="button" onClick={() => removeFavorite(item.name)}>
                          取消收藏
                        </button>
                      </div>
                    </div>
                  ))}
                  {favorites.length === 0 && (
                    <p className="section__desc" style={{ margin: 0, fontSize: 'var(--gh-font-size-body-sm)' }}>
                      暂无收藏。在产品页点击收藏后，型号会出现在这里。
                    </p>
                  )}
                </div>
              </section>

              {/* 账号与安全 */}
              <section id="c-security">
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
                    {data.SECURITY.map((item) => (
                      <div key={item.k}>
                        <div className="dl-meta__k">{item.k}</div>
                        <div className="dl-meta__v">{item.v}</div>
                        <div className="field__hint" style={{ marginTop: 'var(--gh-space-1)' }}>
                          {item.hint}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
                    <button className="btn btn--secondary" type="button" onClick={() => notify('修改密码')}>
                      修改密码
                    </button>
                    <button className="btn btn--secondary" type="button" onClick={() => notify('更换手机')}>
                      更换手机
                    </button>
                    <button className="btn btn--secondary" type="button" onClick={() => notify('更换邮箱')}>
                      更换邮箱
                    </button>
                    <button className="btn btn--danger" type="button" onClick={() => notify('退出登录')}>
                      退出登录
                    </button>
                  </div>
                  <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
                    退出登录会清除本机登录状态；绑定关系与历史咨询记录不受影响。
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <DemoToast action={demoAction} onDismiss={dismiss} />
    </div>
  )
}