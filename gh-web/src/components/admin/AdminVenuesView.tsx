/**
 * 后台「体验点管理」列表 / 地图双布局。
 * ============================================================
 * 数据源与通用列表一致（`/api/admin/resources/biz-venues`），但提供：
 * - 省级 / 城市 / 类型 / 关键词筛选（省市二级联动，选项来自当前真实数据）；
 * - 「列表 / 地图」布局切换：地图仅展示带经纬度的体验点，点击标记选中；
 * - 编辑仍进入通用表单 `/admin/biz-venues/:id`（省市字段为级联下拉）。
 */
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminResource } from '../../api/admin'
import type { AdminRow } from '../../data/admin'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { AdminVenueMap, type AdminVenuePoint } from '../../components/admin/AdminVenueMap'
import { Select } from '../../components/admin/Select'
import { EmptyState, ErrorState, SkeletonTable } from '../../components/admin/states'
import { IconSearch } from '../ui/Icon'

type Layout = 'list' | 'map'

const TYPE_LABELS: Record<string, string> = {
  flagship: '旗舰店',
  experience: '体验点',
  service: '服务点',
}

/** 资料完整度：记录缺失的可选字段（电话 / 营业时间 / 图片 / 坐标） */
function missingVenueFields(row: AdminRow): string[] {
  const missing: string[] = []
  if (!String(row.phone ?? '').trim()) missing.push('电话')
  if (!String(row.hours ?? '').trim()) missing.push('营业时间')
  const gallery = Array.isArray(row.gallery) ? row.gallery : []
  if (!String(row.cover ?? '').trim() && gallery.length === 0) missing.push('图片')
  const lat = typeof row.lat === 'number' ? row.lat : Number(row.lat)
  const lng = typeof row.lng === 'number' ? row.lng : Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) missing.push('坐标')
  return missing
}

