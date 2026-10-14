/**
 * 2. carousel 轮播（契约 §4）
 * props: slides:{eyebrow,title:string[],desc,mediaTag,image,primary,secondary?,stats}[]
 *        autoplay:boolean
 *
 * 复用 blocks.css 的 .blk-hero* 外壳（结构与首页首屏一致）：自动播放 + 箭头 + 指示器 +
 * 左右方向键；悬停暂停；尊重「减少动态效果」偏好。
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconChevronLeft, IconChevronRight } from '../components/ui/Icon'
import { prefersReducedMotion } from '../lib/motion'
import { asArray, asBool, asLink, asRecord, asStatItems, asString, asStringArray } from './blockUtils'

const DURATION = 6000

type Slide = {
  eyebrow: string
  title: string[]
  desc: string
  mediaTag: string
  image: string
  /** 手机竖版海报（<900px 使用；缺省回退横版） */
  imageMobile: string
  primary: ReturnType<typeof asLink>
  secondary: ReturnType<typeof asLink>
  stats: ReturnType<typeof asStatItems>
}

function toSlide(value: unknown): Slide {
  const record = asRecord(value)
  return {
    eyebrow: asString(record.eyebrow),
    title: asStringArray(record.title),
    desc: asString(record.desc),
    mediaTag: asString(record.mediaTag),
    image: asString(record.image),
    imageMobile: asString(record.imageMobile),
    primary: asLink(record.primary),
    secondary: asLink(record.secondary),
    stats: asStatItems(record.stats),
  }
}

export function CarouselBlock({ props }: { props: Record<string, unknown> }) {
  const slides = asArray(props.slides).map(toSlide)
  const autoplay = asBool(props.autoplay, true)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const total = slides.length
  const go = (next: number) => setIndex(((next % total) + total) % total)

  useEffect(() => {
    if (!autoplay || paused || total <= 1 || prefersReducedMotion()) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % total), DURATION)
    return () => window.clearInterval(timer)
  }, [autoplay, paused, total])

  if (total === 0) return null

  return (
    <div
      className="blk-hero"
      tabIndex={0}
      role="group"
      aria-label="首屏轮播，可用左右方向键切换"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') go(index + 1)
        if (event.key === 'ArrowLeft') go(index - 1)
      }}
    >
      <div className="blk-hero__slides">
        {slides.map((slide, i) => {
          const active = i === index
          const TitleTag = active ? 'h1' : 'h2'
          return (
            <article
              key={`${slide.mediaTag}-${i}`}
              className={`blk-hero__slide${active ? ' is-active' : ''}`}
              aria-hidden={!active}
            >
              <div className="blk-hero__bg">
                <picture>
                  {slide.imageMobile && <source media="(max-width: 900px)" srcSet={slide.imageMobile} />}
                  <img
                    src={slide.image}
                    alt=""
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : undefined}
                    decoding="async"
                  />
                </picture>
              </div>
              <span className="blk-hero__scrim" aria-hidden="true" />
              <div className="blk-hero__grid">
                <div className="hero__content">
                  <div className="hero__eyebrow">{slide.eyebrow}</div>
                  <TitleTag className="hero__title">
                    {slide.title.map((line, k) => (
                      <span key={`${line}-${k}`}>
                        {line}
                        {k < slide.title.length - 1 && <br />}
                      </span>
                    ))}
                  </TitleTag>
                  {slide.desc && <p className="hero__desc">{slide.desc}</p>}
                  {(slide.primary || slide.secondary) && (
                    <div className="hero__cta">
                      {slide.primary && (
                        <Link className="btn btn--primary btn--lg" to={slide.primary.href}>
                          {slide.primary.label}
                        </Link>
                      )}
                      {slide.secondary && (
                        <Link className="btn btn--secondary btn--lg" to={slide.secondary.href}>
                          {slide.secondary.label}
                        </Link>
                      )}
                    </div>
                  )}
                  {slide.stats.length > 0 && (
                    <div className="hero__stats">
                      {slide.stats.map((stat, k) => (
                        <div className="hero__stat" key={`${stat.label}-${k}`}>
                          <b>{stat.value}</b>
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {total > 1 && (
        <>
          <button className="blk-hero__arrow blk-hero__arrow--prev" type="button" aria-label="上一张" onClick={() => go(index - 1)}>
            <IconChevronLeft />
          </button>
          <button className="blk-hero__arrow blk-hero__arrow--next" type="button" aria-label="下一张" onClick={() => go(index + 1)}>
            <IconChevronRight />
          </button>
          <div className="blk-hero__controls" role="tablist" aria-label="海报选择">
            {slides.map((slide, i) => (
              <button
                key={`dot-${slide.mediaTag}-${i}`}
                className={`blk-hero__dot${i === index ? ' is-active' : ''}`}
                type="button"
                role="tab"
                aria-label={`第 ${i + 1} 张`}
                aria-selected={i === index}
                onClick={() => go(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}