import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchLegalDoc } from '../api/legal'
import { ApiError } from '../api/client'
import { useApi } from '../hooks/useApi'

/** 法律与合规页（AC-20③）：/legal/privacy | terms | cookies | records，内容为信息结构骨架 */
export function LegalPage() {
  const { slug = '' } = useParams()
  const [reloadKey, setReloadKey] = useState(0)
  const { data: doc, loading, error } = useApi((signal) => fetchLegalDoc(slug, signal), [slug, reloadKey])

  // 未命中（404）沿用原有的友好「未找到」页，不降级为通用错误块
  if (error instanceof ApiError && error.status === 404) {
    return (
      <div className="container section">
        <div className="empty">
          <div className="empty__title">未找到该法律文件</div>
          <p className="empty__desc">链接可能已失效，请从页脚重新选择需要查看的文件。</p>
          <Link className="btn btn--secondary btn--sm" to="/">
            返回首页
          </Link>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <div className="empty">
          <div className="empty__title">文档加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      </div>
    )
  }

  if (loading || !doc) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }} aria-busy="true" aria-label="文档加载中">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)', marginTop: 'var(--gh-space-4)' }}>
          <div className="skeleton" style={{ height: 14, width: '24%' }} />
          <div className="skeleton" style={{ height: 32, width: '46%' }} />
          <div className="skeleton" style={{ height: 16, width: '80%' }} />
        </div>
        <div className="card" style={{ marginTop: 'var(--gh-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-4)' }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-2)' }}>
              <div className="skeleton" style={{ height: 20, width: '40%' }} />
              <div className="skeleton" style={{ height: 14, width: '100%' }} />
              <div className="skeleton" style={{ height: 14, width: '72%' }} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
      <nav className="breadcrumb" aria-label="面包屑">
        <Link to="/">首页</Link>
        <span>/</span>
        <span>{doc.title}</span>
      </nav>

      <div className="section__head" style={{ marginTop: 'var(--gh-space-4)' }}>
        <div>
          <p className="muted" style={{ fontSize: 'var(--gh-font-size-caption)', letterSpacing: '.08em', margin: 0 }}>
            {doc.eyebrow}
          </p>
          <h1 className="section__title">{doc.title}</h1>
          <p className="section__desc">{doc.intro}</p>
        </div>
      </div>

      <p className="field__hint" style={{ marginBottom: 'var(--gh-space-4)' }}>
        最近更新：{doc.updated}
      </p>

      <div className="card">
        <ol style={{ margin: 0, paddingLeft: 'var(--gh-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-5)' }}>
          {doc.sections.map((section) => (
            <li key={section.heading}>
              <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-2)' }}>
                {section.heading}
              </h2>
              <p className="card__desc" style={{ margin: 0 }}>
                {section.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <p className="field__hint" style={{ marginTop: 'var(--gh-space-5)' }}>
        本页为法律文件的路由与信息结构骨架，正式文本与生效日期以法务确认版本为准。
      </p>
    </div>
  )
}