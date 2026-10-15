/**
 * 下线级联 · 链接存活判断与 SafeLink 组件测试。
 * ============================================================
 * 覆盖：
 * - `isHrefLive` 纯函数规则：站内路径按停用集合判断（忽略 query / hash、支持 :param 模板），
 *   外链 / 锚点 / 空值一律放行；
 * - `<SafeLink>`：目标为已停用站内页时不渲染链接；在线页 / 外链正常渲染。
 *
 * 通过 mock `api/content.fetchPages` 固定内容库返回（/faq 已停用），避免真实请求。
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/api/content', () => ({
  fetchPages: () =>
    Promise.resolve({
      items: [
        { key: 'home', path: '/', title: '首页', blockCount: 1, updatedAt: '', enabled: true },
        { key: 'faq', path: '/faq', title: '常见问题', blockCount: 1, updatedAt: '', enabled: false },
      ],
      total: 2,
    }),
  fetchPage: () => Promise.reject(new Error('unused')),
  fetchSite: () => Promise.reject(new Error('unused')),
  fetchBlockTypes: () => Promise.resolve([]),
}))

import { SafeLink } from '../src/components/ui/SafeLink'
import { isHrefLive, setDisabledPages } from '../src/lib/sitePages'

describe('isHrefLive（链接存活判断，纯函数）', () => {
  beforeEach(() => {
    setDisabledPages([
      { key: 'faq', path: '/faq', title: '常见问题', blockCount: 0, updatedAt: '', enabled: false },
      { key: 'brand-x', path: '/brand/:slug', title: '品牌', blockCount: 0, updatedAt: '', enabled: false },
      { key: 'home', path: '/', title: '首页', blockCount: 0, updatedAt: '', enabled: true },
    ])
  })

  it('停用的站内页 → false（忽略 query / hash）', () => {
    expect(isHrefLive('/faq')).toBe(false)
    expect(isHrefLive('/faq?category=install')).toBe(false)
    expect(isHrefLive('/faq#top')).toBe(false)
  })

  it('模板页停用 → 命中同构路径；在线页 → true', () => {
    expect(isHrefLive('/brand/guanghun')).toBe(false)
    expect(isHrefLive('/brand/lab')).toBe(false)
    expect(isHrefLive('/about')).toBe(true)
    expect(isHrefLive('/faq/123')).toBe(true)
  })

  it('外链 / 锚点 / 邮件 / 电话 / 空值 → 一律放行', () => {
    expect(isHrefLive('https://example.com/x')).toBe(true)
    expect(isHrefLive('mailto:a@b.com')).toBe(true)
    expect(isHrefLive('tel:4008208820')).toBe(true)
    expect(isHrefLive('#section')).toBe(true)
    expect(isHrefLive('//cdn.example.com/a.png')).toBe(true)
    expect(isHrefLive('')).toBe(true)
    expect(isHrefLive(undefined)).toBe(true)
  })
})

describe('SafeLink（停用链接不渲染）', () => {
  it('目标为已停用页面 → 不渲染链接元素', async () => {
    render(
      <MemoryRouter>
        <SafeLink to="/faq">常见问题</SafeLink>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.queryByText('常见问题')).toBeNull())
  })

  it('在线站内页 → 渲染可点链接', async () => {
    render(
      <MemoryRouter>
        <SafeLink to="/about">关于</SafeLink>
      </MemoryRouter>,
    )
    const link = await screen.findByText('关于')
    expect(link.closest('a')?.getAttribute('href')).toBe('/about')
  })

  it('外链 → 正常渲染（不参与停用过滤）', async () => {
    render(
      <MemoryRouter>
        <SafeLink to="https://example.com/x">外链</SafeLink>
      </MemoryRouter>,
    )
    const link = await screen.findByText('外链')
    expect(link.closest('a')?.getAttribute('href')).toBe('https://example.com/x')
  })
})
