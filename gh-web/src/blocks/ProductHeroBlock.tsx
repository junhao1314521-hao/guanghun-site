/**
 * 产品详情 · 展示台区块（productHero）。
 *
 * 详情页「主体区块化」的首块：大图展台 + 型号/品类标题 + 角标/状态 + 参考价 +
 * 主次按钮（文案与链接可在后台配置，作用于所有产品）+ 标称/实测参数摘要。
 *
 * 数据来自 `ProductDetailContext`（当前产品）；装修配置来自区块 props（模板级，统一生效）。
 * 复用详情页既有类名（.detail-top / .stage / .summary 等），保证与旧版视觉一致。
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MEDIA } from '../data/media'
import { PRODUCTS } from '../data/products'
import { MediaImg } from '../components/ui/MediaImg'
import { useProductDetail } from './ProductDetailContext'
import { asBool, asString } from './blockUtils'

const VIEW_COUNT = 4

export function ProductHeroBlock({ props }: { props: Record<string, unknown> }) {
  const detail = useProductDetail()
  const [thumb, setThumb] = useState(0)

  if (!detail) return null

  const variant = PRODUCTS.find((item) => item.id === detail.id)?.variant ?? 'mouse'
  const views = MEDIA.views[variant] ?? MEDIA.views.mouse

  const showBadges = props.showBadges === undefined ? true : asBool(props.showBadges)
  const showPrice = props.showPrice === undefined ? true : asBool(props.showPrice)
  const showSummary = props.showSummary === undefined ? true : asBool(props.showSummary)

  const primaryLabel = asString(props.primaryLabel, '加入对比')
  const primaryHref = asString(props.primaryHref, '/compare')
  const secondaryLabel = asString(props.secondaryLabel, '咨询咨询师')
  const secondaryHref = asString(props.secondaryHref, '/support#contact')

  return (
    <div className="detail-top">
      {/* 展台（大图 + 多视角缩略图） */}
      <div>
        <div className="stage detail-media media-ph">
          <div className="stage__glow" />
          <div
            className="stage__content"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}
          >
            <MediaImg
              className="detail-img"
              src={views[thumb]}
              alt={`${detail.model} ${detail.name}`}
              variant={variant}
              label={`${detail.model} 产品图`}
              loading="eager"
            />
          </div>
        </div>
        <div className="detail-thumbs">
          {Array.from({ length: VIEW_COUNT }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`thumb${index === thumb ? ' is-active' : ''}`}
              aria-label={`视图 ${index + 1}`}
              aria-pressed={index === thumb}
              onClick={() => setThumb(index)}
            >
              <MediaImg src={views[index]} alt="" variant={variant} />
            </button>
          ))}
        </div>
      </div>

      {/* 产品信息 */}
      <div className="detail-info">
        <h1 className="detail-info__title">
          <span className="detail-info__model">{detail.model}</span>{' '}
          <span className="detail-info__name">{detail.name}</span>
        </h1>

        {showBadges && (
          <div className="row" style={{ marginBottom: 'var(--gh-space-4)' }}>
            {detail.badges.map((badge) => (
              <span className="tag tag--accent" key={badge}>
                {badge}
              </span>
            ))}
            <span className={`status status--${detail.status.level}`}>{detail.status.text}</span>
          </div>
        )}

        {showPrice && (
          <div className="detail-price">
            {detail.price}{' '}
            <small
              style={{
                fontFamily: 'var(--gh-font-sans)',
                fontSize: 'var(--gh-font-size-body-sm)',
                color: 'var(--color-text-tertiary)',
                fontWeight: 'var(--gh-weight-regular)',
              }}
            >
              参考价
            </small>
          </div>
        )}

        <div className="detail-buy">
          {primaryLabel &&
            (primaryHref.startsWith('/') ? (
              <Link className="btn btn--primary btn--lg" to={primaryHref}>
                {primaryLabel}
              </Link>
            ) : (
              <a className="btn btn--primary btn--lg" href={primaryHref}>
                {primaryLabel}
              </a>
            ))}
          {secondaryLabel &&
            (secondaryHref.startsWith('/') ? (
              <Link className="btn btn--secondary btn--lg" to={secondaryHref}>
                {secondaryLabel}
              </Link>
            ) : (
              <a className="btn btn--secondary btn--lg" href={secondaryHref}>
                {secondaryLabel}
              </a>
            ))}
        </div>

        {showSummary && (
          <>
            <dl className="summary">
              {detail.summary.map((group) => (
                <div key={group.title}>
                  <div className="summary__group-title">{group.title}</div>
                  {group.rows.map((row) => (
                    <div className="summary__row" key={row.label}>
                      <dt>{row.label}</dt>
                      <dd className={row.missing ? 'missing' : undefined}>{row.value}</dd>
                    </div>
                  ))}
                </div>
              ))}
            </dl>
            <p
              className="field__hint"
              style={{
                marginTop: 'var(--gh-space-3)',
                fontSize: 'var(--gh-font-size-caption)',
                color: 'var(--color-text-tertiary)',
              }}
            >
              缺失与零值含义不同：「未测量」表示尚未完成该测试，不代表零值表现。
            </p>
          </>
        )}
      </div>
    </div>
  )
}
