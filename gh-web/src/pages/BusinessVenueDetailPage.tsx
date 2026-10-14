import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { fetchBizVenue } from '../api/business-extra'
import { submitInquiry } from '../api/support-extra'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 体验点详情加载骨架 */
function VenueDetailSkeleton() {
  return (
    <div className="container" aria-busy="true" aria-label="体验点加载中" style={{ paddingTop: 'var(--gh-space-6)' }}>
      <div className="skeleton" style={{ height: 14, width: '28%' }} />
      <div className="skeleton" style={{ height: 32, width: '58%', marginTop: 'var(--gh-space-4)' }} />
      <div className="skeleton" style={{ height: 16, width: '42%', marginTop: 'var(--gh-space-3)' }} />
      <div className="skeleton" style={{ height: 160, marginTop: 'var(--gh-space-5)' }} />
    </div>
  )
}

/** 商业合作 · 体验点详情：门市信息、在售产品、服务项目与到店预约 */
export function BusinessVenueDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // 到店预约：真实提交至咨询工单（与产品咨询共用同一套工单）
  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserve, setReserve] = useState({ name: '', contact: '', visitTime: '', note: '' })
  const [reserveErr, setReserveErr] = useState<string | null>(null)
  const [reserveTicket, setReserveTicket] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const { data: detail, loading, error } = useApi((signal) => fetchBizVenue(id, signal), [id, reloadKey])

  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const submitReserve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReserveErr(null)
    if (!reserve.name.trim() || !reserve.contact.trim()) {
      setReserveErr('请填写称呼与联系方式')
      return
    }
    setSending(true)
    try {
      const res = await submitInquiry({
        name: reserve.name.trim(),
        contact: reserve.contact.trim(),
        model: detail?.name ?? '体验点',
        topic: '预约到店',
        message: `预约时间：${reserve.visitTime.trim() || '待确认'}\n备注：${reserve.note.trim() || '无'}`,
      })
      setReserveTicket(res.ticketId)
      setReserve({ name: '', contact: '', visitTime: '', note: '' })
    } catch (ex) {
      setReserveErr(ex instanceof Error ? ex.message : '提交失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <VenueDetailSkeleton />

  if (!detail) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/business">商业合作</Link>
          <span>/</span>
          <Link to="/business/venues">线下体验点</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">未找到该体验点</div>
          <p className="empty__desc">{error?.message ?? '门店可能已调整或链接有误'}，返回体验点列表重新选择。</p>
          <div style={{ display: 'flex', gap: 'var(--gh-space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/business/venues">
              返回体验点列表
            </Link>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/business">商业合作</Link>
          <span>/</span>
          <Link to="/business/venues">线下体验点</Link>
          <span>/</span>
          <span>{detail.name}</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)' }}>
          <div>
            <h1 className="section__title">{detail.name}</h1>
            <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
              <span className={`status ${detail.ok ? 'status--success' : 'status--muted'}`}>{detail.status}</span>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                {detail.city} · {detail.area}
              </span>
            </div>
          </div>
          <Link className="btn btn--secondary" to="/business/venues">
            返回体验点列表
          </Link>
        </div>
      </div>

      {/* 门市信息 + 到店预约 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card reveal">
            <h2 className="card__title">门市信息</h2>
            <div className="dl-meta" style={{ marginTop: 'var(--gh-space-4)' }}>
              <div>
                <div className="dl-meta__k">地址</div>
                <div className="dl-meta__v" style={{ fontFamily: 'var(--gh-font-sans)', fontSize: 'var(--gh-font-size-body-sm)' }}>
                  {detail.address}
                </div>
              </div>
              <div>
                <div className="dl-meta__k">电话</div>
                <div className="dl-meta__v">{detail.phone}</div>
              </div>
              <div>
                <div className="dl-meta__k">营业时间</div>
                <div className="dl-meta__v" style={{ fontFamily: 'var(--gh-font-sans)', fontSize: 'var(--gh-font-size-body-sm)' }}>
                  {detail.hours}
                </div>
              </div>
              <div>
                <div className="dl-meta__k">交通</div>
                <div className="dl-meta__v" style={{ fontFamily: 'var(--gh-font-sans)', fontSize: 'var(--gh-font-size-body-sm)' }}>
                  {detail.transport}
                </div>
              </div>
            </div>
          </div>
          <div className="card reveal">
            <h2 className="card__title">到店预约</h2>
            <p className="card__desc">{detail.note}</p>
            {reserveTicket ? (
              <div className="alert alert--success" role="status" style={{ marginTop: 'var(--gh-space-4)' }}>
                预约已提交，工单号 {reserveTicket}；门店将尽快与你联系确认。
              </div>
            ) : null}
            {reserveOpen ? (
              <form onSubmit={submitReserve} noValidate style={{ marginTop: 'var(--gh-space-4)' }}>
                <div className="form-grid-2">
                  <div className="field">
                    <label className="field__label" htmlFor="reserveName">
                      称呼
                    </label>
                    <input
                      className="input"
                      id="reserveName"
                      value={reserve.name}
                      onChange={(event) => setReserve((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="reserveContact">
                      联系方式
                    </label>
                    <input
                      className="input"
                      id="reserveContact"
                      placeholder="手机号 / 邮箱"
                      value={reserve.contact}
                      onChange={(event) => setReserve((prev) => ({ ...prev, contact: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="reserveTime">
                      期望到店时间
                    </label>
                    <input
                      className="input"
                      id="reserveTime"
                      placeholder="如：本周六下午"
                      value={reserve.visitTime}
                      onChange={(event) => setReserve((prev) => ({ ...prev, visitTime: event.target.value }))}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="reserveNote">
                      备注
                    </label>
                    <input
                      className="input"
                      id="reserveNote"
                      placeholder="想体验的型号 / 需求"
                      value={reserve.note}
                      onChange={(event) => setReserve((prev) => ({ ...prev, note: event.target.value }))}
                    />
                  </div>
                </div>
                {reserveErr && (
                  <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-3)' }}>
                    {reserveErr}
                  </span>
                )}
                <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
                  <button className={`btn btn--primary${sending ? ' btn--loading' : ''}`} type="submit" disabled={sending}>
                    提交预约
                  </button>
                  <button className="btn btn--ghost" type="button" onClick={() => setReserveOpen(false)}>
                    取消
                  </button>
                </div>
              </form>
            ) : (
              <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
                <button className="btn btn--primary" type="button" onClick={() => setReserveOpen(true)}>
                  预约到店
                </button>
                <a className="btn btn--secondary" href={`tel:${detail.phone.replace(/[^0-9]/g, '')}`}>
                  拨打 {detail.phone}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 在售产品 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">在售产品</h2>
            <p className="section__desc">门店现货型号以现场库存为准，可先电话确认。</p>
          </div>
          <Link className="btn btn--ghost" to="/products">
            浏览全部产品 →
          </Link>
        </div>
        <div className="row" style={{ gap: 'var(--gh-space-3)' }}>
          {detail.products.map((product) => (
            <span className="tag" key={product}>
              {product}
            </span>
          ))}
        </div>
      </div>

      {/* 服务项目 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">服务项目</h2>
            <p className="section__desc">门店可提供的体验与售后支持。</p>
          </div>
        </div>
        <div className="card reveal">
          <ul className="feature-list" style={{ marginTop: 0 }}>
            {detail.services.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
          <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
            服务项目与营业安排以官方最终公布为准；如需寄修受理，请先在服务支持页查询保修状态。
          </p>
        </div>
      </div>

      <TemplateBlocks pageKey="template-venue" />
    </div>
  )
}