export function AdminVenuesView() {
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchAdminResource('biz-venues', signal), [reloadKey])
  const [keyword, setKeyword] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [type, setType] = useState('')
  const [layout, setLayout] = useState<Layout>('list')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const rows: AdminRow[] = data?.items ?? []

  /** 省份选项：来自当前真实记录，按记录中出现顺序 */
  const provinceOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const row of rows) {
      const value = String(row.province ?? '')
      if (value && !seen.has(value)) {
        seen.add(value)
        list.push(value)
      }
    }
    return list
  }, [rows])

  /** 城市选项：随所选省份收敛 */
  const cityOptions = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const row of rows) {
      if (province && String(row.province ?? '') !== province) continue
      const value = String(row.city ?? '')
      if (value && !seen.has(value)) {
        seen.add(value)
        list.push(value)
      }
    }
    return list.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
  }, [rows, province])

  const baseFiltered = rows.filter((row) => {
    const text = `${String(row.name ?? '')}${String(row.address ?? '')}${String(row.city ?? '')}`.toLowerCase()
    if (keyword.trim() && !text.includes(keyword.trim().toLowerCase())) return false
    if (province && String(row.province ?? '') !== province) return false
    if (city && String(row.city ?? '') !== city) return false
    if (type && String(row.type ?? '') !== type) return false
    return true
  })
  const incompleteCount = baseFiltered.filter((row) => missingVenueFields(row).length > 0).length
  const filtered = onlyIncomplete ? baseFiltered.filter((row) => missingVenueFields(row).length > 0) : baseFiltered

  const mapPoints: AdminVenuePoint[] = filtered.map((row) => ({
    id: String(row.id ?? ''),
    name: String(row.name ?? '未命名'),
    address: String(row.address ?? ''),
    city: String(row.city ?? ''),
    province: String(row.province ?? ''),
    lat: typeof row.lat === 'number' ? row.lat : Number(row.lat) || undefined,
    lng: typeof row.lng === 'number' ? row.lng : Number(row.lng) || undefined,
  }))

  return (
    <div className="admin-page--wide admin-page">
      <AdminPageHead
        title="体验点管理"
        desc="管理商业合作体验点的位置与状态；省市为级联下拉，可按列表或地图查看。"
        actions={
          <Link className="btn btn--primary btn--sm" to="/admin/biz-venues/new">
            新建
          </Link>
        }
      />

      <div className="admin-toolbar venues-toolbar">
        <div className="admin-toolbar__search search">
          <span className="search__icon" aria-hidden="true">
            <IconSearch size={16} />
          </span>
          <input
            className="input"
            type="search"
            value={keyword}
            placeholder="搜索名称 / 地址 / 城市"
            aria-label="搜索体验点"
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
        <Select
          aria-label="按省份筛选"
          value={province}
          onChange={(next) => {
            setProvince(next)
            setCity('')
          }}
          options={[{ value: '', label: '全部省份' }, ...provinceOptions.map((item) => ({ value: item, label: item }))]}
        />
        <Select
          aria-label="按城市筛选"
          value={city}
          onChange={setCity}
          options={[{ value: '', label: province ? '全部城市' : '先选省份' }, ...cityOptions.map((item) => ({ value: item, label: item }))]}
        />
        <Select
          aria-label="按类型筛选"
          value={type}
          onChange={setType}
          options={[
            { value: '', label: '全部类型' },
            { value: 'flagship', label: '旗舰店' },
            { value: 'experience', label: '体验点' },
            { value: 'service', label: '服务点' },
          ]}
        />
        <span className="admin-toolbar__spacer" />
        <button
          type="button"
          className={`admin-chip${onlyIncomplete ? ' is-active' : ''}`}
          aria-pressed={onlyIncomplete}
          onClick={() => setOnlyIncomplete((value) => !value)}
          title="仅显示缺少电话 / 营业时间 / 图片 / 坐标的体验点"
        >
          只看资料待补（{incompleteCount}）
        </button>
        <div className="venues-layout" role="group" aria-label="布局切换">
          <button
            type="button"
            className={`venues-layout__btn${layout === 'list' ? ' is-active' : ''}`}
            aria-pressed={layout === 'list'}
            onClick={() => setLayout('list')}
          >
            列表
          </button>
          <button
            type="button"
            className={`venues-layout__btn${layout === 'map' ? ' is-active' : ''}`}
            aria-pressed={layout === 'map'}
            onClick={() => setLayout('map')}
          >
            地图
          </button>
        </div>
        <span className="admin-table__count">共 {filtered.length} 家</span>
      </div>

      {error ? (
        <ErrorState message={error.message} onRetry={() => setReloadKey((key) => key + 1)} />
      ) : loading && rows.length === 0 ? (
        <SkeletonTable columns={4} rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState title="没有匹配的体验点" desc="调整搜索或筛选条件，或新建一个体验点。" />
      ) : layout === 'list' ? (
        // 四列布局：主信息合并进「体验点」与「位置」两列，资料以标签展示，
        // 避免 8 列宽表在窄屏出现横向滚动、每格文字被截断。
        <div className="admin-table-wrap admin-table-wrap--venues">
          <div className="admin-table-scroll">
            <table className="table admin-table venues-table">
              <thead>
                <tr>
                  <th scope="col">体验点</th>
                  <th scope="col">位置</th>
                  <th scope="col">资料</th>
                  <th scope="col" style={{ textAlign: 'right' }}>
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const missing = missingVenueFields(row)
                  const address = String(row.address ?? '').trim()
                  const region = [row.province, row.city, row.area].filter(Boolean).join(' · ')
                  const coordinate =
                    typeof row.lat === 'number' && typeof row.lng === 'number' ? `${row.lat}, ${row.lng}` : ''
                  const status = String(row.status ?? '')
                  return (
                    <tr key={String(row.id)} className={activeId === String(row.id) ? 'is-active' : undefined}>
                      <td className="admin-cell--title venue-cell--main" data-label="体验点">
                        <div className="venue-line">
                          <strong className="venue-name">{String(row.name ?? '未命名')}</strong>
                          <span className="venue-tag">
                            {TYPE_LABELS[String(row.type ?? '')] ?? String(row.type ?? '—')}
                          </span>
                          {status && (
                            <span className={`venue-tag venue-tag--status${status === '营业中' ? ' is-open' : ''}`}>
                              {status}
                            </span>
                          )}
                        </div>
                        <span className="venue-sub mono">{String(row.id ?? '')}</span>
                      </td>
                      <td data-label="位置">
                        <div className="venue-place">
                          <span className={`venue-addr${address ? '' : ' is-empty'}`} title={address || undefined}>
                            {address || '未填写地址'}
                          </span>
                          <span className="venue-sub">
                            <span>{region || '省市未定'}</span>
                            {coordinate ? <span className="mono"> · {coordinate}</span> : <span> · 坐标待补</span>}
                          </span>
                        </div>
                      </td>
                      <td data-label="资料">
                        {missing.length === 0 ? (
                          <span className="venue-ok">完整</span>
                        ) : (
                          <div className="venue-missing" title={`缺失：${missing.join('、')}`}>
                            <span className="venue-missing__label">待补</span>
                            {missing.map((item) => (
                              <span className="venue-missing__item" key={item}>
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="venue-cell--actions">
                        <Link className="btn btn--ghost btn--sm" to={`/admin/biz-venues/${String(row.id)}`}>
                          编辑
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="venues-map-layout">
          <AdminVenueMap venues={mapPoints} activeId={activeId} onSelect={setActiveId} />
          <div className="venues-map-list" aria-label="当前筛选的体验点">
            {filtered.map((row) => (
              <button
                key={String(row.id)}
                type="button"
                className={`venues-map-list__item${activeId === String(row.id) ? ' is-active' : ''}`}
                onClick={() => setActiveId(String(row.id))}
              >
                <strong>{String(row.name ?? '未命名')}</strong>
                <span>{[row.city, row.province].filter(Boolean).join(' · ') || String(row.address ?? '')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
