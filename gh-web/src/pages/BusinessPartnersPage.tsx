/**
 * 商业合作 · 合作伙伴 / 代理商申请页。
 * ============================================================
 * 与品牌资料下载融合在同一页：
 * - 合作政策（合同登记 / 授权产品线 / 结算返利）尚未定稿 → 明确标注「筹备中」，不编造条款；
 * - 申请是**申请**而非查询：填写公司与合作意向后进入统一工单系统（后台「咨询工单」）；
 * - 隐私：申请人联系方式仅用于对接，不对外公开；页面上只展示已授权体验点的体验点电话入口；
 * - 品牌资料由独立集合 `brand-assets` 驱动（与下载中心分开），需授权的资料引导回本页申请表单。
 */
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandAssetListBlock } from '../blocks/BrandAssetListBlock'
import { useInquirySubmit } from '../blocks/useInquirySubmit'
import { CaptchaField, HoneypotField } from '../components/ui/CaptchaField'
import { PROVINCES, citiesOfProvince } from '../data/regions'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

const COOP_TYPES = ['区域代理', '授权体验点', '渠道分销', '项目 / 联名合作', '其他'] as const

const POLICY_CARDS = [
  {
    title: '合同登记政策',
    desc: '授权主体、合同期限与登记流程仍在制定中；定稿前不开放签约承诺，提交申请后由商务团队单独沟通。',
  },
  {
    title: '授权产品线',
    desc: '可授权型号与区域范围尚未最终确认，页面暂不展示具体产品线，避免与实际授权不一致。',
  },
  {
    title: '结算与返利规则',
    desc: '价格体系、结算周期与返利档位待财务与渠道共同确认；确认后将在本页更新并同步已提交的申请方。',
  },
]

