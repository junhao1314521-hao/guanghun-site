import { Link } from 'react-router-dom'
import type { ArticleCard, BrandStats, LadderRow, NewsItem, ServiceEntries } from '../../api/home'
import { MEDIA } from '../../data/media'
import { MediaImg } from '../ui/MediaImg'
import { IconChat, IconDownload, IconHelp, IconModel } from '../ui/Icon'
import { SectionHead } from './SectionHead'

const SERVICE_ICONS = {
  model: IconModel,
  download: IconDownload,
  faq: IconHelp,
  contact: IconChat,
} as const

/**
 * 天梯榜 teaser（皮肤层）：只展示完整榜单的局部，
 * 底部渐变虚化（见 .ladder--teaser），点击 CTA 进入完整榜单页。
 */
export function LadderTeaser({ rows }: { rows: LadderRow[] }) {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <div className="stage" style={{ padding: 'var(--gh-space-8)' }}>
        <div className="stage__glow" />
        <div className="stage__content">
          <div
            className="row"
            style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--gh-space-6)' }}
          >
            <div>
              <div className="hero__eyebrow">LADDER / 综合榜</div>
              <h2 className="section__title" style={{ color: 'var(--gh-neutral-50)', marginTop: 'var(--gh-space-2)' }}>
                天梯榜
              </h2>
              <p
                className="stage__desc"
                style={{ marginTop: 'var(--gh-space-2)', color: 'var(--gh-neutral-400)', maxWidth: '52ch' }}
              >
                全部数值来自同一套可复现的测试方法，标注测试日期与样本数。
              </p>
            </div>
            <Link className="btn btn--primary" to="/ladder">
              查看完整榜单
            </Link>
          </div>

          <div
            className="ladder ladder--teaser"
            style={{ background: 'transparent', borderColor: 'var(--gh-neutral-800)' }}
          >
            <div
              className="ladder__head"
              style={{
                background: 'rgba(255,255,255,.04)',
                borderColor: 'var(--gh-neutral-800)',
                color: 'var(--gh-neutral-500)',
              }}
            >
              <span className="ladder__rank">#</span>
              <span className="ladder__model">型号</span>
              <span className="ladder__name">归类</span>
              <span style={{ flex: 1 }}>综合得分</span>
              <span className="ladder__value">数值</span>
            </div>
            {rows.map((row) => (
              <div className="ladder__row" style={{ borderColor: 'var(--gh-neutral-800)' }} key={row.rank}>
                <span className={`ladder__rank${row.rank === '01' ? ' ladder__rank--top' : ''}`}>{row.rank}</span>
                <span className="ladder__model" style={{ color: 'var(--gh-neutral-50)' }}>
                  {row.model}
                </span>
                <span className="ladder__name" style={{ color: 'var(--gh-neutral-400)' }}>
                  {row.category}
                </span>
                <span className="ladder__track" style={{ background: 'var(--gh-neutral-800)' }}>
                  <i className="ladder__fill" style={{ ['--fill-target' as string]: row.fill }} />
                </span>
                <span className="ladder__value" style={{ color: 'var(--gh-neutral-50)' }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/** 技术评测：评测文章、技术解析与测试方法 */
export function TechArticles({ articles }: { articles: ArticleCard[] }) {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <SectionHead
        title="技术评测"
        desc="评测文章、技术解析与测试方法，依据与版本全部公开。"
        action={
          <Link className="btn btn--ghost" to="/articles">
            查看全部文章 →
          </Link>
        }
      />
      <div className="grid-3">
        {articles.map((article, index) => (
          <Link
            className="card card--link reveal"
            to={`/articles/${article.id}`}
            key={article.id}
            data-delay={index + 1}
          >
            <span className={`tag${article.accent ? ' tag--accent' : ''}`} style={{ alignSelf: 'flex-start' }}>
              {article.tag}
            </span>
            <h3 className="card__title">{article.title}</h3>
            <p className="card__desc">{article.desc}</p>
            <div className="card--link__foot">
              <span className="mono" style={{ fontSize: 'var(--gh-font-size-caption)', color: 'var(--color-text-tertiary)' }}>
                {article.date}
              </span>
              <span className="mono" style={{ fontSize: 'var(--gh-font-size-caption)', color: 'var(--color-text-tertiary)' }}>
                {article.meta}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/** 品牌介绍（骨架层，不使用电竞皮肤） */
export function BrandIntro({ stats }: { stats: BrandStats }) {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <div className="grid-2">
        <div className="reveal">
          <div className="stage__eyebrow" style={{ color: 'var(--color-accent-text)' }}>
            ABOUT 光魂
          </div>
          <h2 className="section__title" style={{ marginTop: 'var(--gh-space-2)' }}>
            以实测数据定义性能
          </h2>
          <p className="section__desc" style={{ maxWidth: '54ch' }}>
            光魂专注电竞外设的研发与测试。我们相信参数应当可复现、方法应当公开、结论应当可追溯——这也是天梯榜存在的理由。
          </p>
          <div className="row" style={{ gap: 'var(--gh-space-7)', marginTop: 'var(--gh-space-5)' }}>
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="stat__value">{stat.value}</div>
                <div className="stat__label">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 'var(--gh-space-6)' }}>
            <Link className="btn btn--primary" to="/about">
              了解光魂 →
            </Link>
            <Link className="btn btn--ghost" to="/ladder#method">
              查看测试方法
            </Link>
          </div>
        </div>
        <div
          className="card card--media reveal"
          style={{ aspectRatio: '4 / 3' }}
        >
          <MediaImg src={MEDIA.about.brand} alt="光魂品牌视觉" />
        </div>
      </div>
    </div>
  )
}

/** 服务入口 */
export function ServiceEntries({ entries }: { entries: ServiceEntries }) {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <SectionHead title="服务入口" desc="按型号查找支持资料，或直接联系我们。" />
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {entries.map((entry, index) => {
          const Icon = SERVICE_ICONS[entry.id]
          return (
            <Link className="card card--link reveal" to="/support" key={entry.id} data-delay={index + 1}>
              <span className="svc-ico">
                <Icon />
              </span>
              <h3 className="card__title">{entry.title}</h3>
              <p className="card__desc">{entry.desc}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/** 新闻与动态 */
export function NewsSection({ news }: { news: NewsItem[] }) {
  return (
    <div className="container" style={{ paddingBottom: 'var(--gh-space-9)' }}>
      <SectionHead
        title="新闻与动态"
        desc="产品发布、活动与品牌动态。"
        action={
          <Link className="btn btn--ghost" to="/about#news">
            查看全部 →
          </Link>
        }
      />
      <div className="news-list reveal">
        {news.map((item) => (
          <Link className="news-row" to="/about#news" key={item.title}>
            <span className="news-row__date">{item.date}</span>
            <span className="tag">{item.tag}</span>
            <span className="news-row__title">{item.title}</span>
            <span className="news-row__go" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}