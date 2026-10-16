/**
 * 站点级设计令牌（「样式」栏目）白名单与注入。
 * ============================================================
 * 后台「样式」只允许编辑下列**安全令牌**，写入站点配置 `theme` 字段；
 * 前台加载站点配置后调用 `applyThemeTokens`，仅把白名单内的键值对通过
 * `document.documentElement.style.setProperty` 注入到 `<html>` 内联样式，
 * 覆盖样式表中的令牌，避免任意变量被覆盖而破坏布局。
 *
 * 与后端 `gh-server/src/data/siteTokens.ts` 的 `THEME_TOKEN_KEYS` 逐字一致。
 *
 * 双主题说明：内联样式优先级高于 `[data-theme="dark"]` 规则，故**同一覆盖值会同时
 * 作用于明 / 暗两套主题**。因此白名单刻意只选「与明暗无关」的几何 / 排版令牌
 * （圆角、字体、容器宽度、留白），以及需要用户自行保证两套主题下都可读的主色实底
 * `--color-accent-solid`（配白字，建议取对明暗都够对比度的深色）。
 */

/** 令牌键（顺序即后台表单展示顺序） */
export const THEME_TOKEN_KEYS: string[] = [
  '--color-accent-solid',
  '--gh-radius-md',
  '--gh-font-sans',
  '--gh-container-max',
  '--gh-section-pad',
]

export type ThemeTokenMeta = {
  /** CSS 变量名（= 站点配置 theme 的键） */
  key: string
  /** 展示名 */
  label: string
  /** 输入控件类型：color 用取色器，text 用文本输入 */
  kind: 'color' | 'text'
  /** 占位提示（如默认值 / 示例） */
  placeholder: string
  /** 说明（含双主题提示） */
  hint: string
}

/** 后台「样式」表单字段元信息 */
export const THEME_TOKEN_META: ThemeTokenMeta[] = [
  {
    key: '--color-accent-solid',
    label: '主色（按钮实底）',
    kind: 'color',
    placeholder: '#2040ED',
    hint: '强调按钮 / 实底填充色。同一取值会同时作用于明暗两套主题，请选择配白字都足够对比的深色（默认明色 #2040ED、暗色 #4A63F2）。',
  },
  {
    key: '--gh-radius-md',
    label: '圆角基准',
    kind: 'text',
    placeholder: '8px',
    hint: '卡片 / 控件默认圆角（默认 8px）。',
  },
  {
    key: '--gh-font-sans',
    label: '字体族',
    kind: 'text',
    placeholder: '"MiSans VF", "Geist", "MiSans", "PingFang SC", sans-serif',
    hint: '正文字体栈；留空则使用默认字体。',
  },
  {
    key: '--gh-container-max',
    label: '内容最大宽度',
    kind: 'text',
    placeholder: '1440px',
    hint: '内容容器最大宽度（默认 1440px），影响整站布局横向留白。',
  },
  {
    key: '--gh-section-pad',
    label: '区块上下留白',
    kind: 'text',
    placeholder: '96px',
    hint: '站点内容区块的上下留白档位（默认 96px）。',
  },
]

/** 判断某键是否属于白名单 */
export function isThemeToken(key: string): boolean {
  return THEME_TOKEN_KEYS.includes(key)
}

/**
 * 注入站点令牌：先清除白名单内全部已注入变量（恢复样式表默认值，实现「重置为默认」），
 * 再逐项设置非空值。同一次调用即完成「覆盖 + 重置」，不残留上一次的值。
 */
export function applyThemeTokens(theme?: Record<string, string> | null): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const key of THEME_TOKEN_KEYS) root.style.removeProperty(key)
  if (!theme) return
  for (const key of THEME_TOKEN_KEYS) {
    const value = theme[key]
    if (typeof value === 'string' && value.trim()) root.style.setProperty(key, value.trim())
  }
}
