/**
 * 27. productMatrix 产品矩阵（需求 §1.4 新建独立区块）。
 * ============================================================
 * 卡面：**图片铺满整张卡**；型号 + 一句话 + 按钮**悬浮在图片右下角**（半透明面板保证可读）。
 * 交互：点卡片 / 型号 → 产品详情页；点按钮 → 按钮自配链接。
 *
 * 数据源（`source`）：
 * - `product` 关联产品：填 productId，自动带入产品主图 / 型号 / 详情链接，文案可覆盖；
 * - `manual` 手填：自行填图片 / 型号 / 一句话 / 链接。
 *
 * 版式：列数 2/3/4（默认 2）、图片比例 16:9（默认）/ 1:1 / 3:4、满屏开关、
 * 裁切焦点（同图裁切不变形）、手机端横滑或保持 2×2、手机端可单独传图。
 */
import { useMemo, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { fetchProducts } from '../api/products'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { MediaImg } from '../components/ui/MediaImg'
import { MEDIA, resolveMedia } from '../data/media'
import { useApi } from '../hooks/useApi'
import { useSitePages } from '../hooks/useSitePages'
import { asArray, asBool, asLink, asNumber, asRecord, asString } from './blockUtils'
import type { BlockLink } from './types'

type MatrixItem = {
  productId: string
  image: string
  imageMobile: string
  model: string
  desc: string
  href: string
  buttons: BlockLink[]
}

function toItem(value: unknown): MatrixItem {
  const record = asRecord(value)
  const buttons = asArray<unknown>(record.buttons)
    .map((entry) => asLink(entry))
    .filter((button): button is BlockLink => button !== null)
  return {
    productId: asString(record.productId),
    image: asString(record.image),
    imageMobile: asString(record.imageMobile),
    model: asString(record.model),
    desc: asString(record.desc),
    href: asString(record.href),
    buttons,
  }
}

/** 图片比例 → CSS aspect-ratio 值 */
function ratioCss(ratio: string): string {
  if (ratio === '1:1') return '1 / 1'
  if (ratio === '3:4') return '3 / 4'
  return '16 / 9'
}

/** 裁切焦点 → object-position（同一张图裁切，不变形） */
function focusCss(focus: string): string {
  switch (focus) {
    case 'top':
      return 'center top'
    case 'bottom':
      return 'center bottom'
    case 'left':
      return 'left center'
    case 'right':
      return 'right center'
    default:
      return 'center center'
  }
}

export function ProductMatrixBlock({ props }: { props: Record<string, unknown> }) {
  const { isHrefLive } = useSitePages()
  const source = asString(props.source, 'product') === 'manual' ? 'manual' : 'product'
  const rawColumns = asNumber(props.columns, 2)
  const columns = rawColumns === 3 || rawColumns === 4 ? rawColumns : 2
  const ratio = asString(props.ratio, '16:9')
  const fullscreen = asBool(props.fullscreen)
  const cropFocus = asString(props.cropFocus, 'center')
  const mobileLayout = asString(props.mobileLayout, 'rail') === 'grid' ? 'grid' : 'rail'
  const items = asArray(props.items).map(toItem)

  // 关联产品：取产品集合（手填时为空，不阻塞渲染）
  const { data, loading, error } = useApi((signal) => fetchProducts(signal), [])
  const productMap = useMemo(() => new Map((data?.items ?? []).map((item) => [item.id, item])), [data])

  const cards = items
    .map((item, index) => {
      const product = source === 'product' && item.productId ? productMap.get(item.productId) : undefined
      const image = resolveMedia(item.image) || (product ? MEDIA.product[product.id] ?? '' : '')
      const model = item.model || product?.model || ''
      const desc = item.desc || product?.name || ''
      const rawHref = item.href || (product ? `/products/${product.id}` : '')
      // 下线级联：卡面 / 型号链接指向已停用页面时归一化为空（退化为不可点内容）；按钮链接同理被过滤
      const href = rawHref && isHrefLive(rawHref) ? rawHref : ''
      const buttons = item.buttons.filter((button) => isHrefLive(button.href))
      return { key: `${item.productId || model || 'card'}-${index}`, image, imageMobile: item.imageMobile, model, desc, href, buttons }
    })
    .filter((card) => Boolean(card.image || card.model || card.desc))

  const resolvePending = source === 'product' && loading && items.length > 0
  const gridStyle = {
    '--pm-cols': columns,
    '--pm-ratio': ratioCss(ratio),
    '--pm-focus': focusCss(cropFocus),
  } as CSSProperties

  return (
    <div className={`blk-pmatrix${fullscreen ? ' is-full' : ''} is-${mobileLayout}`}>
      <SectionHeadFromProps props={props} />
      {error ? (
        <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
          产品加载失败：{error.message}。请检查网络后重试。
        </p>
      ) : resolvePending ? (
        <div className="blk-pmatrix__grid" style={gridStyle} aria-busy="true" aria-label="产品加载中">
          {items.map((_item, index) => (
            <div className="blk-pmatrix__card" key={`skeleton-${index}`}>
              <div className="blk-pmatrix__media skeleton" />
            </div>
          ))}
        </div>
      ) : cards.length === 0 ? (
        <p className="section__desc" style={{ padding: 'var(--gh-space-6) 0' }}>
          暂无可展示的产品。
        </p>
      ) : (
        <div className="blk-pmatrix__grid" style={gridStyle}>
          {cards.map((card) => (
            <article className="blk-pmatrix__card" key={card.key}>
              <div className="blk-pmatrix__media">
                {card.imageMobile ? (
                  // 手机端单独传图：留空则沿用桌面图（<900px 生效）
                  <picture>
                    <source media="(max-width: 900px)" srcSet={card.imageMobile} />
                    <MediaImg className="blk-pmatrix__img" src={card.image} alt={card.model} label={card.model} />
                  </picture>
                ) : (
                  <MediaImg className="blk-pmatrix__img" src={card.image} alt={card.model} label={card.model} />
                )}
              </div>
              {/* 整卡点击 → 产品详情页（按钮 / 型号在其上层，优先响应各自链接） */}
              {card.href && <Link className="blk-pmatrix__hit" to={card.href} aria-label={card.model || '查看产品'} />}
              <div className="blk-pmatrix__panel">
                {card.href ? (
                  <Link className="blk-pmatrix__model" to={card.href}>
                    {card.model}
                  </Link>
                ) : (
                  card.model && <span className="blk-pmatrix__model">{card.model}</span>
                )}
                {card.desc && <p className="blk-pmatrix__desc">{card.desc}</p>}
                {card.buttons.length > 0 && (
                  <div className="blk-pmatrix__btns">
                    {card.buttons.map((button, index) => (
                      <Link className="btn btn--primary btn--sm" to={button.href} key={`${button.label}-${index}`}>
                        {button.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
