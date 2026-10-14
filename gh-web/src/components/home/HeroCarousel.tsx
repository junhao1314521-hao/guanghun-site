import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { HeroSlide } from '../../api/home'
import { MEDIA } from '../../data/media'
import { prefersReducedMotion } from '../../lib/motion'
import { MediaImg } from '../ui/MediaImg'
import { DemoToast, useDemoToast } from '../ui/DemoToast'
import { IconChevronLeft, IconChevronRight } from '../ui/Icon'

const DURATION = 6000

/** 代码动效海报：Canvas 粒子连线（无 WebGL 依赖，纯 2D） */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = prefersReducedMotion()
    let width = 0
    let height = 0
    let dots: { x: number; y: number; vx: number; vy: number; r: number }[] = []

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width = canvas.width = Math.max(1, Math.floor(parent.clientWidth))
      height = canvas.height = Math.max(1, Math.floor(parent.clientHeight))
      const count = Math.min(70, Math.floor((width * height) / 22000))
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 1.6 + 0.6,
      }))
    }

    let raf = 0
    const frame = () => {
      ctx.clearRect(0, 0, width, height)
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        dot.x += dot.vx
        dot.y += dot.vy
        if (dot.x < 0 || dot.x > width) dot.vx *= -1
        if (dot.y < 0 || dot.y > height) dot.vy *= -1
        ctx.fillStyle = 'rgba(147,164,248,.85)'
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2)
        ctx.fill()
        for (let j = i + 1; j < dots.length; j++) {
          const other = dots[j]
          const dx = dot.x - other.x
          const dy = dot.y - other.y
          const dist = dx * dx + dy * dy
          if (dist < 14400) {
            ctx.strokeStyle = `rgba(91,117,245,${0.3 * (1 - dist / 14400)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(dot.x, dot.y)
            ctx.lineTo(other.x, other.y)
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    if (reduce) {
      ctx.fillStyle = 'rgba(91,117,245,.15)'
      ctx.fillRect(0, 0, width, height)
    } else {
      raf = requestAnimationFrame(frame)
    }
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <canvas className="hero__canvas" ref={canvasRef} />
}

/**
 * 首屏轮播：三张海报（图片 / 动画 / 代码动效），
 * 自动播放 + 箭头 + 指示器 + 左右方向键；悬停暂停。
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { action, notify, dismiss } = useDemoToast()

  const go = (next: number) => setIndex(((next % slides.length) + slides.length) % slides.length)

  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), DURATION)
    return () => window.clearInterval(timer)
  }, [paused, slides.length])

  return (
    <div
      className="stage hero"
      ref={containerRef}
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
      <div className="stage__glow" />

      <div className="hero__slides">
        {slides.map((slide, i) => {
          const active = i === index
          // 仅当前轮播页的主标题作为页面唯一 H1，其余轮播页保持 H2，避免重复 H1
          const TitleTag = active ? 'h1' : 'h2'
          return (
            <article
              key={slide.id}
              className={`hero__slide${active ? ' is-active' : ''}`}
              aria-label={`第 ${i + 1} 张，共 ${slides.length} 张`}
            >
              <div className="hero__media-layer">
                {slide.media.kind === 'image' && (
                  <div className="hero__bg hero__bg--image">
                    <MediaImg
                      className="hero__bg-img"
                      src={MEDIA.hero[slide.id as keyof typeof MEDIA.hero]}
                      alt=""
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                    />
                  </div>
                )}
                {slide.media.kind === 'motion' && (
                  <div className="hero__bg hero__bg--motion">
                    <MediaImg
                      className="hero__bg-img hero__bg-img--motion"
                      src={MEDIA.hero[slide.id as keyof typeof MEDIA.hero]}
                      alt=""
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                    />
                  </div>
                )}
                {slide.media.kind === 'canvas' && active && <ParticleCanvas />}
              </div>
              <div className="container hero__content">
                <div className="hero__grid">
                  <div>
                    <div className="hero__eyebrow" data-anim="0">
                      {slide.eyebrow}
                    </div>
                    <TitleTag className="hero__title" data-anim="1">
                      {slide.title.map((line, k) => (
                        <span key={line}>
                          {line}
                          {k < slide.title.length - 1 && <br />}
                        </span>
                      ))}
                    </TitleTag>
                    <p className="hero__desc" data-anim="2">
                      {slide.desc}
                    </p>
                    <div className="hero__cta" data-anim="3">
                      {slide.primaryTo ? (
                        <Link className="btn btn--primary btn--lg" to={slide.primaryTo}>
                          {slide.primary}
                        </Link>
                      ) : (
                        <button className="btn btn--primary btn--lg" type="button" onClick={() => notify(slide.primary)}>
                          {slide.primary}
                        </button>
                      )}
                      {slide.secondaryTo ? (
                        <Link
                          className="btn btn--secondary btn--lg"
                          to={slide.secondaryTo}
                          style={{ borderColor: 'rgba(255, 255, 255, 0.24)', color: 'var(--gh-neutral-50)' }}
                        >
                          {slide.secondary}
                        </Link>
                      ) : (
                        <button
                          className="btn btn--secondary btn--lg"
                          type="button"
                          style={{ borderColor: 'rgba(255, 255, 255, 0.24)', color: 'var(--gh-neutral-50)' }}
                          onClick={() => notify(slide.secondary)}
                        >
                          {slide.secondary}
                        </button>
                      )}
                    </div>
                    <div className="hero__stats" data-anim="4">
                      {slide.stats.map((stat) => (
                        <div className="hero__stat" key={stat.label}>
                          <b>{stat.value}</b>
                          <span>{stat.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hero__media media-ph">
                    <MediaImg
                      className="hero-media-img"
                      src={MEDIA.heroProduct}
                      alt="光魂无线鼠标产品主视觉"
                      variant="mouse"
                      label="产品主视觉"
                      loading={i === 0 ? 'eager' : 'lazy'}
                      fetchPriority={i === 0 ? 'high' : undefined}
                    />
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <button className="hero__arrow hero__arrow--prev" type="button" aria-label="上一张" onClick={() => go(index - 1)}>
        <IconChevronLeft />
      </button>
      <button className="hero__arrow hero__arrow--next" type="button" aria-label="下一张" onClick={() => go(index + 1)}>
        <IconChevronRight />
      </button>

      <div className="hero__dots" role="tablist" aria-label="海报选择">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            className={`hero__dot${i === index ? ' is-active' : ''}${i === index && !paused ? ' is-running' : ''}`}
            type="button"
            role="tab"
            aria-label={`第 ${i + 1} 张`}
            aria-selected={i === index}
            onClick={() => go(i)}
          >
            <span className="hero__dot-fill" />
          </button>
        ))}
      </div>

      <DemoToast action={action} onDismiss={dismiss} />
    </div>
  )
}