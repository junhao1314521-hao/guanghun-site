/**
 * 体验点详情内容（统一组件）。
 *
 * 同一套内容既用于详情页（variant='page'，保持既有版式），
 * 也用于列表页的统一弹窗（variant='dialog'，单列紧凑排版）。
 * 抽取自 BusinessVenueDetailPage：门市信息 / 到店预约 / 在售产品 / 服务项目。
 */
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { submitReservation } from '../../api/support-extra'
import { trackEvent } from '../../lib/track'
import type { VenueDetail } from '../../data/business-extra'

type Props = {
  detail: VenueDetail
  /** page 保持详情页版式；dialog 单列紧凑（去掉大留白） */
  variant: 'page' | 'dialog'
}

export function VenueDetailContent({ detail, variant }: Props) {
  const isDialog = variant === 'dialog'
  const uid = useId()

  // 到店预约：独立实体，真实提交至 reservations 集合（不再挤进咨询工单正文）
  const [reserveOpen, setReserveOpen] = useState(false)
  const [reserve, setReserve] = useState({ name: '', contact: '', visitTime: '', people: '1', note: '' })
  const [reserveErr, setReserveErr] = useState<string | null>(null)
  const [reserveId, setReserveId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const fieldId = (name: string) => `${uid}-${name}`

  const submitReserve = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setReserveErr(null)
    if (!reserve.name.trim() || !reserve.contact.trim()) {
      setReserveErr('请填写称呼与联系方式')
      return
    }
    setSending(true)
    try {
      const res = await submitReservation({
        venueId: detail.id,
        venueName: detail.name,
        name: reserve.name.trim(),
        contact: reserve.contact.trim(),
        visitTime: reserve.visitTime.trim(),
        people: Math.max(1, Number(reserve.people) || 1),
        note: reserve.note.trim(),
      })
      setReserveId(res.reservationId)
      // 埋点：预约提交成功
      trackEvent('reserve', detail.id)
      setReserve({ name: '', contact: '', visitTime: '', people: '1', note: '' })
    } catch (ex) {
      setReserveErr(ex instanceof Error ? ex.message : '提交失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={`venue-detail venue-detail--${variant}`}>
      {/* 门市信息 + 到店预约 */}
      <div className={isDialog ? 'venue-detail__pair venue-detail__pair--stack' : 'venue-detail__pair grid-2'}>
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
          {reserveId ? (
            <div className="alert alert--success" role="status" style={{ marginTop: 'var(--gh-space-4)' }}>
              预约已提交，预约号 {reserveId}；门店将尽快与你联系确认。
            </div>
          ) : null}
          {reserveOpen ? (
            <form onSubmit={submitReserve} noValidate style={{ marginTop: 'var(--gh-space-4)' }}>
              <div className="form-grid-2">
                <div className="field">
                  <label className="field__label" htmlFor={fieldId('name')}>
                    称呼
                  </label>
                  <input
                    className="input"
                    id={fieldId('name')}
                    value={reserve.name}
                    onChange={(event) => setReserve((prev) => ({ ...prev, name: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={fieldId('contact')}>
                    联系方式
                  </label>
                  <input
                    className="input"
                    id={fieldId('contact')}
                    placeholder="手机号 / 邮箱"
                    value={reserve.contact}
                    onChange={(event) => setReserve((prev) => ({ ...prev, contact: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={fieldId('time')}>
                    期望到店时间
                  </label>
                  <input
                    className="input"
                    id={fieldId('time')}
                    placeholder="如：本周六下午"
                    value={reserve.visitTime}
                    onChange={(event) => setReserve((prev) => ({ ...prev, visitTime: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={fieldId('people')}>
                    到店人数
                  </label>
                  <input
                    className="input"
                    id={fieldId('people')}
                    type="number"
                    min={1}
                    step={1}
                    value={reserve.people}
                    onChange={(event) => setReserve((prev) => ({ ...prev, people: event.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor={fieldId('note')}>
                    备注
                  </label>
                  <input
                    className="input"
                    id={fieldId('note')}
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

      {/* 在售产品 */}
      <section className="venue-detail__section">
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
      </section>

      {/* 服务项目 */}
      <section className="venue-detail__section">
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
      </section>
    </div>
  )
}
