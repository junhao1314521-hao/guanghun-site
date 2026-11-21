/**
 * 壁纸下载档位推导测试：
 * - 真实 4K 源的作品必须返回 4K / 2K / 1080p 三档，且按像素从大到小；
 * - 文件不在标准档位后缀上时，回落到数据里的原图单档，避免前台下载按钮失效。
 *
 * 运行：npm test
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { wallpaperVariantsOf } from '../src/lib/wallpaperVariants'

describe('壁纸下载档位', () => {
  it('真实 4K 作品返回三档并按尺寸降序', () => {
    const variants = wallpaperVariantsOf({
      fileUrl: '/media/wallpapers/star-sea-horizon-2560.jpg',
      width: 2560,
      height: 1440,
      size: '250 KB',
    })
    assert.deepEqual(
      variants.map((variant) => variant.key),
      ['4k', '2k', 'fhd'],
    )
    assert.deepEqual(
      variants.map((variant) => `${variant.width}x${variant.height}`),
      ['3840x2160', '2560x1440', '1920x1080'],
    )
    assert.ok(variants.every((variant) => /^(KB|MB)$/.test(variant.size.split(' ').pop() ?? '')))
  })

  it('文件全部缺失时回落到原图单档', () => {
    const variants = wallpaperVariantsOf({
      fileUrl: '/media/wallpapers/gh-missing-2560.jpg',
      width: 2560,
      height: 1440,
      size: '1.2 MB',
    })
    assert.equal(variants.length, 1)
    assert.equal(variants[0].url, '/media/wallpapers/gh-missing-2560.jpg')
    assert.equal(variants[0].size, '1.2 MB')
  })
})
