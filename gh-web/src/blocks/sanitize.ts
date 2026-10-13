/**
 * 前端白名单净化（契约「自定义模块」安全规则；零依赖，基于 DOMParser）。
 * ============================================================
 * 用途：`richText` 与 `html` 两类区块在**渲染时**对原始 HTML 做白名单净化，
 * 再交给 `dangerouslySetInnerHTML`。内容库只存原文，净化永远在渲染端执行
 * （见下方「取舍」说明）。
 *
 * 取舍（存原文 / 渲染时净化）：
 * - 存原文：后台保留用户输入的可读源码，便于二次编辑，不破坏数据可逆性；
 * - 渲染时净化：所有输出路径（前台页面、装修器预览）必须经过本模块，
 *   白名单是唯一可信边界；即便内容库 / 接口被写入脏数据，也不会被直接执行。
 *
 * 安全边界：
 * - 一律整块剔除：script / iframe / object / embed / form / input 等可执行或交互元素；
 * - 一律剔除：所有 `on*` 事件属性、`javascript:` / `vbscript:` 协议、`data:text/html`；
 * - `a[href]`：仅放行 http / https / mailto / 相对路径（含锚点、查询、协议相对）；
 * - `img[src]`：仅放行 http / https / 相对路径 / `data:image/*`；
 * - `style` 属性与 `<style>` 标签：剔除含 expression / javascript: / @import / behavior 等危险表达式。
 */

/** richText 允许的标签（基本排版 + 图片 / GIF） */
const RICH_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'a',
  'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'img', 'figure', 'figcaption', 'span', 'hr',
]

/** html 允许的标签（richText 之上追加：表格 / 分块 / 样式） */
const HTML_TAGS = [
  ...RICH_TAGS,
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'section', 'style',
]

/**
 * 一律整块剔除（连同其内容）的标签：脚本 / 可执行 / 表单 / 资源声明。
 * 注意 `video` 也被剔除——需要视频请用 `embed` 区块的 `videoUrl`（沙箱内渲染）。
 */
const DROP_TAGS = new Set([
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'select',
  'textarea', 'option', 'optgroup', 'link', 'meta', 'base', 'basefont', 'applet',
  'frame', 'frameset', 'noscript', 'template', 'portal',
  'audio', 'video', 'source', 'track', 'canvas', 'svg', 'math',
])

/** 每个标签允许保留的属性（未列出者一律剔除，故 `on*` 天然被移除） */
const TAG_ATTRS: Record<string, string[]> = {
  a: ['href', 'target', 'rel', 'title'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  table: ['width', 'align'],
  td: ['colspan', 'rowspan', 'align', 'valign', 'width'],
  th: ['colspan', 'rowspan', 'align', 'valign', 'width', 'scope'],
  ol: ['start', 'type'],
  li: ['value'],
}

/** 净化上下文 */
type Ctx = { allow: Set<string>; drop: Set<string>; allowStyle: boolean }

/** 匹配「带协议」的绝对地址（http:、javascript: 等） */
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/

/** 危险 CSS 表达式 */
const DANGEROUS_CSS = /(expression\s*\(|javascript:|vbscript:|behavio[u]?r\s*:|@import|binding\s*:)/

/**
 * 判断 URL 是否放行。
 * 先去除全部空白 / 控制字符，破坏 `java\tscript:`、`&#106;` 之外的空白绕过形态。
 */
function urlAllowed(raw: string, allowDataImage: boolean): boolean {
  if (typeof raw !== 'string') return false
  // 去除全部空白 / 控制字符，破坏 `java\tscript:` 之类的绕过形态（控制字符检测为有意为之）
  // eslint-disable-next-line no-control-regex
  const value = raw.replace(/[\u0000-\u0020\u007f\u00a0]+/g, '').toLowerCase()
  if (!value) return false
  if (value.startsWith('javascript:') || value.startsWith('vbscript:')) return false
  if (value.startsWith('data:')) return allowDataImage && value.startsWith('data:image/')
  // 无协议 → 相对路径 / 协议相对 / 锚点 / 查询，放行
  if (!SCHEME_RE.test(value)) return true
  const scheme = value.slice(0, value.indexOf(':'))
  return scheme === 'http' || scheme === 'https' || scheme === 'mailto'
}

/** 样式文本是否安全 */
function cssTextSafe(css: string): boolean {
  return !DANGEROUS_CSS.test(css.toLowerCase())
}

/** `<style>` 文本内容的清理：去掉 `</style>` 逃逸与 @import */
function sanitizeStyleText(css: string): string {
  return css.replace(/<\/style/gi, '').replace(/@import[^;]*;?/gi, '')
}

/** 用子节点替换元素本身（保留其文本内容），用于不在白名单内的普通容器 */
function unwrap(el: Element): void {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

/** 属性过滤：仅保留白名单属性，并校验 URL / 样式 */
function sanitizeAttrs(el: Element, ctx: Ctx): void {
  const tag = el.tagName.toLowerCase()
  const allowed = new Set(TAG_ATTRS[tag] ?? [])
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    let keep: boolean
    if (name === 'style') {
      keep = ctx.allowStyle && cssTextSafe(attr.value)
    } else if (allowed.has(name)) {
      if (name === 'href') keep = urlAllowed(attr.value, false)
      else if (name === 'src') keep = urlAllowed(attr.value, true)
      else keep = !name.startsWith('on')
    } else {
      keep = false
    }
    if (!keep) el.removeAttribute(attr.name)
  }
  if (tag === 'a' && el.getAttribute('target')) el.setAttribute('rel', 'noopener noreferrer')
}

/** 递归清理子树 */
function walk(parent: Element, ctx: Ctx): void {
  for (const node of Array.from(parent.childNodes)) {
    if (node.nodeType === 3 /* TEXT_NODE */) continue
    if (node.nodeType !== 1 /* ELEMENT_NODE */) {
      node.parentNode?.removeChild(node) // 注释 / CDATA / 其它：直接丢弃
      continue
    }
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'style' && ctx.allowStyle) {
      el.textContent = sanitizeStyleText(el.textContent ?? '')
      continue
    }
    if (ctx.drop.has(tag)) {
      el.parentNode?.removeChild(el)
      continue
    }
    if (!ctx.allow.has(tag)) {
      walk(el, ctx) // 先净化子树（保留文本），再拆壳
      unwrap(el)
      continue
    }
    sanitizeAttrs(el, ctx)
    walk(el, ctx)
  }
}

/** 通用净化入口 */
function sanitize(html: string, tags: string[], allowStyle: boolean): string {
  if (!html || typeof html !== 'string') return ''
  // 无 DOM 环境（如纯 Node）：失败关闭，返回空串，绝不放行未净化内容
  if (typeof DOMParser === 'undefined') return ''
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  } catch {
    return ''
  }
  const body = doc.body
  if (!body) return ''
  const ctx: Ctx = {
    allow: new Set(tags),
    drop: new Set(allowStyle ? DROP_TAGS : [...DROP_TAGS, 'style']),
    allowStyle,
  }
  walk(body, ctx)
  return body.innerHTML
}

/** 富文本模块净化（richText，§自定义模块） */
export function sanitizeRichText(html: string): string {
  return sanitize(html, RICH_TAGS, false)
}

/** HTML 模块净化（html，标签集更宽，仍剔除脚本 / 事件属性 / javascript:） */
export function sanitizeHtmlBlock(html: string): string {
  return sanitize(html, HTML_TAGS, true)
}
