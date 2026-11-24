/**
 * i18n 测试：默认语言、缺省回退、未就绪语言的「建设中」提示与门禁行为。
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_LANG, I18nProvider, READY_LANGS, useI18n } from '../src/i18n'

/** 产品列表页（ProductGridBlock）用到的展示文案键；英文缺译会回退中文，由用例拦截 */
const PRODUCT_KEYS = [
  'product.count',
  'product.sort',
  'product.filter',
  'product.filterSelected',
  'product.clear',
  'product.category',
  'product.connection',
  'product.price',
  'product.stock',
  'product.all',
  'product.cat.oled',
  'product.cat.dual',
  'product.cat.ips',
  'product.cat.acc',
  'product.price.any',
  'product.price.lt1000',
  'product.price.mid',
  'product.price.gt3000',
  'product.status.instock',
  'product.status.oos',
  'product.sort.default',
  'product.sort.asc',
  'product.sort.desc',
  'product.sort.newest',
  'product.empty',
  'product.askPrice',
  'product.cta',
  'product.addCompare',
  'product.viewDetail',
  'product.compareMax',
  'product.chipScene',
  'product.chipCategory',
  'product.chipConn',
  'product.chipPrice',
  'product.chipStatus',
  'product.removeChip',
  'product.compareGuideTitle',
  'product.compareGuideDesc',
  'product.compareStart',
  'product.errorTitle',
  'product.errorDesc',
  'product.errorRetry',
  'product.pagePrev',
  'product.pageNext',
  'product.none',
  'product.seriesTitle',
  'product.seriesDesc',
  'product.seriesCount',
  'product.seriesDefaultDesc',
  'product.seriesDesc.oled',
  'product.seriesDesc.dual',
  'product.seriesDesc.ips',
  'product.seriesDesc.acc',
  'product.compareSelected',
  'product.compareIncompatible',
  'product.compareIncompatibleDesc',
  'product.compareNeedOne',
  'product.compareAtMax',
  'product.loading',
  'product.flag.hot',
  'product.flag.dual',
  'product.flag.entry',
  'product.flag.flagship',
  'product.flag.4k',
  'product.flag.highRefresh',
  'product.scene.01',
  'product.scene.02',
  'product.scene.03',
  'product.scene.04',
]

function Probe() {
  const { lang, t, setLang, notice, dismissNotice } = useI18n()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="title">{t('notFound.title')}</span>
      <span data-testid="interp">{t('lang.notice', { lang: 'English' })}</span>
      <span data-testid="fallback">{t('__nope__')}</span>
      <span data-testid="products">
        {PRODUCT_KEYS.map((key) =>
          t(key, { n: 1, max: 4, model: 'M', name: 'N', label: 'L', msg: 'E' }),
        ).join(' | ')}
      </span>
      <span data-testid="notice">{notice ?? 'none'}</span>
      <button type="button" onClick={() => setLang('en')}>
        to-en
      </button>
      <button type="button" onClick={() => setLang('zh-HK')}>
        to-hk
      </button>
      <button type="button" onClick={() => setLang('zh-CN')}>
        to-zh
      </button>
      <button type="button" onClick={() => dismissNotice()}>
        dismiss
      </button>
    </div>
  )
}

const setup = () => render(<Probe />, { wrapper: I18nProvider })

beforeEach(() => localStorage.clear())

describe('i18n', () => {
  it('默认语言为简体中文且 t() 返回中文文案', () => {
    setup()
    expect(DEFAULT_LANG).toBe('zh-CN')
    expect(screen.getByTestId('lang').textContent).toBe('zh-CN')
    expect(screen.getByTestId('title').textContent).toBe('页面未找到')
  })

  it('t() 支持插值，未知 key 回退为 key 本身', () => {
    setup()
    expect(screen.getByTestId('interp').textContent).toBe('「English」版本内容尚在建设中，页面暂以简体中文展示。')
    expect(screen.getByTestId('fallback').textContent).toBe('__nope__')
  })

  it('英文已就绪：切换到 en 后语言生效且文案为英文', () => {
    setup()
    expect(READY_LANGS).toContain('en')

    fireEvent.click(screen.getByText('to-en'))

    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('title').textContent).toBe('Page not found')
    expect(screen.getByTestId('notice').textContent).toBe('none')
  })

  it('英文产品列表文案全部就绪（无中文回退残留）', () => {
    setup()
    fireEvent.click(screen.getByText('to-en'))
    const text = screen.getByTestId('products').textContent ?? ''
    // 任一键缺英文译文都会回退中文，这里直接拦截中文残留
    expect(text).not.toMatch(/[\u4e00-\u9fff]/)
    expect(text).toContain('Dual-mode high refresh')
    expect(text).toContain('In stock')
    expect(text).toContain('Compare')
  })

  it('英文选择持久化到 localStorage', () => {
    setup()
    fireEvent.click(screen.getByText('to-en'))
    expect(localStorage.getItem('gh-lang')).toBe('en')
  })

  it('切换到未就绪语言（zh-HK）：语言不变，仅给出「建设中」提示（不拿中文冒充）', () => {
    setup()
    expect(READY_LANGS).not.toContain('zh-HK')

    fireEvent.click(screen.getByText('to-hk'))

    expect(screen.getByTestId('lang').textContent).toBe('zh-CN')
    expect(screen.getByTestId('notice').textContent).toContain('繁體中文')
    expect(screen.getByTestId('notice').textContent).toContain('建设中')
  })

  it('提示可关闭', () => {
    setup()
    fireEvent.click(screen.getByText('to-hk'))
    expect(screen.getByTestId('notice').textContent).not.toBe('none')

    fireEvent.click(screen.getByText('dismiss'))
    expect(screen.getByTestId('notice').textContent).toBe('none')
  })
})