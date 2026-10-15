import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { InquiryForm } from '../blocks/InquiryForm'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'
import { useSiteConfig } from '../hooks/useSiteConfig'

/**
 * 提交咨询（深度线 · 表单，T5.7）：接入共用实现 `blocks/InquiryForm`，
 * 与首页留言、/contact 引导**同一套分流表单**（类型 售前/售后/商务 → 主题联动 → 落库 inquiryType）；
 * 字段仍 5 项，仅入口不同。分流开关由站点配置 `inquiryRouting`（默认开）控制。
 */
export function InquiryPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  usePageEffects(rootRef, 'ready')
  useHomeEffects(rootRef, 'ready')
  const routingEnabled = useSiteConfig()?.inquiryRouting !== false

  return (
    <div ref={rootRef}>
      <div className="container section--tight" style={{ paddingTop: 'var(--gh-space-7)' }}>
        <nav className="breadcrumb" aria-label="面包屑">
          <Link to="/">首页</Link>
          <span>/</span>
          <Link to="/support">服务支持</Link>
          <span>/</span>
          <span>提交咨询</span>
        </nav>

        <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
          <div>
            <h1 className="section__title">提交咨询</h1>
            <p className="section__desc">填写型号与现象，提交后可在个人中心跟踪处理进度。</p>
          </div>
          <Link className="btn btn--secondary" to="/contact">
            查看联系方式
          </Link>
        </div>

        <div className="contact-block contact-block--soft">
          <InquiryForm
            title=""
            desc=""
            points={['填写型号与现象，定位更快', '可在工单中补充截图与日志', '留下手机号或邮箱，方便我们联系']}
            routingEnabled={routingEnabled}
          />
        </div>
      </div>
    </div>
  )
}
