/**
 * 产品详情 · 四套 UI 布局。
 *
 * 四套布局共享同一份 `DetailSection[]`（见 DetailSections.tsx）：
 * - TocLayout：吸顶目录 + 右侧长内容，滚动高亮当前章节
 * - TabsLayout：横向标签，一次只显示一个面板（内容仍在 DOM 中，利于 SEO）
 * - AccordionLayout：分组折叠，首组默认展开
 * - LongLayout：单页连续滚动，顶部阅读进度条
 */
import { useEffect, useRef, useState } from 'react'
import { ProductHeroBlock } from '../ProductHeroBlock'
import type { DetailSection, DetailSectionKey } from './DetailSections'

type T = (key: string, vars?: Record<string, string | number>) => string

type CommonProps = {
  sections: DetailSection[]
  heroProps: Record<string, unknown>
  t: T
}

function sectionOf(sections: DetailSection[], key: DetailSectionKey) {
  return sections.find((section) => section.key === key)
}

/** 首屏：四套布局复用同一个展示台组件（相册 / 缩放 / 收藏 / CTA 行为完全一致） */
function Hero({ heroProps }: { heroProps: Record<string, unknown> }) {
  return (
    <div className="pdl-hero">
      <ProductHeroBlock props={heroProps} />
    </div>
  )
}

function SectionHead({ section, index, t }: { section: DetailSection; index?: number; t: T }) {
  return (
    <div className="pdl-section__head">
      <div className="pdl-section__heading">
        {index !== undefined && <span className="pdl-section__index">{String(index).padStart(2, '0')}</span>}
        <h2 className="pdl-section__title">{section.title}</h2>
      </div>
      {section.count !== undefined && (
        <span className="pdl-section__count">{t('blocks.pd.specCount', { n: section.count })}</span>
      )}
    </div>
  )
}

function SectionFrame({ section, index, t }: { section: DetailSection; index?: number; t: T }) {
  return (
    <section
      id={`pdl-${section.key}`}
      className="pdl-section"
      data-pdl-section={section.key}
    >
      <SectionHead section={section} index={index} t={t} />
      <div className="pdl-section__body">{section.node}</div>
    </section>
  )
}

function BuySection({ buy }: { buy?: DetailSection }) {
  if (!buy) return null
  return <div className="pdl-buy-wrap">{buy.node}</div>
}

/* ============================================================
   ① 吸顶目录
   ============================================================ */

