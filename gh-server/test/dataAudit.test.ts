/**
 * 数据审计测试：无来源承诺 / 效果数字必须被列出，产品参数不能被误报，
 * 标记「已核对 + 来源」的区块应被豁免，标记「待补」的区块整体列入。
 *
 * 纯函数测试，不启动服务、不写库。
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { auditBlock, auditPages } from '../src/lib/dataAudit'
import type { Block, Page } from '../src/data/contentTypes'

function block(id: string, type: Block['type'], props: Record<string, unknown>): Block {
  return { id, type, enabled: true, props }
}

describe('数据审计', () => {
  it('命中承诺词与效果数字', () => {
    const hits = auditBlock(
      block('b1', 'trustBar', {
        items: [
          { icon: 'box', text: '顺丰包邮', desc: '全国配送' },
          { icon: 'flask', text: '实测数据', desc: '方法与样本公开' },
        ],
      }),
    )
    assert.deepEqual(
      hits.map((hit) => hit.text),
      ['顺丰包邮'],
    )
    assert.equal(hits[0].reason, 'claim-without-source')
  })

  it('命中带单位的效果数字，但不误报产品参数', () => {
    const hits = auditBlock(
      block('b2', 'stats', {
        items: [
          { value: '12', unit: '所', label: '覆盖高校' },
          { value: '40', unit: '%', label: '调试耗时下降' },
          { value: '540', unit: 'Hz', label: '最高刷新率' },
          { value: '0.03', unit: 'ms', label: '响应时间' },
          { value: '26.5', unit: '英寸', label: '尺寸' },
        ],
      }),
    )
    assert.deepEqual(
      hits.map((hit) => hit.text),
      ['12所', '40%'],
    )
  })

  it('已核对且填写来源的区块豁免；待补区块整体列入', () => {
    const verified = auditBlock(
      block('b3', 'stats', { dataStatus: 'verified', dataSource: '测试记录 R-2026-11', items: [{ value: '12', unit: '所' }] }),
    )
    assert.equal(verified.length, 0)

    const pending = auditBlock(
      block('b4', 'stats', { dataStatus: 'pending', items: [{ value: '暂未统计', label: '覆盖高校' }] }),
    )
    assert.ok(pending.length > 0)
    assert.ok(pending.every((hit) => hit.reason === 'pending'))
  })

  it('功能规则描述（最多 N 款）不算数据承诺', () => {
    const hits = auditBlock(block('b6', 'text', { body: '选择最多 4 款同品类产品进行参数对比。' }))
    assert.equal(hits.length, 0)
  })

  it('按页面汇总并带上页面标识', () => {
    const page: Page = {
      key: 'business-cases',
      path: '/business/cases',
      title: '合作案例',
      blocks: [block('b5', 'cards', { items: [{ title: '48 小时内售罄' }] })],
    } as Page
    const items = auditPages([page])
    assert.equal(items.length, 1)
    assert.equal(items[0].pageKey, 'business-cases')
    assert.equal(items[0].pageTitle, '合作案例')
    assert.equal(items[0].blockId, 'b5')
  })
})
