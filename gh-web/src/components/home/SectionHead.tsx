import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSitePages } from '../../hooks/useSitePages'

type Props = {
  title: string
  desc?: string
  /** 右侧操作区（查看全部 / 进入完整页面等） */
  action?: ReactNode
}

/**
 * 区块标题：标题 + 副标题（+ 右侧操作）。
 *
 * v2.1 调整：按反馈**去掉标题左侧图标**，并加大标题字号、加大留白，
 * 让「标题层级」本身承担视觉引导（不再依赖装饰图标）。
 */
export function SectionHead({ title, desc, action }: Props) {
  return (
    <div className="section__head reveal" data-delay="0">
      <div>
        <h2 className="section__title">{title}</h2>
        {desc && <p className="section__desc">{subtitleText(desc)}</p>}
      </div>
      {action}
    </div>
  )
}

/** 子标题：允许「主句 ｜ 补充」两段，用分隔符弱化后半段 */
function subtitleText(text: string): ReactNode {
  const [head, ...rest] = text.split('｜')
  if (!rest.length) return text
  return (
    <>
      {head}
      <span className="section__desc-sep"> ｜ </span>
      <span className="section__desc-sub">{rest.join('｜')}</span>
    </>
  )
}

/** 由 props 组装右侧 CTA：文案 + 链接均填写时才渲染（站内链接用 SPA 跳转）；
 *  链接指向已停用页面时整条 CTA 不渲染（下线级联）。 */
export function SectionCta({ label, href }: { label?: string; href?: string }) {
  const { isHrefLive } = useSitePages()
  const text = (label ?? '').trim()
  const to = (href ?? '').trim()
  if (!text || !to) return null
  if (!isHrefLive(to)) return null
  const arrow = <span aria-hidden="true">→</span>
  const external = /^https?:\/\//.test(to)
  return external ? (
    <a className="section__cta" href={to} target="_blank" rel="noreferrer">
      {text}
      {arrow}
    </a>
  ) : (
    <Link className="section__cta" to={to}>
      {text}
      {arrow}
    </Link>
  )
}

/**
 * 统一「标题组」读取：主标题 + 子标题 + 右侧 CTA。
 *
 * 所有区块共用，字段来自区块 props（后台装修器可编辑）：
 *   title / subtitle / ctaLabel / ctaHref；
 * 同时兼容旧字段 `desc`（作为子标题回退）与调用方自定义 `action`（优先级最高）。
 * 无标题时返回 null（不渲染标题区）。
 *
 * 注：props 中的 `icon` 字段已停用（按反馈去掉标题图标），此处不再读取。
 */
export function SectionHeadFromProps({
  props,
  action,
}: {
  props: Record<string, unknown>
  /** 调用方自定义右侧操作区（优先级高于 ctaLabel/ctaHref） */
  action?: ReactNode
}) {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const title = str(props.title)
  if (!title) return null
  const subtitle = str(props.subtitle) || str(props.desc)
  // props 里配置的 CTA 优先；未配置时回退到调用方给的默认操作区
  const hasPropsCta = Boolean(str(props.ctaLabel) && str(props.ctaHref))
  const cta = hasPropsCta ? <SectionCta label={str(props.ctaLabel)} href={str(props.ctaHref)} /> : action
  const showCta = hasPropsCta || action !== undefined
  return <SectionHead title={title} desc={subtitle || undefined} action={showCta ? cta : undefined} />
}
