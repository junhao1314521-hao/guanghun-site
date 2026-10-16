import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyFavorites, removeMyFavorite } from '../api/account'
import { PRODUCTS } from '../data/products'
import { trackEvent } from '../lib/track'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 收藏（二级页面）：收藏产品列表（数据来自真实接口，按用户隔离）。
 * 「取消收藏」为真实接口 `DELETE /api/account/favorites/:name`。
 */
export function MeFavoritesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchMyFavorites(signal), [reloadKey])
  const favorites = data?.items ?? []

  // 型号 → 产品 id：收藏项的 name 以「型号 + 名称」拼接，取首个空格前的型号段匹配产品
  const modelToId = useMemo(() => {
    const map: Record<string, string> = {}
    for (const product of PRODUCTS) map[product.model] = product.id
    return map
  }, [])
  const productIdOf = (name: string) => modelToId[name.trim().split(/\s+/)[0]] ?? ''

  const readyKey = `${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const remove = async (name: string) => {
    try {
      await removeMyFavorite(name)
      setReloadKey((key) => key + 1)
    } catch {
      // 失败静默：刷新后列表即最新态
    }
  }

  return (
    <div ref={rootRef}>
      <div className="section__head">
        <div>
          <h2 className="section__title">
            收藏
          </h2>
          <p className="section__desc">
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
              <div className="row" style={{ gap: 'var(--gh-space-2)' }}>
                {productIdOf(item.name) && (
                  <Link
                    className="btn btn--sm btn--secondary"
                    to={`/compare?ids=${encodeURIComponent(productIdOf(item.name))}`}
                    onClick={() => trackEvent('compare', productIdOf(item.name))}
                  >
                    加入对比
                  </Link>
                )}
                <button className="btn btn--sm btn--ghost" type="button" onClick={() => remove(item.name)}>
                  取消收藏
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
