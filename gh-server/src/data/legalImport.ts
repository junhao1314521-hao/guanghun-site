/**
 * 法律条款 · Word 导入解析。
 *
 * 支持 OOXML 系（.docx / .docm / .dotx）：用 mammoth 转成 HTML，再按标题层级
 * 切分为 `{ title, eyebrow, intro, sections[{ heading, body }] }`，回填到后台表单。
 * - 老式 .doc（二进制）与扫描件 PDF 不支持，调用方需给出明确提示。
 * - 解析为启发式：标题层级 / 编号（一、二、/ 第X条）决定分段，复杂排版需人工校对。
 */
import mammoth from 'mammoth'

export type ParsedLegalDoc = {
  title: string
  eyebrow: string
  intro: string
  sections: Array<{ heading: string; body: string }>
}

/** 受支持的扩展名（OOXML 系） */
export const SUPPORTED_LEGAL_EXT = ['docx', 'docm', 'dotx'] as const

/** 判断扩展名是否受支持 */
export function isSupportedLegalFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return (SUPPORTED_LEGAL_EXT as readonly string[]).includes(ext)
}

/** 简易 HTML 实体解码 + 去标签 */
function toText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

type Block = { heading: boolean; text: string }

/** 把 mammoth 的 HTML 拆成「标题块 / 正文块」序列 */
function toBlocks(html: string): Block[] {
  const blocks: Block[] = []
  const re = /<(h[1-6]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const isHeading = m[1].toLowerCase().startsWith('h')
    const text = toText(m[2])
    if (text) blocks.push({ heading: isHeading, text })
  }
  return blocks
}

/**
 * 解析为法律文档草稿：
 * - 标题：首个标题块（否则用文件名去扩展名）；
 * - 导语：首个标题块之前的正文（否则空）；
 * - 段落：此后每个「标题块」开启一段，其后的正文块归入该段；无标题时整体作为单段。
 */
export async function parseLegalDoc(buffer: Buffer, filename: string): Promise<ParsedLegalDoc> {
  const { value: html } = await mammoth.convertToHtml({ buffer })
  const blocks = toBlocks(html)

  const firstHeadingIndex = blocks.findIndex((block) => block.heading)
  const fallbackTitle = filename.replace(/\.[^.]+$/, '').trim() || '未命名文档'
  const title = firstHeadingIndex >= 0 ? blocks[firstHeadingIndex].text : fallbackTitle
  const intro =
    firstHeadingIndex > 0 ? blocks.slice(0, firstHeadingIndex).map((block) => block.text).join('\n') : ''

  const sections: Array<{ heading: string; body: string }> = []
  for (let i = Math.max(0, firstHeadingIndex + (firstHeadingIndex >= 0 ? 1 : 0)); i < blocks.length; i += 1) {
    const block = blocks[i]
    if (block.heading) {
      sections.push({ heading: block.text, body: '' })
      continue
    }
    if (sections.length === 0) sections.push({ heading: '正文', body: block.text })
    else sections[sections.length - 1].body = sections[sections.length - 1].body
      ? `${sections[sections.length - 1].body}\n${block.text}`
      : block.text
  }

  return { title, eyebrow: 'LEGAL', intro, sections }
}
