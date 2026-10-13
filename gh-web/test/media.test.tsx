/**
 * 素材占位层测试：守护「无破图、无外链依赖、覆盖齐全」这三条硬约束。
 *
 * 背景：正式素材未到位前，所有视觉位由 `data/media.ts` 的 `MEDIA` 映射提供**本地内联 SVG 占位**。
 * 一旦有人误把某个视觉位改成外链、漏掉新增产品、或回退分支被改坏，本测试会失败。
 */
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MEDIA } from '../src/data/media'
import { PRODUCTS } from '../src/data/products'
import { MediaImg } from '../src/components/ui/MediaImg'
import type { DeviceVariant } from '../src/components/ui/DeviceArt'

const VARIANTS: DeviceVariant[] = ['mouse', 'keyboard', 'headset', 'pad']

/** 展开所有视觉位为 [路径, 值] 便于统一断言 */
function flattenMedia(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  const walk = (prefix: string, value: unknown): void => {
    if (typeof value === 'string') out.push([prefix, value])
    else if (Array.isArray(value)) value.forEach((v, i) => walk(`${prefix}[${i}]`, v))
    else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(`${prefix}.${k}`, v)
    }
  }
  walk('MEDIA', MEDIA)
  return out
}

const ALL = flattenMedia()

describe('MEDIA：全部视觉位为本地内联 SVG（无外链、无破图风险）', () => {
  it('每个视觉位都是 data:image/svg+xml 且非 http(s) 外链', () => {
    expect(ALL.length).toBeGreaterThan(0)
    for (const [path, value] of ALL) {
      expect(value.startsWith('data:image/svg+xml,'), `${path} 应为内联 SVG data URI`).toBe(true)
      expect(/^https?:/.test(value), `${path} 不应为外链（离线可用）`).toBe(false)
    }
  })

  it('每张 SVG 均可解码且带固有尺寸（viewBox + width/height，避免 <img> 塌陷）', () => {
    for (const [path, value] of ALL) {
      const svg = decodeURIComponent(value.slice('data:image/svg+xml,'.length))
      expect(svg.startsWith('<svg'), `${path} 应可解析为 SVG`).toBe(true)
      expect(svg.includes('viewBox='), `${path} 应含 viewBox`).toBe(true)
      expect(svg.includes('width='), `${path} 应含 width`).toBe(true)
      expect(svg.includes('height='), `${path} 应含 height`).toBe(true)
    }
  })

  it('关键视觉位齐全', () => {
    expect(MEDIA.hero.s0).toBeTruthy()
    expect(MEDIA.hero.s1).toBeTruthy()
    expect(MEDIA.heroProduct).toBeTruthy()
    expect(Object.keys(MEDIA.scene)).toHaveLength(4)
    expect(MEDIA.center.hero).toBeTruthy()
    expect(MEDIA.center.feature1).toBeTruthy()
    expect(MEDIA.center.feature2).toBeTruthy()
    expect(MEDIA.about.brand).toBeTruthy()
    expect(MEDIA.about.lab).toBeTruthy()
    expect(MEDIA.businessCase.length).toBeGreaterThanOrEqual(1)
  })

  it('产品图覆盖全部在售产品（新增产品忘补占位会失败）', () => {
    const ids = PRODUCTS.map((p) => p.id)
    for (const id of ids) {
      expect(MEDIA.product[id], `缺少产品占位图：${id}`).toBeTruthy()
    }
    expect(Object.keys(MEDIA.product).sort()).toEqual([...ids].sort())
  })

  it('详情页相册覆盖全部设备类型，且每类含 4 个视角', () => {
    for (const v of VARIANTS) {
      expect(MEDIA.views[v]).toBeTruthy()
      expect(MEDIA.views[v]).toHaveLength(4)
    }
  })
})

describe('MediaImg：正常渲染与失败回退', () => {
  it('正常态渲染 <img> 并透传 src / alt / className / loading', () => {
    const { container } = render(
      <MediaImg src="data:image/svg+xml,<svg/>" alt="示例图" className="demo-img" loading="eager" />,
    )
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.getAttribute('alt')).toBe('示例图')
    expect(img.getAttribute('class')).toBe('demo-img')
    expect(img.getAttribute('loading')).toBe('eager')
  })

  it('加载失败 + 有 variant → 回退矢量图（svg，非破图 img）', () => {
    const { container } = render(<MediaImg src="/missing.png" alt="" variant="mouse" label="鼠标占位" />)
    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).toBeNull()
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg!.getAttribute('aria-label')).toBe('鼠标占位')
  })

  it('加载失败 + 无 variant → 不渲染 img（保留容器底色，不出现破图）', () => {
    const { container } = render(<MediaImg src="/missing.png" alt="" />)
    fireEvent.error(container.querySelector('img')!)

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).toBeNull()
    expect(container.innerHTML).toBe('')
  })
})