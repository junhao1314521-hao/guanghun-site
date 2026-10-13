import { Link } from 'react-router-dom'
import type { FeaturedProduct, Scene, Spot } from '../../api/home'
import { MEDIA } from '../../data/media'
import { DemoToast, useDemoToast } from '../ui/DemoToast'
import { MediaImg } from '../ui/MediaImg'
import { HScroll } from './HScroll'
import { SectionHead } from './SectionHead'

/** 按场景选择：一排 2 张宽版卡；指针靠近右侧向右推进、靠近左侧向左回退 */
export function SceneRail({ scenes }: { scenes: Scene[] }) {
  return (
    <div className="container section">
      <SectionHead title="按场景选择" desc="不同场景对装备的诉求不同，我们也按场景组织产品线。" />
      <HScroll duo auto railName="scene">
        {scenes.map((scene) => (
          <article className="vcard reveal" key={scene.id}>
            <div className="vcard__media" style={{ background: scene.background }}>
              <MediaImg src={MEDIA.scene[scene.id]} alt={`${scene.tag}场景`} variant={scene.art} label={`${scene.tag}场景`} />
            </div>
            <div className="vcard__top">
              <span className={`tag${scene.accentTag ? ' tag--accent' : ''} tag--pill`}>{scene.tag}</span>
            </div>
            <div className="vcard__scrim" />
            <div className="vcard__body">
              <div className="vcard__label">{scene.label}</div>
              <h3 className="vcard__title">{scene.title}</h3>
              <div className="vcard__specs">
                <span>{scene.desc}</span>
              </div>
            </div>
          </article>
        ))}
      </HScroll>
    </div>
  )
}

/** 重点产品：3D 倾斜 + 聚光跟随 */
export function FeaturedRail({ products }: { products: FeaturedProduct[] }) {
  const { action, notify, dismiss } = useDemoToast()
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <SectionHead
        title="重点产品"
        desc="本期主推的四款装备。"
        action={
          <Link className="btn btn--ghost" to="/products">
            查看全部 →
          </Link>
        }
      />
      <HScroll railName="featured">
        {products.map((product) => (
          <article className="vcard reveal" key={product.id}>
            <div className="vcard__media" style={{ background: product.background }}>
              <MediaImg src={MEDIA.product[product.id]} alt={product.name} variant={product.art} label={product.name} />
            </div>
            {product.tag && (
              <div className="vcard__top">
                <span className="tag tag--accent">{product.tag}</span>
              </div>
            )}
            <div className="vcard__scrim" />
            <div className="vcard__body">
              <div className="vcard__label">{product.model}</div>
              <h3 className="vcard__title">{product.name}</h3>
              <div className="vcard__specs">
                {product.specs.map((spec) => (
                  <span key={spec}>{spec}</span>
                ))}
              </div>
              <div className="vcard__foot">
                <span className="vcard__price">
                  {product.price}{' '}
                  <small
                    style={{
                      fontFamily: 'var(--gh-font-sans)',
                      fontSize: 'var(--gh-font-size-caption)',
                      color: 'rgba(255,255,255,.6)',
                      fontWeight: 'var(--gh-weight-regular)',
                    }}
                  >
                    起
                  </small>
                </span>
                <button className="btn btn--sm" type="button" onClick={() => notify(`对比 ${product.model}`)}>
                  对比
                </button>
              </div>
            </div>
          </article>
        ))}
      </HScroll>
      <DemoToast action={action} onDismiss={dismiss} />
    </div>
  )
}

/** 商业合作 · 体验点（V1 不接入地图 API，只提供列表与详情） */
export function CoopSection({ coopTags, spots }: { coopTags: string[]; spots: Spot[] }) {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card reveal">
          <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
            商业合作
          </h2>
          <p className="card__desc" style={{ marginTop: 'var(--gh-space-2)' }}>
            面向赛事、内容共创与渠道分销的合作方向；案例与体验点以官方最终公布为准。
          </p>
          <div className="row" style={{ gap: 'var(--gh-space-2)', marginTop: 'var(--gh-space-4)' }}>
            {coopTags.map((tag) => (
              <span className="tag tag--pill" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--gh-space-5)' }}>
            <Link className="btn btn--secondary" to="/business">
              合作咨询
            </Link>
            <Link className="btn btn--ghost" to="/business#cases">
              查看案例 →
            </Link>
          </div>
        </div>

        <div className="card reveal">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)', margin: 0 }}>
              体验点
            </h2>
            <Link className="btn btn--ghost btn--sm" to="/support#stores">
              全部体验点 →
            </Link>
          </div>
          <ul
            style={{
              listStyle: 'none',
              margin: 'var(--gh-space-4) 0 0',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--gh-space-3)',
            }}
          >
            {spots.map((spot) => (
              <li key={spot.name}>
                <Link className="spot-row" to="/support#stores">
                  <span className="spot-row__name">
                    {spot.name}{' '}
                    <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                      {spot.area}
                    </span>
                  </span>
                  <span className={`status ${spot.ok ? 'status--success' : 'status--muted'}`}>{spot.status}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="field__hint" style={{ marginTop: 'var(--gh-space-4)' }}>
            名称与地址以官方最终公布为准。
          </p>
        </div>
      </div>
    </div>
  )
}