/**
 * 站点级设计令牌白名单（契约 §6「样式」扩展）。
 *
 * 后台「样式」栏目只允许编辑以下**安全令牌**，写入站点配置 `theme` 字段；
 * 保存时（后端）与注入时（前台）均只认这些键，避免任意 CSS 变量被覆盖而破坏布局。
 * 与 `gh-web/src/lib/siteTheme.ts` 的 `THEME_TOKEN_KEYS` 保持逐字一致。
 */
export const THEME_TOKEN_KEYS: string[] = [
  '--color-accent-solid', // 主色（按钮实底 / 强调色）
  '--gh-radius-md', // 圆角基准
  '--gh-font-sans', // 字体族
  '--gh-container-max', // 内容最大宽度
  '--gh-section-pad', // 区块上下留白档位
]

/** 判断某键是否属于允许覆盖的令牌白名单 */
export function isThemeToken(key: string): boolean {
  return THEME_TOKEN_KEYS.includes(key)
}

/** 过滤出白名单内的令牌键值对（剔除未知键与非字符串值） */
export function filterThemeTokens(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (isThemeToken(key) && typeof value === 'string') out[key] = value
  }
  return out
}
