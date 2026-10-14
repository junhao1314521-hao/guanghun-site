import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { MODEL_SUPPORTS } from '../data/support-extra'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 型号支持（深度线 · 索引）：列出全部已收录型号，点入 `/support/model/:id`
 * 查看该型号的可下载资料、使用指南与相关问答。
 * 数据来自前端镜像层 MODEL_SUPPORTS（与后端集合同源，字段一致）。
 */
export function ModelSupportIndexPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  usePageEffects(rootRef, 'ready')
  useHomeEffects(rootRef, 'ready')

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <span>型号支持</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <h1 className="section__title">型号支持</h1>
            <p className="section__desc">选择型号，查看对应的说明书、固件、校色配置、使用指南与常见问题。</p>
          </div>
          <Link className="btn btn--secondary" to="/downloads">
            下载中心
          </Link>
        </div>

        <div className="grid-3">
          {MODEL_SUPPORTS.map((item) => (
            <Link className="card card--link reveal" key={item.id} to={`/support/model/${item.id}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="tag tag--accent">{item.line}</span>
              </div>
              <h3 className="card__title" style={{ marginTop: 'var(--gh-space-3)' }}>
                {item.model}
              </h3>
              <p className="card__desc">{item.summary}</p>
              <span className="card--link__foot">查看支持资料 →</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
