/**
 * 15. contact 联系留言（契约 §4）
 * props: title / desc / channel:'inquiry'|'business' / showForm:boolean
 *
 * showForm=false：渲染既有「引导卡片」（标题 + 描述 + 行动按钮）；
 * showForm=true：渲染咨询提交表单（与 /inquiry、/contact 引导**共用同一套实现**——见 `InquiryForm`）。
 *
 * §1.6 留言轻量分流：表单顶部先选「售前咨询 / 售后报修 / 商务合作」，主题联动，提交按类型分派；
 * 该能力由站点配置 `inquiryRouting`（默认开）控制。
 */
import { SafeLink } from '../components/ui/SafeLink'
import { useSiteConfig } from '../hooks/useSiteConfig'
import { InquiryForm } from './InquiryForm'
import { asBool, asString, asStringArray } from './blockUtils'

/** 渠道相关默认要点（未配置 points 时使用），与标题/描述互补、不重复 */
const DEFAULT_POINTS: Record<string, string[]> = {
  inquiry: ['填写型号与现象，定位更快', '可在工单中补充截图与日志', '留下手机号或邮箱，方便我们联系'],
  business: ['渠道 / 送测 / 赛事合作皆可', '工作日 1–2 个工作日回复', '提交后进入统一工单系统'],
}

export function ContactBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title)
  const desc = asString(props.desc)
  const channel = asString(props.channel, 'inquiry')
  const showForm = asBool(props.showForm)
  // 模块样式：soft=浅底浮卡（默认）；bold=品牌色深色收口（文字反白）
  const variant = asString(props.variant, 'soft') === 'bold' ? 'bold' : 'soft'
  // 左栏要点：可用 props.points 覆盖，缺省按渠道给出
  const configuredPoints = asStringArray(props.points)
  const points = configuredPoints.length > 0 ? configuredPoints : DEFAULT_POINTS[channel] ?? DEFAULT_POINTS.inquiry
  const blockClass = `contact-block contact-block--${variant}`
  // 轻量分流开关（站点配置，默认开）：关掉后表单回退为原来的单一主题下拉
  const routingEnabled = useSiteConfig()?.inquiryRouting !== false

  if (showForm)
    return (
      <div className={blockClass}>
        <InquiryForm title={title} desc={desc} points={points} routingEnabled={routingEnabled} />
      </div>
    )

  const primary =
    channel === 'business'
      ? { label: '提交合作申请', href: '/business' }
      : { label: '提交咨询', href: '/inquiry' }

  return (
    <div className={blockClass}>
      <div
        className="card reveal contact-cta"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--gh-space-5)', flexWrap: 'wrap' }}
      >
        <div>
          {title && (
            <h2 className="card__title" style={{ marginBottom: 'var(--gh-space-1)' }}>
              {title}
            </h2>
          )}
          {desc && <p className="card__desc">{desc}</p>}
        </div>
        <div className="row">
          <SafeLink className="btn btn--primary is-magnetic" to={primary.href}>
            {primary.label}
          </SafeLink>
          <SafeLink className="btn btn--secondary" to="/faq">
            常见问题
          </SafeLink>
        </div>
      </div>
    </div>
  )
}
