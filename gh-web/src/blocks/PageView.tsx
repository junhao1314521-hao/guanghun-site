/**
 * 页面视图（契约 §8）：内容页 / 数据页的统一入口。
 *
 * 通过公开端点 `GET /api/content/pages/:key` 取「页面 → 有序区块列表」，
 * 三态（loading / error / data）与既有约定一致；数据到位后交由 BlockRenderer 渲染。
 * 页头（面包屑 + h1）取自内容库的 `page.title`，为页面提供唯一 h1（区块内标题统一 h2）。
 */
import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { fetchPage } from '../api/content'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { BlockRenderer } from './BlockRenderer'
import type { Block, BlockType } from './types'

/** 页面骨架：区块到位前的占位，避免布局跳动 */
function PageSkeleton({ head }: { head: boolean }) {
  return (
    <div className="container" style={{ paddingTop: 'var(--gh-space-7)', paddingBottom: 'var(--gh-space-9)' }} aria-busy="true" aria-label="内容加载中">
      {head && (
        <>
          <div className="skeleton" style={{ height: 14, width: 200 }} />
          <div className="skeleton" style={{ height: 32, width: 280, marginTop: 'var(--gh-space-4)' }} />
        </>
      )}
      <div className="grid-2" style={{ marginTop: 'var(--gh-space-8)', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-3)' }}>
          <div className="skeleton" style={{ height: 28, width: '72%' }} />
          <div className="skeleton" style={{ height: 16, width: '100%' }} />
          <div className="skeleton" style={{ height: 16, width: '68%' }} />
        </div>
        <div className="skeleton" style={{ aspectRatio: '4 / 3' }} />
      </div>
      <div className="grid-3" style={{ marginTop: 'var(--gh-space-8)' }}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="card" key={index}>
            <div className="skeleton" style={{ height: 20, width: '46%' }} />
            <div className="skeleton" style={{ height: 14, width: '80%', marginTop: 'var(--gh-space-3)' }} />
            <div className="skeleton" style={{ height: 12, width: '92%', marginTop: 'var(--gh-space-2)' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 按区块类型注入的默认 props（服务端已有字段优先，仅补齐缺失项） */
export type BlockDefaults = Partial<Record<BlockType, Record<string, unknown>>>

type Props = {
  /** 内容库页面 key（契约 §2） */
  pageKey: string
  /** 是否渲染页头（面包屑 + h1）；首页等自带首屏的页面可关闭 */
  head?: boolean
  /**
   * 数据源区块的交互能力开关（如 `{ productGrid: { showFilter: true } }`）。
   *
   * 列表页的筛选 / 排序 / 分页控件由对应数据源区块内部实现，开关随页面传入；
   * 合并时**服务端 props 优先**，便于后台后续为单页显式覆盖。这样列表页仍然
   * 完全由内容库的区块序列驱动，同时不丢失原有交互。
   */
  blockDefaults?: BlockDefaults
  /** 页头右侧操作区（如「产品对比」入口）；仅当渲染页头时生效 */
  headAction?: ReactNode
}

/** 把页面级默认 props 合并进匹配类型的区块（服务端 props 覆盖默认值） */
function applyDefaults(blocks: Block[], defaults?: BlockDefaults): Block[] {
  if (!defaults) return blocks
  return blocks.map((block) => {
    const preset = defaults[block.type]
    if (!preset) return block
    return { ...block, props: { ...preset, ...block.props } }
  })
}

/** 内容页视图：取内容库单页 → 渲染 page.blocks */
export function PageView({ pageKey, head = true, blockDefaults, headAction }: Props) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data: page, loading, error } = useApi((signal) => fetchPage(pageKey, signal), [pageKey, reloadKey])

  // 数据到位后各区块才挂载，用 readyKey 触发一次动效重绑
  const readyKey = `${pageKey}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <div ref={rootRef}>
      {error ? (
        <div className="container" style={{ paddingTop: 'var(--gh-space-7)', paddingBottom: 'var(--gh-space-9)' }}>
          <div className="empty">
            <div className="empty__title">{notFound ? '未找到该页面' : '内容加载失败'}</div>
            <p className="empty__desc">
              {notFound ? '该页面可能已下线或链接有误，返回首页重新选择。' : `${error.message}。请检查网络后重试。`}
            </p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link className="btn btn--secondary btn--sm" to="/">
                返回首页
              </Link>
              {!notFound && (
                <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                  重新加载
                </button>
              )}
            </div>
          </div>
        </div>
      ) : loading || !page ? (
        <PageSkeleton head={head} />
      ) : (
        <>
          {head ? (
            <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
              <nav className="breadcrumb" aria-label="面包屑">
                <Link to="/">首页</Link>
                <span>/</span>
                <span>{page.title}</span>
              </nav>
              <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-4)' }}>
                <div>
                  <h1 className="section__title">{page.title}</h1>
                </div>
                {headAction}
              </div>
            </div>
          ) : (
            // 关闭页头时（如自带首屏的页面）仍保留唯一 h1，仅供读屏与 SEO，不占据视觉
            <h1 className="sr-only">{page.title}</h1>
          )}
          {(() => {
            const blocks = applyDefaults(page.blocks, blockDefaults)
            // 页面存在但无启用区块（后台全部停用 / 空页面）→ 给出空态，避免白屏
            if (!blocks.some((block) => block.enabled)) {
              return (
                <div className="container" style={{ paddingTop: 'var(--gh-space-8)', paddingBottom: 'var(--gh-space-9)' }}>
                  <div className="empty">
                    <div className="empty__title">该页面暂无内容</div>
                    <p className="empty__desc">页面尚未配置或区块已全部停用，返回首页重新选择。</p>
                    <Link className="btn btn--secondary btn--sm" to="/">
                      返回首页
                    </Link>
                  </div>
                </div>
              )
            }
            return <BlockRenderer blocks={blocks} />
          })()}
        </>
      )}
    </div>
  )
}