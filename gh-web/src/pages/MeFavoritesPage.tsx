import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyFavorites, removeMyFavorite } from '../api/account'
import { PRODUCTS } from '../data/products'
import { trackEvent } from '../lib/track'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { MePageHeader } from '../components/site/MePageHeader'

/**
 * 个人中心 · 收藏（二级页面）：以产品卡形态展示收藏，带主图与详情入口。
 * 「取消收藏」为真实接口 `DELETE /api/account/favorites/:name`。
 */
export function MeFavoritesPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { data, loading, error } = useApi((signal) => fetchMyFavorites(signal), [reloadKey])
  const favorites = data?.items ?? []

  // 收藏项名称以「型号 + 描述」拼接；历史数据的型号可能带前缀（如 54027X1QE-W54），
  // 因此用「名称包含产品型号」匹配，兼容新旧命名。
  const productOf = useMemo(
    () => (name: string) => PRODUCTS.find((product) => name.includes(product.model)),
    [],
  )

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
      <MePageHeader
        title="收藏"
        description="收藏的型号会保留在这里；进入详情页可查看完整参数与购买信息。"
        action={
          <Link className="btn btn--ghost btn--sm" to="/products">
            浏览产品 →
          </Link>
        }
      />

      {error ? (
        <div className="empty">
          <div className="empty__title">收藏加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
            重新加载
          </button>
        </div>
      ) : loading || !data ? (
        <div aria-busy="true" aria-label="收藏加载中" className="me-favs">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 88 }} />
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
        <div className="me-favs reveal">
          {favorites.map((item) => {
            const product = productOf(item.name)
            const image = product?.gallery?.[0]
            return (
              <div className="me-fav" key={item.name}>
                {product && image ? (
                  <Link className="me-fav__media" to={`/products/${product.id}`} tabIndex={-1} aria-hidden="true">
                    <img src={image} alt="" loading="lazy" />
                  </Link>
                ) : (
                  <span className="me-fav__media me-fav__media--empty" aria-hidden="true" />
                )}
                <div className="me-fav__body">
                  {product ? (
                    <Link className="me-fav__name" to={`/products/${product.id}`}>
                      {item.name}
                    </Link>
                  ) : (
                    <div className="me-fav__name">{item.name}</div>
                  )}
                  <div className="me-fav__spec">{item.spec}</div>
                </div>
                <div className="me-fav__actions">
                  {product ? (
                    <>
                      <Link className="btn btn--sm btn--secondary" to={`/products/${product.id}`}>
                        查看详情
                      </Link>
                      <Link
                        className="btn btn--sm btn--ghost"
                        to={`/compare?ids=${encodeURIComponent(product.id)}`}
                        onClick={() => trackEvent('compare', product.id)}
                      >
                        加入对比
                      </Link>
                    </>
                  ) : null}
                  <button className="btn btn--sm btn--ghost" type="button" onClick={() => remove(item.name)}>
                    取消收藏
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
