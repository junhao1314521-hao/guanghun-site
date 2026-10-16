import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TemplateBlocks } from '../blocks/TemplateBlocks'
import { sanitizeRichText } from '../blocks/sanitize'
import { fetchArticle } from '../api/articles'
import { ApiError } from '../api/client'
import { MediaImg } from '../components/ui/MediaImg'
import { JsonLdNode } from '../components/site/JsonLd'
import { articleJsonLd } from '../components/site/detailJsonLd'
import { articleCoverSrc } from '../data/articles'
import { useApi } from '../hooks/useApi'
import { useDetailSeo } from '../hooks/useDetailSeo'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 详情加载骨架：沿用「封面 + 正文卡」的分栏，避免数据到位时布局跳动 */
function ArticleDetailSkeleton() {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }} aria-busy="true" aria-label="文章加载中">
      <span className="skeleton" style={{ display: 'block', aspectRatio: '16 / 9', borderRadius: 'var(--gh-radius-lg)' }} />
      <div className="card" style={{ maxWidth: 860, margin: 'var(--gh-space-6) auto 0' }}>
        <div className="skeleton" style={{ height: 22, width: '40%' }} />
        <div className="skeleton" style={{ height: 14, width: '100%', marginTop: 'var(--gh-space-4)' }} />
        <div className="skeleton" style={{ height: 14, width: '94%', marginTop: 'var(--gh-space-2)' }} />
        <div className="skeleton" style={{ height: 22, width: '32%', marginTop: 'var(--gh-space-6)' }} />
        <div className="skeleton" style={{ height: 14, width: '98%', marginTop: 'var(--gh-space-4)' }} />
        <div className="skeleton" style={{ height: 14, width: '88%', marginTop: 'var(--gh-space-2)' }} />
      </div>
    </div>
  )
}

/** 文章详情（二级页面）：标题与元信息、封面、正文小节、相关阅读 */
export function ArticleDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data: article, loading, error } = useApi((signal) => fetchArticle(id, signal), [id, reloadKey])

  // 数据到位后正文与相关阅读才渲染，用 readyKey 触发一次动效重绑
  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const notFound = error instanceof ApiError && error.status === 404

  // 富文本正文：存原文、渲染时白名单净化（见 blocks/sanitize.ts）；无 body 时回退到小节展示
  const bodyHtml = useMemo(() => (article?.body ? sanitizeRichText(article.body) : ''), [article])

  // 目录 TOC：扫描正文里的 h2/h3，注入锚点 id，并生成目录项（长文导航）
  const { tocHtml, toc } = useMemo(() => {
    const items: Array<{ id: string; text: string }> = []
    if (!bodyHtml) return { tocHtml: '', toc: items }
    const html = bodyHtml.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g, (_m, level: string, attrs: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim()
      if (!text) return `<h${level}${attrs}>${inner}</h${level}>`
      const id = `sec-${items.length + 1}`
      items.push({ id, text })
      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`
    })
    return { tocHtml: html, toc: items }
  }, [bodyHtml])

  // 分享：复制链接（剪贴板）+ 分享到微博（新窗口）
  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      // 剪贴板不可用时静默失败（不阻断阅读）
    }
  }

  // SEO 覆盖：真实标题 / 摘要 / 文章类型（封面为内联占位时分享图回退默认图）
  useDetailSeo({
    title: article ? `${article.title} · 光魂` : undefined,
    description: article?.desc,
    image: article ? articleCoverSrc(article.cover, article.coverImage) : undefined,
    ogType: 'article',
  })

  return (
    <div ref={rootRef}>
      {article && <JsonLdNode node={articleJsonLd(article, articleCoverSrc(article.cover, article.coverImage))} />}
      {/* 面包屑 + 标题（数据未就绪时仅显示导航层级） */}
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/articles">文章</Link>
          {article && (
            <>
              <span>/</span>
              <span>{article.title}</span>
            </>
          )}
        </nav>

        {article && (
          <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
            <div>
              <div className="row" style={{ gap: 'var(--gh-space-2)', flexWrap: 'wrap' }}>
                {(article.tags?.length ? article.tags : [article.tag]).map((label, index) => (
                  <span className={`tag${article.accent && index === 0 ? ' tag--accent' : ''}`} key={label}>
                    {label}
                  </span>
                ))}
              </div>
              <h1 className="section__title" style={{ marginTop: 'var(--gh-space-3)' }}>
                {article.title}
              </h1>
              <div className="row" style={{ marginTop: 'var(--gh-space-3)', gap: 'var(--gh-space-4)' }}>
                <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  作者：{article.author}
                </span>
                <span className="muted mono" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  {article.date}
                </span>
                <span className="muted" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
                  {article.readingMin} 分钟阅读
                </span>
                <span className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {article.meta}
                </span>
                {/* 分享：复制链接 + 微博 */}
                <span className="article-share">
                  <button className="article-share__btn" type="button" onClick={() => void copyLink()}>
                    复制链接
                  </button>
                  <a
                    className="article-share__btn"
                    href={`https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(article.title)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    分享到微博
                  </a>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {error ? (
        notFound ? (
          <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
            <div className="empty">
              <div className="empty__title">未找到该文章</div>
              <p className="empty__desc">链接可能已失效或该文章已下线，返回文章列表重新选择。</p>
              <Link className="btn btn--secondary btn--sm" to="/articles">
                返回文章列表
              </Link>
            </div>
          </div>
        ) : (
          <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
            <div className="empty">
              <div className="empty__title">文章加载失败</div>
              <p className="empty__desc">{error.message}。请检查网络后重试。</p>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                重新加载
              </button>
            </div>
          </div>
        )
      ) : loading || !article ? (
        <ArticleDetailSkeleton />
      ) : (
        <>
          {/* 封面 */}
          <div className="container" style={{ paddingBottom: 'var(--gh-space-7)' }}>
            <div className="ph-box ph-box--media reveal" style={{ aspectRatio: '16 / 9' }}>
              <MediaImg src={articleCoverSrc(article.cover, article.coverImage)} alt={article.title} loading="eager" />
            </div>
          </div>

          {/* 正文：优先渲染后台富文本 body（净化后 render），无 body 时回退到小节展示 */}
          <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
            {/* 目录 TOC（长文导航）：正文里存在 h2/h3 且条目 > 1 时展示 */}
            {toc.length > 1 && (
              <nav className="article-toc" aria-label="文章目录">
                <span className="article-toc__title">目录</span>
                <ol>
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`}>{item.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
            <article className="card reveal" style={{ maxWidth: 860, margin: '0 auto' }}>
              {tocHtml ? (
                <div className="blk-rich" dangerouslySetInnerHTML={{ __html: tocHtml }} />
              ) : (
                article.sections.map((section, index) => (
                  <section key={section.heading} style={{ marginTop: index === 0 ? 0 : 'var(--gh-space-6)' }}>
                    <h2 className="section__title">
                      {section.heading}
                    </h2>
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <p className="section__desc" style={{ maxWidth: 'none', marginTop: 'var(--gh-space-3)' }} key={pIndex}>
                        {paragraph}
                      </p>
                    ))}
                  </section>
                ))
              )}
            </article>
          </div>
        </>
      )}
      {!error && !loading && article && <TemplateBlocks pageKey="template-article" />}
    </div>
  )
}