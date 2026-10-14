import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { ApiError } from '../api/client'
import { fetchModelSupport } from '../api/support-extra'
import { IconBook, IconChevronDown, IconDownload, IconHelp } from '../components/ui/Icon'
import { DOWNLOAD_TYPE_LABELS } from '../data/support-extra'
import { trackDownload } from '../lib/track'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 型号支持加载骨架 */
function ModelSkeleton() {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }} aria-busy="true" aria-label="型号支持加载中">
      <div className="skeleton" style={{ height: 32, width: '45%' }} />
      <div className="skeleton" style={{ height: 16, width: '70%', marginTop: 'var(--gh-space-3)' }} />
      <div className="skeleton" style={{ height: 200, marginTop: 'var(--gh-space-6)' }} />
      <div className="skeleton" style={{ height: 160, marginTop: 'var(--gh-space-5)' }} />
    </div>
  )
}

/** 型号支持（深度线 · 详情）：按型号聚合可下载资料、相关问答与使用指南 */
export function ModelSupportPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchModelSupport(id, signal), [id, reloadKey])
  const notFound = error instanceof ApiError && error.status === 404

  // 数据到位后内容才渲染，用 readyKey 触发一次动效重绑
  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  if (error || !data) {
    if (loading) return <ModelSkeleton />
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">{notFound ? '未找到该型号的支持资料' : '型号支持加载失败'}</div>
          <p className="empty__desc">
            {notFound
              ? '该型号可能尚未收录或链接有误，返回服务支持查看其他型号。'
              : `${error?.message ?? '请求失败'}，请检查网络后重试。`}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/support">
              返回服务支持
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
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <span>{data.model}</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <div className="row" style={{ marginBottom: 'var(--gh-space-2)' }}>
              <span className="tag tag--accent">{data.line}</span>
            </div>
            <h1 className="section__title">{data.model} 支持中心</h1>
            <p className="section__desc">{data.summary}</p>
          </div>
          <div className="row">
            <Link className="btn btn--primary" to="/inquiry">
              提交咨询
            </Link>
            <Link className="btn btn--secondary" to="/support">
              返回服务支持
            </Link>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">可下载资料</h2>
            <p className="section__desc">该型号的专属资料与通用资料。</p>
          </div>
          <Link className="btn btn--ghost" to="/downloads">
            前往下载中心 →
          </Link>
        </div>
        {data.downloads.length > 0 ? (
          <div className="table-wrap reveal">
            <table className="table">
              <thead>
                <tr>
                  <th>资料名称</th>
                  <th>类型</th>
                  <th>版本</th>
                  <th>大小</th>
                  <th>更新日期</th>
                  <th>
                    <span className="sr-only">操作</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.downloads.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{DOWNLOAD_TYPE_LABELS[item.type]}</td>
                    <td className="mono">{item.version}</td>
                    <td className="mono">{item.size}</td>
                    <td className="mono">{item.date}</td>
                    <td>
                      <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
                        <Link className="btn btn--sm btn--secondary" to={`/downloads/${item.id}`}>
                          查看详情
                        </Link>
                        {(item as { fileUrl?: string }).fileUrl ? (
                          <a
                            className="btn btn--sm btn--ghost"
                            href={(item as { fileUrl?: string }).fileUrl}
                            download
                            rel="noreferrer"
                            onClick={() => trackDownload(item.id)}
                          >
                            下载
                          </a>
                        ) : (
                          <span
                            className="btn btn--sm btn--ghost"
                            role="note"
                            title="该资料尚未上传文件，上线后可用"
                            style={{ opacity: 0.6, cursor: 'not-allowed' }}
                          >
                            下载
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <div className="empty__title">该型号暂无专属资料</div>
            <p className="empty__desc">可前往下载中心查看通用资料（如 Center 软件）。</p>
            <Link className="btn btn--secondary btn--sm" to="/downloads">
              前往下载中心
            </Link>
          </div>
        )}
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">使用指南</h2>
            <p className="section__desc">从上手到排障的常见主题。</p>
          </div>
        </div>
        <div className="grid-3">
          {data.guides.map((guide) => (
            <div className="card" key={guide.title}>
              <span className="svc-ico">
                <IconBook />
              </span>
              <h3 className="card__title">{guide.title}</h3>
              <p className="card__desc">{guide.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div className="section__head">
          <div>
            <h2 className="section__title">相关问答</h2>
            <p className="section__desc">该型号高频问题，展开查看答案。</p>
          </div>
          <Link className="btn btn--ghost" to="/faq">
            查看全部问答 →
          </Link>
        </div>
        {data.faqs.length > 0 ? (
          <div className="qa-list reveal">
            {data.faqs.map((item) => (
              <details key={item.id}>
                <summary>
                  {item.q}
                  <IconChevronDown size={16} />
                </summary>
                <div className="qa-list__answer">
                  {item.a}
                  <div className="row" style={{ marginTop: 'var(--gh-space-3)' }}>
                    <Link className="btn btn--ghost btn--sm" to={`/faq/${item.id}`}>
                      查看详情 →
                    </Link>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty__title">该型号暂无相关问答</div>
            <p className="empty__desc">可在常见问题中查找，或直接提交咨询。</p>
            <Link className="btn btn--secondary btn--sm" to="/faq">
              查看常见问题
            </Link>
          </div>
        )}
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div
          className="card reveal"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gh-space-5)', flexWrap: 'wrap' }}
        >
          <div className="row" style={{ gap: 'var(--gh-space-3)' }}>
            <span className="svc-ico">
              <IconHelp />
            </span>
            <span className="svc-ico">
              <IconDownload />
            </span>
            <div>
              <h3 className="card__title" style={{ marginBottom: 'var(--gh-space-1)' }}>
                还有其它问题？
              </h3>
              <p className="card__desc">附上型号与现象提交咨询，处理进度可在客户中心跟踪。</p>
            </div>
          </div>
          <div className="row">
            <Link className="btn btn--primary" to="/inquiry">
              提交咨询
            </Link>
            <Link className="btn btn--secondary" to="/downloads">
              下载中心
            </Link>
          </div>
        </div>
      </div>

      <TemplateBlocks pageKey="template-model" />
    </div>
  )
}