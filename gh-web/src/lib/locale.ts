/**
 * 当前生效语言 → 后端 locale 的桥接（单一真源）。
 *
 * 前端语言代码为 `zh-CN` / `zh-HK` / `en`；后端只区分「英文变体 `en`」与「默认中文」。
 * I18nProvider 在语言变化时调用 `setActiveLocale`，接口层（api/client.ts）在发起请求时
 * 读取 `localeQuery()` 自动附上 `?locale=`，从而让内容库 / 集合随语言切换返回对应语种，
 * 缺英文时由后端回退中文。
 *
 * 采用模块级可变状态（而非 React context）的原因：传输器在模块作用域创建，无法消费 context；
 * 而语言切换本身会触发全局重渲染，组件通过 useApi 的隐式依赖重取数据，故无需 context。
 */

/** 后端可识别的 locale（其余一律映射为 undefined = 默认中文） */
export type ApiLocale = 'en'

let active: ApiLocale | undefined

/** 设置当前语言对应的后端 locale（非 'en' 一律清除，走默认中文） */
export function setActiveLocale(lang: string): void {
  active = lang === 'en' ? 'en' : undefined
}

/** 读取当前 locale（未设置返回 undefined） */
export function activeLocale(): ApiLocale | undefined {
  return active
}

/** 供请求拼接的查询参数：英文时 `{ locale: 'en' }`，否则空对象 */
export function localeQuery(): Record<string, string> {
  return active ? { locale: active } : {}
}
