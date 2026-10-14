import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchMyInquiry, replyMyInquiry } from '../api/account'
import { useApi } from '../hooks/useApi'
import { useHomeEffects } from '../hooks/useHomeEffects'
import { usePageEffects } from '../hooks/usePageEffects'

/**
 * 个人中心 · 工单详情（三级页面 · 骨架层）：客户侧时间线 + 补充回复。
 * 时间线仅展示面向客户的条目（客户回复 / 公开回复），内部备注对客户不可见。
 * 补充回复为真实接口 `POST /api/account/inquiries/:id/replies`。
 */
export function MeInquiryDetailPage() {
  const { id = '' } = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendErr, setSendErr] = useState<string | null>(null)

  const { data, loading, error } = useApi((signal) => fetchMyInquiry(id, signal), [id, reloadKey])
  // 过滤掉内部备注：只显示面向客户的条目
  const visible = (data?.timeline ?? []).filter((entry) => entry.kind !== 'internal')

  const readyKey = `${id}:${reloadKey}:${loading ? 'loading' : 'ready'}`
  usePageEffects(rootRef, readyKey)
  useHomeEffects(rootRef, readyKey)

  const submit = async () => {
    if (!reply.trim()) {
      setSendErr('请输入回复内容')
      return
    }
    setSending(true)
    setSendErr(null)
    try {
      await replyMyInquiry(id, reply.trim())
      setReply('')
      setReloadKey((key) => key + 1)
    } catch (ex) {
      setSendErr(ex instanceof Error ? ex.message : '提交失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  return (
    <div ref={rootRef}>
      <nav className="breadcrumb" aria-label="面包屑">
        <Link to="/me/inquiries">我的咨询</Link>
        <span>/</span>
        <span>工单详情</span>
      </nav>

      {error ? (
        <div className="empty" style={{ marginTop: 'var(--gh-space-5)' }}>
          <div className="empty__title">工单加载失败</div>
          <p className="empty__desc">{error.message}。请检查网络后重试。</p>
          <div className="row" style={{ gap: 'var(--gh-space-3)' }}>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
            <Link className="btn btn--ghost btn--sm" to="/me/inquiries">
              返回列表
            </Link>
          </div>
        </div>
      ) : loading || !data ? (
        <div aria-busy="true" aria-label="工单加载中" style={{ marginTop: 'var(--gh-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-4)' }}>
          <div className="skeleton" style={{ height: 28, width: '60%' }} />
          <div className="skeleton" style={{ height: 20, width: '40%' }} />
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="skeleton" key={index} style={{ height: 72 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="section__head" style={{ marginTop: 'var(--gh-space-4)', marginBottom: 'var(--gh-space-5)' }}>
            <div>
              <h2 className="section__title" style={{ fontSize: 'var(--gh-font-size-h3)' }}>
                {data.title}
              </h2>
              <div className="row" style={{ marginTop: 'var(--gh-space-2)' }}>
                <span className="mono muted">{data.id}</span>
                <span className={`status status--${visible.length ? 'info' : 'muted'}`}>{data.status}</span>
              </div>
            </div>
          </div>

          <div className="dl-meta reveal" style={{ marginBottom: 'var(--gh-space-6)' }}>
            <div>
              <div className="dl-meta__k">关联型号</div>
              <div className="dl-meta__v">{data.model}</div>
            </div>
            <div>
              <div className="dl-meta__k">创建时间</div>
              <div className="dl-meta__v">{data.createdAt}</div>
            </div>
            <div>
              <div className="dl-meta__k">最近更新</div>
              <div className="dl-meta__v">{data.updatedAt}</div>
            </div>
          </div>

          <h3 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-4)' }}>
            处理时间线
          </h3>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--gh-space-4)' }}>
            {visible.map((entry, index) => (
              <li
                className="card"
                key={`${entry.time}-${index}`}
                style={{
                  borderLeft: `3px solid ${entry.kind === 'agent' ? 'var(--color-accent)' : 'var(--color-border-strong)'}`,
                }}
              >
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <span className={`tag${entry.kind === 'customer' ? ' tag--accent' : ''}`}>
                    {entry.kind === 'customer' ? '我' : entry.author}
                  </span>
                  <span className="mono muted" style={{ fontSize: 'var(--gh-font-size-caption)' }}>
                    {entry.time}
                  </span>
                </div>
                <p style={{ margin: 'var(--gh-space-2) 0 0', fontSize: 'var(--gh-font-size-body-sm)' }}>{entry.text}</p>
              </li>
            ))}
          </ol>
          <p className="field__hint" style={{ marginTop: 'var(--gh-space-3)' }}>
            仅展示面向客户的回复；内部备注对客户不可见。
          </p>

          <section style={{ marginTop: 'var(--gh-space-7)' }}>
            <h3 className="section__title" style={{ fontSize: 'var(--gh-font-size-h4)', marginBottom: 'var(--gh-space-4)' }}>
              补充回复
            </h3>
            <div className="field">
              <label className="field__label" htmlFor="inquiryReply">
                补充说明或上传材料说明
              </label>
              <textarea
                className="textarea"
                id="inquiryReply"
                value={reply}
                placeholder="描述现象、附上固件版本或日志说明…"
                onChange={(event) => setReply(event.target.value)}
              />
              <span className="field__hint">补充材料后工单状态将回到「处理中」。</span>
            </div>
            {sendErr && (
              <span className="field__error" style={{ display: 'block', marginTop: 'var(--gh-space-2)' }}>
                {sendErr}
              </span>
            )}
            <div className="row" style={{ marginTop: 'var(--gh-space-4)' }}>
              <button
                className={`btn btn--primary is-magnetic${sending ? ' btn--loading' : ''}`}
                type="button"
                disabled={sending}
                onClick={submit}
              >
                提交回复
              </button>
              <Link className="btn btn--ghost" to="/me/inquiries">
                返回我的咨询
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  )
}