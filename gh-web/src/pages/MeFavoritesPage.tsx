import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyFavorites } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 收藏（二级页面）：收藏产品列表（数据来自真实接口，按用户隔离）。
 * 「取消收藏」为本地可用的真实交互（仅记录被移除项）。
 */
export function MeFavoritesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // 收藏列表本地可移出，「取消收藏」立即移出列表（数据源仍来自接口）
  const [removed, setRemoved] = useState<string[]>([])

  const { data, loading, error } = useApi((signal) => fetchMyFavorites(signal), [reloadKey])
  const favorites = (data?.items ?? []).filter((item) => !removed.includes(item.name))

  const readyKey = `${reloadKey}:${loading ? 'loading' : `ready-${removed.length}`}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  return (
    <div ref={rootRef}>
      <div className="section__head">
        <div>
          <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
            收藏
          </h2>
          <p className="section__desc" style={{ fontSize: 'var(--gh-font-size-body-sm)' }}>
            取消收藏后移出列表；如需重新收藏，可在产品页点击收藏。
          </p>
        </div>
        <Link className="btn btn--ghost btn--sm" to="/products">
          浏览产品 →
        </Link>
      </div>

      {error ? (
        <div className="empty">
          <div className="empty__title">收藏加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !data ? (
        <div className="card" aria-busy="true" aria-label="收藏加载中">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 40, marginTop: index === 0 ? 0 : 'var(--gh-space-3)' }} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="empty">
          <div className="empty__title">暂无收藏</div>
          <p className="empty__desc">在产品页点击收藏后，型号会出现在这里。</p>
          <Link className="btn btn--secondary btn--sm" to="/products">
            前往产品列表
          </Link>
        </div>
      ) : (
        <div className="card reveal">
          {favorites.map((item, index) => (
            <div
              className="row"
              key={item.name}
              style={{
                justifyContent: 'space-between',
                paddingTop: index === 0 ? 0 : 'var(--gh-space-3)',
                paddingBottom: index === favorites.length - 1 ? 0 : 'var(--gh-space-3)',
                borderBottom: index === favorites.length - 1 ? undefined : '1px solid var(--color-border-subtle)',
              }}
            >
              <div>
                <div style={{ fontWeight: 'var(--gh-weight-medium)' }}>{item.name}</div>
                <div className="muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                  {item.spec}
                </div>
              </div>
              <button className="btn btn--sm btn--ghost" type="button" onClick={() => setRemoved((prev) => [...prev, item.name])}>
                取消收藏
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