export function BusinessPartnersPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  usePageEffects(rootRef, 'ready')
  useHomeEffects(rootRef, 'ready')

  const [company, setCompany] = useState('')
  const [contactName, setContactName] = useState('')
  const [contact, setContact] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [coopType, setCoopType] = useState<string>(COOP_TYPES[0])
  const [channel, setChannel] = useState('')
  const [intent, setIntent] = useState('')

  const {
    status,
    result,
    errorMsg,
    errors,
    captchaCode,
    captchaNonce,
    setCaptchaCode,
    setCaptchaToken,
    submitForm,
    resetSubmit,
    clearError,
  } = useInquirySubmit(true)

  const cityOptions = citiesOfProvince(province)
  const submitting = status === 'submitting'

  /** 提交：把结构化字段拼进 message，落库后后台「咨询工单」可直接处理 */
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    const region = [province, city].filter(Boolean).join(' · ') || '未填写'
    const message = [
      `公司 / 机构：${company.trim() || '未填写'}`,
      `所在地区：${region}`,
      `合作类型：${coopType}`,
      `现有渠道 / 门店：${channel.trim() || '未填写'}`,
      '合作意向：',
      intent.trim() || '未填写',
    ].join('\n')
    void submitForm(event, {
      name: contactName.trim() || company.trim(),
      contact: contact.trim(),
      model: `${region} · ${coopType}`,
      topic: '合作伙伴 / 代理商申请',
      message,
      inquiryType: 'business',
    })
  }

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <div className="section__head partners-hero">
          <div>
            <span className="tag tag--accent">合作伙伴 / 代理商</span>
            <h1 className="section__title" style={{ marginTop: 'var(--gh-space-3)' }}>
              申请成为合作伙伴
            </h1>
            <p className="section__desc">
              面向区域代理、授权体验点与渠道伙伴。当前合作政策仍在筹备中，提交申请后由商务团队单独沟通，
              不会在页面上承诺未定稿的条款。
            </p>
          </div>
          <div className="row">
            <a className="btn btn--primary is-magnetic" href="#apply">
              提交合作申请
            </a>
            <Link className="btn btn--secondary" to="/business/venues">
              查看授权体验点
            </Link>
          </div>
        </div>

        <section className="partners-section" aria-label="合作政策状态">
          <div className="partners-section__head">
            <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
              合作政策
            </h2>
            <p className="section__desc">以下三项尚未定稿，统一标注「筹备中」，避免与合作实际不一致。</p>
          </div>
          <div className="grid-3">
            {POLICY_CARDS.map((card) => (
              <div className="card partners-policy" key={card.title}>
                <span className="tag">筹备中</span>
                <h3 className="card__title" style={{ marginTop: 'var(--gh-space-3)' }}>
                  {card.title}
                </h3>
                <p className="card__desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="partners-section" id="brand-assets" aria-label="品牌资料">
          <BrandAssetListBlock
            props={{
              title: '品牌资料',
              subtitle: '面向渠道、媒体与合作方的品牌规范、Logo、产品图与送测物料；需授权的资料在本页提交申请后提供。',
              category: 'all',
              limit: 0,
              leadHref: '#apply',
            }}
          />
        </section>

        <section className="partners-section partners-apply" id="apply" aria-label="合作申请">
          <div className="partners-apply__intro">
            <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
              提交合作申请
            </h2>
            <p className="section__desc">
              填写公司与合作意向后进入统一工单系统（后台「咨询工单」），由商务团队对接。申请不等于授权，
              具体合作以双方确认的书面文件为准。
            </p>
            <ul className="partners-apply__points">
              <li>政策与产品线定稿前，仅登记意向，不承诺授权范围。</li>
              <li>申请人联系方式仅用于本次对接，不会公开展示。</li>
              <li>如需体验点电话，请前往「授权体验点」查看已公开的体验点信息。</li>
            </ul>
            <Link className="btn btn--ghost btn--sm" to="/business/venues">
              查看体验点电话
            </Link>
          </div>

          <div className="partners-apply__form">
            {status === 'success' && result ? (
              <div className="card partners-success" role="status">
                <span className="tag tag--accent">已提交</span>
                <h3 className="card__title" style={{ marginTop: 'var(--gh-space-3)' }}>
                  申请已进入工单系统
                </h3>
                <p className="card__desc">
                  工单号 <strong className="mono">{result.ticketId}</strong>
                  ，商务团队会通过你留下的方式联系。政策定稿前不会承诺授权范围。
                </p>
                <button type="button" className="btn btn--secondary btn--sm" onClick={resetSubmit}>
                  再提交一份
                </button>
              </div>
            ) : (
              <form className="partners-form" onSubmit={onSubmit} noValidate>
                <HoneypotField />
                <div className="partners-form__grid">
                  <div className="field">
                    <label className="field__label" htmlFor="partner-company">
                      公司 / 机构名称<span className="req">*</span>
                    </label>
                    <input
                      id="partner-company"
                      className="input"
                      value={company}
                      required
                      placeholder="营业执照上的名称"
                      onChange={(event) => setCompany(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="partner-name">
                      联系人<span className="req">*</span>
                    </label>
                    <input
                      id="partner-name"
                      className="input"
                      value={contactName}
                      required
                      onChange={(event) => setContactName(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="partner-contact">
                      联系方式<span className="req">*</span>
                    </label>
                    <input
                      id="partner-contact"
                      className="input"
                      value={contact}
                      required
                      placeholder="手机号或邮箱"
                      aria-invalid={Boolean(errors.contact) || undefined}
                      onChange={(event) => {
                        setContact(event.target.value)
                        clearError('contact')
                      }}
                    />
                    {errors.contact && <span className="field__error">{errors.contact}</span>}
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="partner-type">
                      合作类型<span className="req">*</span>
                    </label>
                    <select
                      id="partner-type"
                      className="input"
                      value={coopType}
                      onChange={(event) => setCoopType(event.target.value)}
                    >
                      {COOP_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="partner-province">
                      所在省份
                    </label>
                    <select
                      id="partner-province"
                      className="input"
                      value={province}
                      onChange={(event) => {
                        setProvince(event.target.value)
                        setCity('')
                      }}
                    >
                      <option value="">请选择省份</option>
                      {PROVINCES.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="partner-city">
                      所在城市
                    </label>
                    <select
                      id="partner-city"
                      className="input"
                      value={city}
                      disabled={!province}
                      onChange={(event) => setCity(event.target.value)}
                    >
                      <option value="">{province ? '请选择城市' : '请先选择省份'}</option>
                      {cityOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field partners-form__full">
                    <label className="field__label" htmlFor="partner-channel">
                      现有渠道 / 门店
                    </label>
                    <input
                      id="partner-channel"
                      className="input"
                      value={channel}
                      placeholder="如：现有 3 家门店 / 覆盖 2 个城市 / 电商渠道"
                      onChange={(event) => setChannel(event.target.value)}
                    />
                  </div>
                  <div className="field partners-form__full">
                    <label className="field__label" htmlFor="partner-intent">
                      合作意向说明<span className="req">*</span>
                    </label>
                    <textarea
                      id="partner-intent"
                      className="textarea"
                      rows={4}
                      value={intent}
                      required
                      placeholder="希望合作的区域、渠道类型、目标产品线与计划；政策未定稿前仅作意向登记。"
                      aria-invalid={Boolean(errors.message) || undefined}
                      onChange={(event) => {
                        setIntent(event.target.value)
                        clearError('message')
                      }}
                    />
                    {errors.message && <span className="field__error">{errors.message}</span>}
                  </div>
                </div>

                <CaptchaField
                  key={captchaNonce}
                  inputId="partnerCaptcha"
                  code={captchaCode}
                  onCodeChange={(value) => {
                    setCaptchaCode(value)
                    clearError('captcha')
                  }}
                  onTokenChange={setCaptchaToken}
                  error={errors.captcha}
                  disabled={submitting}
                />

                {status === 'error' && errorMsg && (
                  <div className="alert alert--danger" role="alert" style={{ marginTop: 'var(--gh-space-3)' }}>
                    {errorMsg}
                  </div>
                )}

                <p className="partners-form__privacy">
                  提交即表示同意我们仅为本次合作对接使用你填写的联系方式；申请人联系方式不会公开展示。
                </p>

                <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
                  <button className={`btn btn--primary${submitting ? ' btn--loading' : ''}`} type="submit" disabled={submitting}>
                    {submitting ? '提交中…' : '提交合作申请'}
                  </button>
                  <Link className="btn btn--ghost" to="/business">
                    返回商业合作
                  </Link>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
