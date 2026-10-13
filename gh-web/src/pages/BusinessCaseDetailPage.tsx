import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { fetchBizCase, fetchBizCases } from '../api/business-extra'
import { MEDIA } from '../data/media'
import { MediaImg } from '../components/ui/MediaImg'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 合作案例详情加载骨架 */
function CaseDetailSkeleton() {
  return (
    <div className="container" aria-busy="true" aria-label="合作案例加载中" style={{ paddingTop: 'var(--gh-space-6)' }}>
      <div className="skeleton" style={{ height: 14, width: '30%' }} />
      <div className="skeleton" style={{ height: 34, width: '60%', marginTop: 'var(--gh-space-4)' }} />
      <div className="skeleton" style={{ height: 16, width: '40%', marginTop: 'var(--gh-space-3)' }} />
      <div className="skeleton" style={{ aspectRatio: '16 / 9', borderRadius: 'var(--gh-radius-lg)', marginTop: 'var(--gh-space-5)' }} />
    </div>
  )
}

/** 商业合作 · 合作案例详情：背景、方案、成果与图集，并推荐其他案例 */
export function BusinessCaseDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data: detail, loading, error } = useApi((signal) => fetchBizCase(id, signal), [id, reloadKey])
  const { data: list } = useApi((signal) => fetchBizCases(signal), [reloadKey])

  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  if (loading) return <CaseDetailSkeleton />

  if (!detail) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/business">商业合作</Link>
          <span>/</span>
          <Link to="/business/cases">合作案例</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">未找到该案例</div>
          <p className="empty__desc">{error?.message ?? '案例可能尚未公开或链接有误'}，返回案例列表重新选择。</p>
          <div style={{ display: 'flex', gap: 'var(--gh-space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/business/cases">
              返回案例列表
            </Link>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        </div>
      </div>
    )
  }

  const allCases = list?.items ?? []
  const related = allCases
    .map((item, index) => ({ item, cover: MEDIA.businessCase[index % MEDIA.businessCase.length] }))
    .filter((entry) => entry.item.id !== detail.id)
    .slice(0, 3)

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/business">商业合作</Link>
          <span>/</span>
          <Link to="/business/cases">合作案例</Link>
          <span>/</span>
          <span>{detail.title}</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)' }}>
          <div>
            <h1 className="section__title">{detail.title}</h1>
            <p className="section__desc">{detail.summary}</p>
            <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
              <span className="tag tag--pill">{detail.category}</span>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                合作方：{detail.partner}
              </span>
              <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                年份：{detail.year}
              </span>
            </div>
          </div>
          <Link className="btn btn--secondary" to="/business/cases">
            返回案例列表
          </Link>
        </div>

        <div className="ph-box ph-box--media" style={{ aspectRatio: '16 / 9' }}>
          <MediaImg src={detail.cover} alt={detail.title} />
        </div>
      </div>

      {/* 项目背景 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">项目背景</h2>
          </div>
        </div>
        <div className="card reveal">
          <p className="card__desc" style={{ fontSize: 'var(--gh-font-size-body)' }}>
            {detail.background}
          </p>
        </div>
      </div>

      {/* 落地方案 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">落地方案</h2>
            <p className="section__desc">按执行顺序列出，覆盖配置、校准与后续跟进。</p>
          </div>
        </div>
        <div className="steps reveal">
          {detail.solution.map((step, index) => (
            <div className={`step${index === 0 ? ' step--current' : ''}`} key={step}>
              <span className="step__dot">{index + 1}</span>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* 合作成果 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">合作成果</h2>
            <p className="section__desc">关键数据来自合作双方共同确认；口径与统计范围以最终公布为准。</p>
          </div>
        </div>
        <div className="grid-3">
          {detail.results.map((item) => (
            <div className="card" key={item.label}>
              <div className="stat__value">{item.value}</div>
              <div className="stat__label" style={{ marginTop: 'var(--gh-space-2)' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 现场图集 */}
      <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">现场图集</h2>
            <p className="section__desc">合作方授权素材；正式图集由运营在上线前替换。</p>
          </div>
        </div>
        <div className="grid-3">
          {detail.gallery.map((image, index) => (
            <div className="ph-box ph-box--media" style={{ aspectRatio: '16 / 9' }} key={image}>
              <MediaImg src={image} alt={`${detail.title} 现场图 ${index + 1}`} />
            </div>
          ))}
        </div>
      </div>

      {/* 相关案例 */}
      {related.length > 0 && (
        <div className="container" style={{ paddingBottom: 'var(--gh-space-8)' }}>
          <div className="section__head">
            <div>
              <h2 className="section__title">相关案例</h2>
              <p className="section__desc">同一合作方向的其他案例。</p>
            </div>
            <Link className="btn btn--ghost" to="/business/cases">
              查看全部案例 →
            </Link>
          </div>
          <div className="grid-3">
            {related.map(({ item, cover }) => (
              <Link className="card card--link" to={`/business/cases/${item.id}`} key={item.id}>
                <div className="ph-box ph-box--media" style={{ aspectRatio: '16 / 9' }}>
                  <MediaImg src={cover} alt={item.title} />
                </div>
                <span className="tag tag--pill">{item.category}</span>
                <h3 className="card__title">{item.title}</h3>
                <p className="card__desc">{item.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div
          className="card reveal"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gh-space-5)', flexWrap: 'wrap' }}
        >
          <div>
            <h3 className="card__title" style={{ marginBottom: 'var(--gh-space-1)' }}>
              想开展类似合作？
            </h3>
            <p className="card__desc">说明你的合作方向、场地或人群规模，我们会给出针对性方案。</p>
          </div>
          <Link className="btn btn--primary" to="/business#apply">
            提交合作申请
          </Link>
        </div>
      </div>
      <TemplateBlocks pageKey="template-case" />
    </div>
  )
}