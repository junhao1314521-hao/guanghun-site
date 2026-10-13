import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/** 状态码文案：403 无权限、500 服务不可用 */
const STATUS_CONTENT: Record<403 | 500, { title: string; desc: string }> = {
  403: {
    title: '无权限访问该页面',
    desc: '当前账号没有访问该页面的权限，请更换账号或返回首页继续浏览。',
  },
  500: {
    title: '服务暂时不可用',
    desc: '服务出现异常，请稍后重试；若问题持续，可通过服务支持联系我们。',
  },
}

/** 状态页：同一组件按 code 支持 403 / 500，不取数（不使用 useApi） */
export function StatusPage({ code, detail }: { code: 403 | 500; detail?: string }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const content = STATUS_CONTENT[code]

  usePageEffects(rootRef, code)
  useHomeEffects(rootRef, code)

  const goBack = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  return (
    <div ref={rootRef}>
      <div className="container section">
        <div className="empty">
          <div
            className="stat__value"
            style={{ fontSize: 'var(--gh-font-size-display)', lineHeight: 'var(--gh-line-height-display)' }}
          >
            {code}
          </div>
          <div className="empty__title">{content.title}</div>
          <p className="empty__desc">{detail ?? content.desc}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn--secondary btn--sm" to="/">
              返回首页
            </Link>
            <button className="btn btn--ghost btn--sm" type="button" onClick={goBack}>
              返回上一页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}