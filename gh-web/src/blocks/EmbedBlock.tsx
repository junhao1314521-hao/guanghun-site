/**
 * 19. embed 代码嵌入模块（自定义模块 · 自由内容区块 · 沙箱）
 * props: { code: string; height: number; allowScripts: boolean; videoUrl?: string; poster?: string }
 *
 * - 渲染为 `<iframe sandbox="allow-scripts" srcdoc={...}>`：脚本可运行，但**始终不加
 *   `allow-same-origin`**，因此无法访问主站 DOM / Cookie / localStorage，做到与主站隔离；
 * - `allowScripts=false` 时 sandbox 置空串（`sandbox=""`），完全禁用脚本；
 * - `videoUrl` 填写后以原生 `<video controls>` 渲染，**同样置于沙箱 iframe 内**（与 code
 *   模式保持一致的隔离策略，二选一已说明：选择「沙箱内渲染」）。
 */
import { useMemo } from 'react'
import { asBool, asNumber, asString } from './blockUtils'

/** 属性值转义，避免视频地址逃逸出 src 属性 */
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 媒体地址校验：放行 http/https/blob、相对路径与 data:(video|audio|image)，拒绝 javascript: 等 */
function isSafeMediaUrl(value: string): boolean {
  // 去除空白 / 控制字符，破坏 `java\tscript:` 之类的绕过形态（控制字符检测为有意为之）
  // eslint-disable-next-line no-control-regex
  const v = value.replace(/[\u0000-\u0020\u007f\u00a0]+/g, '').toLowerCase()
  if (!v) return false
  if (v.startsWith('javascript:') || v.startsWith('vbscript:')) return false
  if (!/^[a-z][a-z0-9+.-]*:/.test(v)) return true // 相对路径 / 协议相对
  return /^(https?:|blob:|data:(video|audio|image)\/)/.test(v)
}

/** 生成「原生视频」沙箱文档 */
function buildVideoDoc(videoUrl: string, poster: string): string {
  const posterAttr = poster ? ` poster="${escapeAttr(poster)}"` : ''
  return (
    '<!doctype html><html><head><meta charset="utf-8">' +
    '<style>html,body{margin:0;height:100%;background:#000}' +
    'video{width:100%;height:100%;display:block;object-fit:contain}</style></head>' +
    `<body><video src="${escapeAttr(videoUrl)}"${posterAttr} controls preload="metadata"></video></body></html>`
  )
}

export function EmbedBlock({ props }: { props: Record<string, unknown> }) {
  const code = asString(props.code)
  const height = asNumber(props.height, 360)
  const allowScripts = asBool(props.allowScripts, false)
  const videoUrl = asString(props.videoUrl)
  const poster = asString(props.poster)

  const useVideo = Boolean(videoUrl) && isSafeMediaUrl(videoUrl)
  // code 模式尊重 allowScripts；视频模式无需脚本，同样固化在沙箱内
  const sandbox = allowScripts ? 'allow-scripts' : ''
  const srcDoc = useMemo(
    () => (useVideo ? buildVideoDoc(videoUrl, poster) : code),
    [useVideo, videoUrl, poster, code],
  )

  if (!useVideo && !code.trim()) return null

  return (
    <div className="blk-embed">
      <iframe
        className="blk-embed__frame"
        title={useVideo ? '视频嵌入' : '代码嵌入'}
        sandbox={sandbox}
        srcDoc={srcDoc}
        style={{ height }}
      />
    </div>
  )
}
