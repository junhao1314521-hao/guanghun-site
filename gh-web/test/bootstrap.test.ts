/**
 * 首屏启动数据读取：服务端注入的公告条用于首帧渲染，结构不合法时必须安全回退，
 * 不能让脏数据把公告条渲染成空壳或异常高度。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { readSiteBootstrap } from '../src/lib/bootstrap'

afterEach(() => {
  delete (window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__
})

describe('readSiteBootstrap', () => {
  it('合法公告按原样读出', () => {
    ;(window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__ = {
      announcement: { text: '27X1QE 旗舰上市', href: '/products/gh-54027x1qe', dismissible: true },
    }
    expect(readSiteBootstrap()).toEqual({
      announcement: { text: '27X1QE 旗舰上市', href: '/products/gh-54027x1qe', dismissible: true },
    })
  })

  it('无公告 / 文案为空 → announcement 为 null', () => {
    ;(window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__ = { announcement: null }
    expect(readSiteBootstrap()).toEqual({ announcement: null })
    ;(window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__ = { announcement: { text: '   ' } }
    expect(readSiteBootstrap()).toEqual({ announcement: null })
  })

  it('结构不合法（非对象 / 文案非字符串 / href 非字符串）时安全处理', () => {
    expect(readSiteBootstrap()).toBeNull()
    ;(window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__ = 'x'
    expect(readSiteBootstrap()).toBeNull()
    ;(window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__ = { announcement: { text: 123 } }
    expect(readSiteBootstrap()).toEqual({ announcement: null })
    ;(window as unknown as { __GH_BOOTSTRAP__?: unknown }).__GH_BOOTSTRAP__ = { announcement: { text: '公告', href: 42 } }
    expect(readSiteBootstrap()).toEqual({ announcement: { text: '公告', href: undefined, dismissible: false } })
  })
})
