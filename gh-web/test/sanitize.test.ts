/**
 * 富文本白名单净化：后台粘贴 / 插入表格后，前台渲染必须保留排版但不放行危险内容。
 */
import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from '../src/blocks/sanitize'

describe('富文本净化', () => {
  it('保留粘贴进来的基础排版（加粗 / 斜体 / 列表）', () => {
    const html = sanitizeRichText('<p><strong>加粗</strong>与<em>斜体</em></p><ul><li>一项</li></ul>')
    expect(html).toContain('<strong>加粗</strong>')
    expect(html).toContain('<em>斜体</em>')
    expect(html).toContain('<ul><li>一项</li></ul>')
  })

  it('保留表格结构（规格 / 对比表）', () => {
    const html = sanitizeRichText(
      '<table><thead><tr><th>型号</th><th>分辨率</th></tr></thead><tbody><tr><td>W54</td><td>2K</td></tr></tbody></table>',
    )
    expect(html).toContain('<table>')
    expect(html).toContain('<th>型号</th>')
    expect(html).toContain('<td>W54</td>')
  })

  it('剔除脚本 / 事件属性 / javascript: 链接', () => {
    const html = sanitizeRichText(
      '<p onclick="steal()">正文<script>alert(1)</script><a href="javascript:alert(1)">点我</a></p>',
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('javascript:')
    expect(html).toContain('正文')
  })

  it('表格单元格里的危险属性同样被清理', () => {
    const html = sanitizeRichText('<table><tr><td onmouseover="x()">1</td></tr></table>')
    expect(html).not.toContain('onmouseover')
    expect(html).toContain('<td>1</td>')
  })
})