export function TocLayout({ sections, heroProps, t }: CommonProps) {
  const sectionKeys = sections.map((section) => `pdl-${section.key}`).join('|')
  const [active, setActive] = useState<string>(sections[0]?.key ?? '')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const ids = sectionKeys.split('|').filter(Boolean)
    if (!ids.length || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        const first = visible[0]?.target.id
        if (first) setActive(first.slice('pdl-'.length))
      },
      { rootMargin: '-140px 0px -62% 0px', threshold: [0, 1] },
    )
    for (const id of ids) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [sectionKeys])

  return (
    <>
      <Hero heroProps={heroProps} />
      <div className="pdl-toc">
        <aside className={`pdl-toc__aside${mobileOpen ? ' is-open' : ''}`}>
          <button
            type="button"
            className="pdl-toc__toggle"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            <span>{t('blocks.pd.tocLabel')}</span>
            <span aria-hidden="true">{mobileOpen ? '−' : '+'}</span>
          </button>
          <nav className="pdl-toc__nav" aria-label={t('blocks.pd.tocLabel')}>
            {sections.map((section) => (
              <a
                key={section.key}
                href={`#pdl-${section.key}`}
                className={active === section.key ? 'is-active' : undefined}
                onClick={(event) => {
                  event.preventDefault()
                  setMobileOpen(false)
                  document.getElementById(`pdl-${section.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>
        <div className="pdl-toc__content">
          {sections.map((section, index) => (
            <SectionFrame key={section.key} section={section} index={index + 1} t={t} />
          ))}
        </div>
      </div>
    </>
  )
}

/* ============================================================
   ② 横向标签
   ============================================================ */

type TabGroup = { key: string; label: string; sections: DetailSection[] }

export function TabsLayout({ sections, heroProps, t }: CommonProps) {
  const buy = sectionOf(sections, 'buy')
  const overview = sectionOf(sections, 'overview')
  const specs = sectionOf(sections, 'specs')
  const compatibility = sectionOf(sections, 'compatibility')
  const downloads = sectionOf(sections, 'downloads')
  const rich = sectionOf(sections, 'rich')

  const groups: TabGroup[] = [
    {
      key: 'overview',
      label: t('blocks.pd.overview'),
      sections: [overview].filter(Boolean) as DetailSection[],
    },
    {
      key: 'specs',
      label: t('blocks.pd.specTitle'),
      sections: [specs].filter(Boolean) as DetailSection[],
    },
    {
      key: 'support',
      label: t('blocks.pd.supportTitle'),
      sections: [compatibility, downloads].filter(Boolean) as DetailSection[],
    },
    ...(rich ? [{ key: 'rich', label: t('blocks.pd.richTitle'), sections: [rich] }] : []),
  ].filter((group) => group.sections.length > 0)

  const [active, setActive] = useState(groups[0]?.key ?? '')
  const activeKey = groups.some((group) => group.key === active) ? active : groups[0]?.key

  return (
    <>
      <Hero heroProps={heroProps} />
      <div className="pdl-tabs">
        <div className="pdl-tabs__bar" role="tablist" aria-label={t('blocks.pd.overview')}>
          {groups.map((group) => (
            <button
              key={group.key}
              type="button"
              role="tab"
              aria-selected={activeKey === group.key}
              className={`pdl-tabs__tab${activeKey === group.key ? ' is-active' : ''}`}
              onClick={() => setActive(group.key)}
            >
              {group.label}
            </button>
          ))}
        </div>
        {groups.map((group) => (
          <div
            key={group.key}
            role="tabpanel"
            hidden={activeKey !== group.key}
            className="pdl-tabs__panel"
          >
            {group.sections.map((section) => (
              <div className="pdl-tabs__section" key={section.key}>
                {section.node}
              </div>
            ))}
          </div>
        ))}
      </div>
      <BuySection buy={buy} />
    </>
  )
}

/* ============================================================
   ③ 折叠分组
   ============================================================ */

export function AccordionLayout({ sections, heroProps, t }: CommonProps) {
  const buy = sectionOf(sections, 'buy')
  const groups: Array<{ key: string; title: string; children: DetailSection[] }> = [
    {
      key: 'overview',
      title: t('blocks.pd.overview'),
      children: [sectionOf(sections, 'overview')].filter(Boolean) as DetailSection[],
    },
    {
      key: 'specs',
      title: t('blocks.pd.specTitle'),
      children: [sectionOf(sections, 'specs')].filter(Boolean) as DetailSection[],
    },
    {
      key: 'support',
      title: t('blocks.pd.supportTitle'),
      children: [sectionOf(sections, 'compatibility'), sectionOf(sections, 'downloads')].filter(Boolean) as DetailSection[],
    },
    {
      key: 'rich',
      title: t('blocks.pd.richTitle'),
      children: [sectionOf(sections, 'rich')].filter(Boolean) as DetailSection[],
    },
  ].filter((group) => group.children.length > 0)

  return (
    <>
      <Hero heroProps={heroProps} />
      <div className="pdl-accordion">
        {groups.map((group, index) => (
          <details className="pdl-accordion__group" key={group.key} open={index === 0}>
            <summary>
              <span>{group.title}</span>
              {(() => {
                const total = group.children.reduce((sum, section) => sum + (section.count ?? 0), 0)
                return total > 0 ? (
                  <span className="pdl-accordion__meta">{t('blocks.pd.specCount', { n: total })}</span>
                ) : null
              })()}
            </summary>
            <div className="pdl-accordion__body">
              {group.children.map((section) => (
                <div className="pdl-accordion__section" key={section.key}>
                  <h3 className="pdl-subtitle">{section.title}</h3>
                  {section.node}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      <BuySection buy={buy} />
    </>
  )
}

/* ============================================================
   ④ 单页长滚动
   ============================================================ */

export function LongLayout({ sections, heroProps, t }: CommonProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const chapters = sections.filter((section) => section.key !== 'buy')
  const buy = sectionOf(sections, 'buy')

  useEffect(() => {
    const onScroll = () => {
      const element = rootRef.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const total = element.offsetHeight - window.innerHeight
      const passed = Math.min(Math.max(-rect.top, 0), Math.max(total, 1))
      setProgress(total > 0 ? (passed / total) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div ref={rootRef} className="pdl-long">
      <div className="pdl-progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <Hero heroProps={heroProps} />
      <div className="pdl-long__chapters">
        {chapters.map((section, index) => (
          <section
            key={section.key}
            id={`pdl-${section.key}`}
            className={`pdl-chapter${index % 2 === 1 ? ' is-alt' : ''}`}
            data-pdl-section={section.key}
          >
            <div className="pdl-chapter__head">
              <span className="pdl-chapter__eyebrow">
                {String(index + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
              </span>
              <h2 className="pdl-chapter__title">{section.title}</h2>
            </div>
            <div className="pdl-chapter__body">{section.node}</div>
          </section>
        ))}
      </div>
      <BuySection buy={buy} />
      <div className="pdl-long__foot">
        <span>{t('blocks.pd.readingProgress')}</span>
        <span>{Math.round(progress)}%</span>
      </div>
    </div>
  )
}
