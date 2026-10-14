import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { ApiError } from '../api/client'
import { fetchDownload } from '../api/support-extra'
import { JsonLdNode } from '../components/site/JsonLd'
import { downloadJsonLd } from '../components/site/detailJsonLd'
import { DOWNLOAD_TYPE_LABELS } from '../data/support-extra'
import { trackDownload } from '../lib/track'
import { useApi } from '../hooks/useApi'
import { useDetailSeo } from '../hooks/useDetailSeo'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 资料详情（深度线 · 详情）：版本信息、校验值、安装步骤与更新日志 */
export function DownloadDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // 复制校验值反馈
  const [copied, setCopied] = useState(false)

  const { data: detail, loading, error } = useApi((signal) => fetchDownload(id, signal), [id, reloadKey])
  const notFound = error instanceof ApiError && error.status === 404

  // 数据到位后内容才渲染，用 readyKey 触发一次动效重绑
  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  // SEO 覆盖：以资料名称 / 说明作为标题 / 摘要
  useDetailSeo({
    title: detail ? `${detail.name} · 光魂` : undefined,
    description: detail?.note,
    ogType: 'website',
  })

  if (loading) {
    return (
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }} aria-busy="true" aria-label="资料详情加载中">
        <div className="skeleton" style={{ height: 14, width: 220, marginBottom: 'var(--gh-space-5)' }} />
        <div className="skeleton" style={{ height: 32, width: '50%' }} />
        <div className="skeleton" style={{ height: 120, marginTop: 'var(--gh-space-5)' }} />
        <div className="skeleton" style={{ height: 180, marginTop: 'var(--gh-space-5)' }} />
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
          <Link to="/downloads">下载中心</Link>
        </nav>
        <div className="empty" style={{ marginTop: 'var(--gh-space-6)' }}>
          <div className="empty__title">{notFound ? '未找到该资料' : '资料加载失败'}</div>
          <p className="empty__desc">
            {notFound
              ? '该资料可能已撤回或链接有误，返回下载中心重新选择。'
              : `${error?.message ?? '请求失败'}，请检查网络后重试。`}
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/downloads">
              返回下载中心
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
      <JsonLdNode node={downloadJsonLd(detail)} />
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <Link to="/downloads">下载中心</Link>
          <span>/</span>
          <span>{detail.name}</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <h1 className="section__title">{detail.name}</h1>
            <p className="section__desc">{detail.note}</p>
          </div>
          <div className="row">
            {detail.fileUrl ? (
              <a
                className="btn btn--primary"
                href={detail.fileUrl}
                download
                rel="noreferrer"
                onClick={() => trackDownload(detail.id)}
              >
                下载
              </a>
            ) : (
              <span
                className="btn btn--primary"
                role="note"
                title="该资料尚未上传文件，上线后可用"
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              >
                下载（文件待上传）
              </span>
            )}
            <Link className="btn btn--secondary" to="/downloads">
              返回下载中心
            </Link>
          </div>
        </div>

        <div className="card reveal">
          <div className="dl-meta">
            <div>
              <div className="dl-meta__k">类型</div>
              <div className="dl-meta__v">{DOWNLOAD_TYPE_LABELS[detail.type]}</div>
            </div>
            <div>
              <div className="dl-meta__k">版本</div>
              <div className="dl-meta__v">{detail.version}</div>
            </div>
            <div>
              <div className="dl-meta__k">大小</div>
              <div className="dl-meta__v">{detail.size}</div>
            </div>
            <div>
              <div className="dl-meta__k">更新日期</div>
              <div className="dl-meta__v">{detail.date}</div>
            </div>
            <div>
              <div className="dl-meta__k">适用型号</div>
              <div
                className="dl-meta__v"
                style={{ fontFamily: 'var(--gh-font-sans)', fontSize: 'var(--gh-font-size-body-sm)' }}
              >
                {detail.models.join(' / ')}
              </div>
            </div>
          </div>

          <div className="field" style={{ marginTop: 'var(--gh-space-5)' }}>
            <span className="field__label">SHA-256 校验值</span>
            <div className="row" style={{ gap: 'var(--gh-space-3)' }}>
              <span
                className="mono"
                style={{
                  overflowWrap: 'anywhere',
                  fontSize: 'var(--gh-font-size-body-sm)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {detail.sha256}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(detail.sha256)
                    .then(() => {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 2000)
                    })
                    .catch(() => {
                      // 剪贴板不可用（非安全上下文等）时静默
                    })
                }}
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <span className="field__hint">下载完成后可核对校验值，确认文件完整。</span>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <h2 className="section__title" style={{ marginBottom: 'var(--gh-space-4)' }}>
          安装步骤
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
          {detail.installSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <h2 className="section__title" style={{ marginBottom: 'var(--gh-space-4)' }}>
          更新日志
        </h2>
        <div className="news-list reveal">
          {detail.changelog.map((entry) => (
            <div className="news-row" key={entry.version}>
              <span className="news-row__date">{entry.version}</span>
              <span className="tag">{entry.date}</span>
              <span className="news-row__title">{entry.notes.join('；')}</span>
            </div>
          ))}
        </div>
        <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)' }}>
          版本号与变更内容以官方最终公布为准。
        </p>
      </div>

      <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
        <div
          className="card reveal"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gh-space-5)', flexWrap: 'wrap' }}
        >
          <div>
            <h3 className="card__title" style={{ marginBottom: 'var(--gh-space-1)' }}>
              安装遇到问题？
            </h3>
            <p className="card__desc">附上型号与现象提交咨询，处理进度与补充材料都在客户中心里跟进。</p>
          </div>
          <div className="row">
            <Link className="btn btn--primary" to="/inquiry">
              提交咨询
            </Link>
            <Link className="btn btn--secondary" to="/faq">
              查看常见问题
            </Link>
          </div>
        </div>
      </div>

      <TemplateBlocks pageKey="template-download" />
    </div>
  )
}