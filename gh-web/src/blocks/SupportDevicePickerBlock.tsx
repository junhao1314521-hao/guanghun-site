/**
 * 服务支持 · 设备选择（区块）。
 *
 * 数据来自后台 models 集合（GET /api/support/models，仅返回有主图的型号）。
 * 选中型号写入 ?model=<id>，下载列表与 FAQ 读取同一参数，形成「选设备 → 看资料」的闭环。
 */
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchSupportModels, type SupportDevice } from '../api/support'
import { asNumber, asString } from './blockUtils'

export function SupportDevicePickerBlock({ props }: { props: Record<string, unknown> }) {
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState<SupportDevice[]>([])
  const [loading, setLoading] = useState(true)

  const title = asString(props.title, '先选择你的设备')
  const desc = asString(props.desc)
  const limit = Math.max(1, asNumber(props.limit, 4))
  const allLabel = asString(props.allLabel, '全部型号')
  const allHref = asString(props.allHref, '/support/models')
  const selected = params.get('model') ?? ''

  useEffect(() => {
    const controller = new AbortController()
    fetchSupportModels(controller.signal)
      .then((result) => setItems(result.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const select = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('model', id)
    setParams(next, { replace: true })
  }

  return (
    <section className="support-devices" id="devices">
      <div className="support-devices__head">
        <div>
          <h2>{title}</h2>
          {desc ? <p>{desc}</p> : null}
        </div>
        {allHref ? <Link to={allHref}>{allLabel} →</Link> : null}
      </div>

      {loading ? (
        <p className="support-devices__empty">正在加载型号…</p>
      ) : items.length ? (
        <div className="support-devices__grid">
          {items.slice(0, limit).map((item) => {
            const active = item.id === selected
            return (
              <button
                key={item.id}
                type="button"
                className={`sdev${active ? ' is-on' : ''}`}
                aria-pressed={active}
                onClick={() => select(item.id)}
              >
                {active ? <span className="sdev__check">✓</span> : null}
                <img src={item.image} alt={item.model} loading="lazy" />
                <b>{item.model}</b>
                <span>{item.line || item.summary}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="support-devices__empty">暂无可用型号，请稍后再试。</p>
      )}
    </section>
  )
}
