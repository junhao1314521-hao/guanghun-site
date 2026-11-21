/**
 * 兜底数据防漂移：前端 `src/data/*` 与后端 `gh-server/src/data/*` 是两份可独立编辑的同名数据，
 * 传输器正常时不使用前端副本，但组件（如产品矩阵的场景图）与降级路径会直接读取。
 * 历史上出现过「只改一处、线上与仓库不一致」，故在此锁定用户可见文案字段：
 * 任何一侧单独改动都会让本用例失败，迫使两端同时更新。
 *
 * 只比对文案与标识，不比对图片路径 / 排版参数（这些允许按端差异存在）。
 */
import { describe, expect, it } from 'vitest'
import * as webBusiness from '../src/data/business-extra'
import * as webHome from '../src/data/home'
import * as srvBusiness from '../../gh-server/src/data/business-extra'
import * as srvHome from '../../gh-server/src/data/home'

/** 首屏海报：文案与跳转目标必须一致 */
const heroCopy = (slides: typeof webHome.HERO_SLIDES) =>
  slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    desc: slide.desc,
    primary: slide.primary,
    secondary: slide.secondary,
    primaryTo: slide.primaryTo,
    secondaryTo: slide.secondaryTo,
  }))

describe('首页兜底数据与后端 seed 一致', () => {
  it('首屏轮播文案', () => {
    expect(heroCopy(webHome.HERO_SLIDES)).toEqual(heroCopy(srvHome.HERO_SLIDES))
  })

  it('品牌数据 / 服务入口 / 场景标题', () => {
    expect(webHome.BRAND_STATS.map((item) => ({ value: item.value, label: item.label }))).toEqual(
      srvHome.BRAND_STATS.map((item) => ({ value: item.value, label: item.label })),
    )
    expect(webHome.SERVICE_ENTRIES.map((item) => ({ id: item.id, title: item.title, desc: item.desc }))).toEqual(
      srvHome.SERVICE_ENTRIES.map((item) => ({ id: item.id, title: item.title, desc: item.desc })),
    )
    expect(webHome.SCENES.map((item) => ({ id: item.id, title: item.title, desc: item.desc }))).toEqual(
      srvHome.SCENES.map((item) => ({ id: item.id, title: item.title, desc: item.desc })),
    )
    expect(webHome.COOP_TAGS).toEqual(srvHome.COOP_TAGS)
  })
})

describe('商业合作兜底数据与后端 seed 一致', () => {
  it('合作案例摘要', () => {
    expect(webBusiness.BIZ_CASES.map((item) => ({ id: item.id, title: item.title, summary: item.summary }))).toEqual(
      srvBusiness.BIZ_CASES.map((item) => ({ id: item.id, title: item.title, summary: item.summary })),
    )
  })

  it('合作案例详情结果字段（无来源数字隐患点）', () => {
    const detailCopy = (map: Record<string, { results: Array<{ label: string; value: string }> }>) =>
      Object.entries(map).map(([id, detail]) => ({ id, results: detail.results }))
    expect(detailCopy(webBusiness.BIZ_CASE_DETAILS)).toEqual(detailCopy(srvBusiness.BIZ_CASE_DETAILS))
  })

  it('合作场景标题与说明', () => {
    expect(webBusiness.BIZ_SCENES.map((item) => ({ id: item.id, title: item.title, desc: item.desc }))).toEqual(
      srvBusiness.BIZ_SCENES.map((item) => ({ id: item.id, title: item.title, desc: item.desc })),
    )
  })
})
