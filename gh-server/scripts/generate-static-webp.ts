/**
 * 构建期静态图片 WebP 转换。
 * ============================================================
 * 扫描前端构建产物（默认 `gh-web/dist`），为体积超过阈值的 JPG / PNG 生成同名 `.webp`
 * （`foo.jpg` → `foo.webp`），原图保留作为不支持 WebP 的兜底。
 *
 * 服务端 `app.ts` 在静态托管前做内容协商：请求 `foo.jpg` 且 `Accept` 含 `image/webp`
 * 时返回 `foo.webp`，否则返回原图，因此前端引用与后台已存地址都无需改动。
 *
 * 只在转换后体积更小时写入，避免个别图片 WebP 反而更大。
 * 用法：`npx tsx scripts/generate-static-webp.ts [distDir]`
 */
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

/** 小于该体积的图片不转换（图标、小缩略图收益有限） */
const MIN_BYTES = 30_000
const QUALITY = 78
const BITMAP = /\.(jpe?g|png)$/i

type Summary = { converted: number; skipped: number; savedBytes: number }

async function convertFile(file: string, summary: Summary): Promise<void> {
  const size = statSync(file).size
  if (size < MIN_BYTES) return
  const target = file.replace(BITMAP, '.webp')
  if (existsSync(target)) {
    summary.skipped += 1
    return
  }
  try {
    const buffer = await sharp(file).webp({ quality: QUALITY }).toBuffer()
    if (buffer.length >= size) {
      summary.skipped += 1
      return
    }
    writeFileSync(target, buffer)
    summary.converted += 1
    summary.savedBytes += size - buffer.length
  } catch (error) {
    summary.skipped += 1
    console.warn(`[webp] 跳过 ${path.basename(file)}：${String(error)}`)
  }
}

async function walk(dir: string, summary: Summary): Promise<void> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) await walk(full, summary)
    else if (entry.isFile() && BITMAP.test(entry.name)) await convertFile(full, summary)
  }
}

const dir = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, '../../gh-web/dist'))
if (!existsSync(dir)) {
  console.error(`[webp] 目录不存在：${dir}`)
  process.exit(1)
}

const summary: Summary = { converted: 0, skipped: 0, savedBytes: 0 }
await walk(dir, summary)
console.log(
  `[webp] 完成：转换 ${summary.converted} 张，跳过 ${summary.skipped} 张，节省 ${(summary.savedBytes / 1024 / 1024).toFixed(2)} MB`,
)
