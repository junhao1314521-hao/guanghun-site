import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { ApiError } from '../api/client'
import { fetchFaq } from '../api/support-extra'
import { JsonLdNode } from '../components/site/JsonLd'
import { faqJsonLd } from '../components/site/detailJsonLd'
import { useApi } from '../hooks/useApi'
import { useDetailSeo } from '../hooks/useDetailSeo'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 问答详情（深度线 · 详情）：完整答案、分步说明与相关问答 */
export function FaqDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data: detail, loading, error } = useApi((signal) => fetchFaq(id, signal), [id, reloadKey])
  const notFound = error instanceof ApiError && error.status === 404

  // 数据到位后内容才渲染，用 readyKey 触发一次动效重绑
  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  // SEO 覆盖：以问答内容作为标题 / 摘要
  useDetailSeo({
    title: detail ? `${detail.q} · 光魂` : undefined,
    description: detail?.a,
    ogType: 'article',
  })

  if (loading) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }} aria-busy="true" aria-label="问答详情加载中">
        <div className="skeleton" style={{ height: 14, width: 220, marginBottom: 'var(--gh-space-5)' }} />
        <div className="skeleton" style={{ height: 28, width: '65%' }} />
        <div className="skeleton" style={{ height: 100, marginTop: 'var(--gh-space-5)' }} />
        <div className="skeleton" style={{ height: 120, marginTop: 'var(--gh-space-5)' }} />
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <Link to="/faq">常见问题</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">{notFound ? '未找到该问答' : '问答加载失败'}</div>
          <p className="empty__desc">
            {notFound ? '该问答可能已下线或链接有误，返回常见问题重新选择。' : `${error?.message ?? '请求失败'}，请检查网络后重试。`}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/faq">
              返回常见问题
            </Link>
            {!notFound && (
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                重新加载
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef}>
      <JsonLdNode node={faqJsonLd(detail)} />
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <Link to="/faq">常见问题</Link>
          <span>/</span>
          <span>{detail.category}</span>
        </nav>

        <div style={{ marginTop: 'var(--gh-space-5)' }}>
          <span className="tag tag--accent">{detail.category}</span>
          <h1 className="section__title" style={{ marginTop: 'var(--gh-space-3)' }}>
            {detail.q}
          </h1>
        </div>

        <div className="card reveal" style={{ marginTop: 'var(--gh-space-5)' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 'var(--gh-line-height-body)' }}>
            {detail.a}
          </p>
        </div>
      </div>

      {detail.steps && detail.steps.length > 0 && (
        <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
          <h2 className="section__title" style={{ marginBottom: 'var(--gh-space-4)' }}>
            操作步骤
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 'var(--gh-space-5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--gh-space-2)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--gh-font-size-body-sm)',
              lineHeight: 'var(--gh-line-height-body)',
            }}
          >
            {detail.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* 「相关问答」只保留后台区块那一份（template-faq），页面内不再写死（§4.21 统一规则） */}

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div
          className="card reveal"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gh-space-5)', flexWrap: 'wrap' }}
        >
          <div>
            <h3 className="card__title" style={{ marginBottom: 'var(--gh-space-1)' }}>
              问题仍未解决？
            </h3>
            <p className="card__desc">附上型号与现象提交咨询，由咨询师进一步跟进。</p>
          </div>
          <div className="row">
            <Link className="btn btn--primary" to="/inquiry">
              提交咨询
            </Link>
            <Link className="btn btn--secondary" to="/faq">
              返回常见问题
            </Link>
          </div>
        </div>
      </div>
      <TemplateBlocks pageKey="template-faq" />
    </div>
  )
}