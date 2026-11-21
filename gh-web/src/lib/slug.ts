/**
 * 由标题生成可读 slug（用于页面 key / 法律条款 / 合作内容的对外地址）。
 *
 * 规则：小写、空白与下划线转连字符、去掉其余非 ASCII 字母数字字符。
 * 纯中文标题会得到空串——调用方据此回落到短随机码，而不是硬编码中文到 URL。
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** 生成短随机码（6 位 base36），用于无法转写或需要避让重名的场景 */
export function shortCode(): string {
  return Math.random().toString(36).slice(2, 8)
}
