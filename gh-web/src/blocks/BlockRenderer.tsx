/**
 * 区块渲染器（契约 §8）：按 `block.type` 分派到 16 类区块 + 自定义模块 3 类的组件。
 *
 * - `enabled === false` 直接跳过（前台与预览一致）；
 * - 每个区块套一层外壳（`.blk`），把 `BlockStyle` 映射为令牌组合类名，
 *   并把内容收进响应式容器 `.blk__container--*`（内容宽度由 style.container 决定）；
 * - `layout` 通过 render 回调递归分派子区块（只允许一层嵌套，见契约 §9）。
 */
import type { ReactNode } from 'react'
import '../styles/blocks.css'
import type { Block } from './types'
import { containerClass, normalizeAnchor, shellClass } from './blockUtils'
import { HeroBlock } from './HeroBlock'
import { CarouselBlock } from './CarouselBlock'
import { VideoBlock } from './VideoBlock'
import { TextBlock } from './TextBlock'
import { ImageTextBlock } from './ImageTextBlock'
import { ImageGridBlock } from './ImageGridBlock'
import { StatsBlock } from './StatsBlock'
import { CardsBlock } from './CardsBlock'
import { TimelineBlock } from './TimelineBlock'
import { ProductGridBlock } from './ProductGridBlock'
import { ArticleListBlock } from './ArticleListBlock'
import { RankingBlock } from './RankingBlock'
import { DownloadListBlock } from './DownloadListBlock'
import { FaqListBlock } from './FaqListBlock'
import { ContactBlock } from './ContactBlock'
import { LayoutBlock } from './LayoutBlock'
import { RichTextBlock } from './RichTextBlock'
import { HtmlBlock } from './HtmlBlock'
import { EmbedBlock } from './EmbedBlock'
import { ShowcaseBlock } from './ShowcaseBlock'
import { ProductHeroBlock } from './ProductHeroBlock'
import { ProductSpecsBlock } from './ProductSpecsBlock'
import { ProductBuyBlock } from './ProductBuyBlock'
import { CaseListBlock } from './CaseListBlock'
import { VenueListBlock } from './VenueListBlock'
import { MethodListBlock } from './MethodListBlock'

/** 按区块类型分派到对应组件；未知类型返回 null（向前兼容后台新增类型） */
function renderBlock(block: Block): ReactNode {
  const props = block.props
  switch (block.type) {
    case 'hero':
      return <HeroBlock props={props} />
    case 'carousel':
      return <CarouselBlock props={props} />
    case 'video':
      return <VideoBlock props={props} />
    case 'text':
      return <TextBlock props={props} />
    case 'imageText':
      return <ImageTextBlock props={props} />
    case 'imageGrid':
      return <ImageGridBlock props={props} />
    case 'stats':
      return <StatsBlock props={props} />
    case 'cards':
      return <CardsBlock props={props} />
    case 'timeline':
      return <TimelineBlock props={props} />
    case 'productGrid':
      return <ProductGridBlock props={props} />
    case 'articleList':
      return <ArticleListBlock props={props} />
    case 'ranking':
      return <RankingBlock props={props} />
    case 'downloadList':
      return <DownloadListBlock props={props} />
    case 'faqList':
      return <FaqListBlock props={props} />
    case 'contact':
      return <ContactBlock props={props} />
    case 'layout':
      return <LayoutBlock props={props} render={(blocks) => <BlockRenderer blocks={blocks} />} />
    case 'richText':
      return <RichTextBlock props={props} />
    case 'html':
      return <HtmlBlock props={props} />
    case 'embed':
      return <EmbedBlock props={props} />
    case 'showcase':
      return <ShowcaseBlock props={props} />
    // 产品详情主体区块（依赖 ProductDetailContext 提供的当前产品数据）
    case 'productHero':
      return <ProductHeroBlock props={props} />
    case 'productSpecs':
      return <ProductSpecsBlock props={props} />
    case 'productBuy':
      return <ProductBuyBlock props={props} />
    // 商业合作数据源区块
    case 'caseList':
      return <CaseListBlock props={props} />
    case 'venueList':
      return <VenueListBlock props={props} />
    case 'methodList':
      return <MethodListBlock props={props} />
    default:
      return null
  }
}

/** 渲染有序区块列表：每个启用区块一个外壳 section */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks
        .filter((block) => block.enabled)
        .map((block) => (
          // style.anchor → 区块外壳 id，支持 /path#anchor 页内深链定位
          <section
            key={block.id}
            id={normalizeAnchor(block.style?.anchor)}
            className={shellClass(block.style)}
            data-block={block.type}
          >
            {/* 通栏（full）：不套内容容器，允许内容贴边、铺满视口宽度，由区块内部自行控制 */}
            {block.style?.container === 'full' ? (
              renderBlock(block)
            ) : (
              <div className={`blk__container ${containerClass(block.style?.container)}`}>{renderBlock(block)}</div>
            )}
          </section>
        ))}
    </>
  )
}