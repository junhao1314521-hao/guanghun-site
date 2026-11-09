/**
 * 体验点独立页（venueExplorer）。
 *
 * 数据源：`/api/business/venues`（集合 biz-venues）。
 * 能力：搜索 / 附近 / 城市弹层 / 机型筛选 / 地图聚合下钻 / 按省分组列表 / 门店详情浮层。
 * 设计：苹果风大留白、细分割线、玻璃浮层；省份不再平铺成筛选条。
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchBizVenues } from '../api/business-extra'
import { useApi } from '../hooks/useApi'
import type { VenueSummary } from '../data/business-extra'
import { asBool, asNumber, asString } from './blockUtils'
import { IconChevronDown, IconClose, IconCopy, IconNavigate, IconSearch } from '../components/ui/Icon'
import { VenueExplorerMap } from '../components/site/VenueExplorerMap'
import {
  VENUE_MODEL_FAMILIES,
  VENUE_REGIONS,
  copyText,
  distanceKm,
  formatDistance,
  hasCoords,
  provinceShort,
  venueModelMatch,
  venueNavigationUrl,
  venueRegionName,
  venueTypeLabel,
  venueTypeRank,
} from '../lib/venue'

type GeoPoint = { lat: number; lng: number }

/** 把接口返回的坐标统一成 number（后台可能是字符串；空值保留 NaN，由 hasCoords 过滤） */
function normalize(items: VenueSummary[]): VenueSummary[] {
  return items.map((item) => ({ ...item, lat: Number(item.lat), lng: Number(item.lng) }))
}

/** 产品体验点探索区块：渲染筛选器、门店列表与地图，支持定位就近排序与详情切换 */
export function VenueExplorerBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title, '产品体验点')
  const subtitle = asString(props.subtitle, '先摸到那台机器，再决定。全国合作门店提供光魂与极创全系显示器实机体验。')
  const showMap = props.showMap === undefined ? true : asBool(props.showMap)
  const limit = Math.max(0, asNumber(props.limit, 0))

  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchBizVenues(signal), [reloadKey])
  const venues = useMemo(() => {
    const items = normalize(data?.items ?? [])
    return limit > 0 ? items.slice(0, limit) : items
  }, [data, limit])

  const [query, setQuery] = useState('')
  const [province, setProvince] = useState('全部')
  const [city, setCity] = useState('全部')
  const [model, setModel] = useState('全部')
  const [searchParams] = useSearchParams()
  const [nearby, setNearby] = useState(false)
  const [userPoint, setUserPoint] = useState<GeoPoint | null>(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cityOpen, setCityOpen] = useState(false)
  const [cityRegion, setCityRegion] = useState('全部')
  const [cityQuery, setCityQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 767px)').matches,
  )

  // 产品详情「预约体验」带 ?model=闪电 进入时，直接按该机型筛选
  useEffect(() => {
    const requested = searchParams.get('model')
    if (!requested) return
    setModel(requested)
    setProvince('全部')
    setCity('全部')
    setNearby(false)
    setQuery('')
  }, [searchParams])

  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const onChange = () => setIsMobile(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const total = venues.length
  const provinceCount = useMemo(() => new Set(venues.map((venue) => venue.province)).size, [venues])
  const regionCount = useMemo(
    () => new Set(venues.map((venue) => venueRegionName(venue.province)).filter(Boolean)).size,
    [venues],
  )

  const provinceOrder = useMemo(() => {
    const present = new Set(venues.map((venue) => venue.province))
    const ordered = VENUE_REGIONS.flatMap((region) => region.provinces).filter((item) => present.has(item))
    const rest = Array.from(present).filter((item) => !ordered.includes(item))
    return [...ordered, ...rest]
  }, [venues])

  const provinceCounts = useMemo(() => {
    const map = new Map<string, number>()
    for (const venue of venues) map.set(venue.province, (map.get(venue.province) ?? 0) + 1)
    return map
  }, [venues])

  const quickCities = useMemo(() => {
    const counts = new Map<string, number>()
    for (const venue of venues) {
      if (venue.city) counts.set(venue.city, (counts.get(venue.city) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }))
  }, [venues])

  const cityGroups = useMemo(() => {
    const keyword = cityQuery.trim().toLowerCase()
    return VENUE_REGIONS
      .filter((region) => cityRegion === '全部' || region.name === cityRegion)
      .map((region) => ({
        name: region.name,
        provinces: region.provinces.filter((item) => {
          if (!provinceCounts.has(item)) return false
          if (!keyword) return true
          return (
            (provinceShort(item) + item).toLowerCase().includes(keyword) ||
            venues.some((venue) => venue.province === item && venue.city.toLowerCase().includes(keyword))
          )
        }),
      }))
      .filter((region) => region.provinces.length > 0)
  }, [cityRegion, cityQuery, provinceCounts, venues])

  const quickFiltered = useMemo(() => {
    const keyword = cityQuery.trim().toLowerCase()
    return keyword ? quickCities.filter((item) => item.name.toLowerCase().includes(keyword)) : quickCities
  }, [quickCities, cityQuery])

  const regionCounts = useMemo(() => {
    const map = new Map<string, number>()
    map.set('全部', venues.length)
    for (const region of VENUE_REGIONS) {
      map.set(region.name, venues.filter((venue) => region.provinces.includes(venue.province)).length)
    }
    return map
  }, [venues])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    let list = venues.filter((venue) => {
      if (province !== '全部' && venue.province !== province) return false
      if (city !== '全部' && venue.city !== city) return false
      if (!venueModelMatch(venue, model)) return false
      if (!keyword) return true
      const hay = `${venue.name} ${venue.address} ${venue.city} ${venue.province} ${(venue.products ?? []).join(' ')}`.toLowerCase()
      return hay.includes(keyword)
    })
    if (nearby && userPoint) {
      list = [...list].sort((a, b) => {
        const da = distanceKm(userPoint, a)
        const db = distanceKm(userPoint, b)
        if (da === null && db === null) return 0
        if (da === null) return 1
        if (db === null) return -1
        return da - db
      })
    } else {
      // 自营旗舰优先，其次合作体验点，最后服务网点；同级按名称稳定排序
      list = [...list].sort((a, b) => venueTypeRank(a.type) - venueTypeRank(b.type) || a.name.localeCompare(b.name, 'zh'))
    }
    return list
  }, [venues, province, city, model, query, nearby, userPoint])

  const selected = useMemo(() => filtered.find((venue) => venue.id === activeId) ?? null, [filtered, activeId])

  useEffect(() => {
    if (activeId && !filtered.some((venue) => venue.id === activeId)) setActiveId(null)
  }, [filtered, activeId])

  useEffect(() => {
    if (!cityOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCityOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [cityOpen])

  const groups = useMemo(() => {
    const map = new Map<string, VenueSummary[]>()
    for (const venue of filtered) {
      const list = map.get(venue.province) ?? []
      list.push(venue)
      map.set(venue.province, list)
    }
    return provinceOrder.filter((item) => map.has(item)).map((item) => ({ province: item, items: map.get(item) ?? [] }))
  }, [filtered, provinceOrder])

  const grouped = province === '全部' && city === '全部' && !nearby
  const mapMode: 'clusters' | 'pins' = grouped && !isMobile ? 'clusters' : 'pins'
  const activeFilters = [
    query ? { key: 'query', label: `搜索：${query}` } : null,
    city !== '全部' ? { key: 'city', label: city } : null,
    province !== '全部' ? { key: 'province', label: provinceShort(province) } : null,
    model !== '全部' ? { key: 'model', label: model } : null,
    nearby ? { key: 'nearby', label: '附近' } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item))

  const resetFilters = () => {
    setQuery('')
    setProvince('全部')
    setCity('全部')
    setModel('全部')
    setNearby(false)
    setUserPoint(null)
    setGeoError('')
    setActiveId(null)
  }

  const clearFilter = (key: string) => {
    if (key === 'query') setQuery('')
    if (key === 'city') setCity('全部')
    if (key === 'province') setProvince('全部')
    if (key === 'model') setModel('全部')
    if (key === 'nearby') {
      setNearby(false)
      setUserPoint(null)
    }
  }

  const openCity = () => {
    setCityQuery('')
    setCityOpen(true)
  }

  const pickProvince = (value: string) => {
    setProvince(value)
    setCity('全部')
    setNearby(false)
    setQuery('')
    setActiveId(null)
    setCityOpen(false)
  }

  const pickCity = (value: string) => {
    setCity(value)
    setProvince('全部')
    setNearby(false)
    setQuery('')
    setActiveId(null)
    setCityOpen(false)
  }

  const selectVenue = (id: string) => {
    const venue = venues.find((item) => item.id === id)
    if (venue && !hasCoords(venue)) {
      setGeoError('该门店地址待补充，暂无法在地图上定位；可先复制地址或联系门店确认。')
      setActiveId(id)
      return
    }
    setGeoError('')
    setActiveId(id)
  }

  const handleNearby = () => {
    if (nearby) {
      setNearby(false)
      setUserPoint(null)
      return
    }
    setGeoError('')
    if (!navigator.geolocation) {
      setGeoError('当前浏览器不支持定位，已保留全部门店。')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserPoint({ lat: position.coords.latitude, lng: position.coords.longitude })
        setNearby(true)
        setLocating(false)
      },
      () => {
        setLocating(false)
        setGeoError('未获取到位置权限，已保留全部门店；可继续用城市或机型筛选。')
      },
      { timeout: 8000, maximumAge: 600000 },
    )
  }

  const handleCopy = async () => {
    if (!selected) return
    const ok = await copyText(selected.address || `${selected.province}${selected.city}${selected.name}`)
    setCopied(ok)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const mapRegion = city !== '全部' ? city : province !== '全部' ? provinceShort(province) : '全国'

  if (loading) {
    return (
      <div className="vx-shell" aria-busy="true" aria-label="体验点加载中">
        <div className="vx-hero"><div className="vx-hero__inner">
          <div className="skeleton" style={{ height: 12, width: 120 }} />
          <div className="skeleton" style={{ height: 64, width: '46%', marginTop: 22 }} />
          <div className="skeleton" style={{ height: 16, width: '56%', marginTop: 24 }} />
        </div></div>
        <div className="vx-container">
          <div className="vx-grid">
            <div className="skeleton" style={{ height: 620, borderRadius: 32 }} />
            <div className="skeleton" style={{ height: 620, borderRadius: 32 }} />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="vx-shell">
        <div className="vx-container" style={{ paddingTop: 'var(--gh-space-8)' }}>
          <div className="empty">
            <div className="empty__title">体验点加载失败</div>
            <p className="empty__desc">{error.message}。请检查网络后重试。</p>
            <button className="btn btn--secondary btn--sm" type="button" onClick={() => setReloadKey((key) => key + 1)}>
              重新加载
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="vx-shell">
      <section className="vx-hero">
        <div className="vx-hero__inner">
          <div className="vx-hero__copy">
            <h2 className="vx-title">{title}</h2>
            <p className="vx-lead">{subtitle}</p>
          </div>
          <div className="vx-stats" aria-label="体验点统计">
            <div><span className="vx-stat-num"><Odometer value={total} /></span><span>线下合作体验点</span></div>
            <div><span className="vx-stat-num"><Odometer value={provinceCount} /></span><span>覆盖省市</span></div>
            <div><span className="vx-stat-num"><Odometer value={regionCount} /></span><span>大区覆盖</span></div>
          </div>
        </div>
      </section>

      <div className="vx-toolbar">
        <div className="vx-toolbar__inner">
          <label className="vx-search">
            <IconSearch size={15} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索城市、门店或机型"
              aria-label="搜索城市、门店或机型"
            />
            {query && (
              <button className="vx-search__clear" type="button" aria-label="清除搜索" onClick={() => setQuery('')}>
                <IconClose size={10} />
              </button>
            )}
          </label>
          <button className={`vx-tool${nearby ? ' is-active' : ''}`} type="button" onClick={handleNearby} disabled={locating}>
            <IconNavigate size={14} />
            {locating ? '定位中…' : '附近'}
          </button>
          <button className="vx-tool" type="button" onClick={openCity}>
            全部城市
            <IconChevronDown size={12} />
          </button>
          <span className="vx-toolbar__count">{filtered.length} 家</span>
        </div>
        <div className="vx-toolbar__models">
          <span className="vx-toolbar__label">按机型</span>
          <div className="vx-model-chips" role="group" aria-label="按机型筛选">
            {VENUE_MODEL_FAMILIES.map((family) => (
              <button
                key={family}
                className={`vx-chip${model === family ? ' is-active' : ''}`}
                type="button"
                aria-pressed={model === family}
                onClick={() => setModel(family)}
              >
                {family === '全部' ? '全部机型' : family}
              </button>
            ))}
          </div>
        </div>
      </div>

      {geoError && (
        <div className="vx-container">
          <div className="vx-notice" role="status">
            {geoError}
            <button type="button" className="vx-notice__action" onClick={openCity}>选择城市</button>
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="vx-container vx-active">
          <span className="vx-active__label">筛选</span>
          {activeFilters.map((item) => (
            <span className="vx-token" key={item.key}>
              {item.label}
              <button type="button" aria-label={`移除筛选 ${item.label}`} onClick={() => clearFilter(item.key)}>
                <IconClose size={9} />
              </button>
            </span>
          ))}
          <button className="vx-clear" type="button" onClick={resetFilters}>清除全部</button>
        </div>
      )}

      <div className="vx-container">
        <div className={`vx-grid${showMap ? '' : ' vx-grid--list'}`}>
          {showMap && (
            <section className="vx-map-card" aria-label="体验点地图">
              <VenueExplorerMap
                venues={filtered}
                mode={mapMode}
                activeId={activeId}
                userPoint={nearby ? userPoint : null}
                onSelect={selectVenue}
                onClusterSelect={(next) => {
                  setProvince(next)
                  setCity('全部')
                  setNearby(false)
                  setActiveId(null)
                }}
              />
              <div className="vx-map-top">
                <span className="vx-map-pill"><b>{filtered.length}</b> 家 · {mapRegion}</span>
                {(province !== '全部' || city !== '全部' || nearby) && (
                  <button
                    className="vx-map-reset"
                    type="button"
                    onClick={() => {
                      setProvince('全部')
                      setCity('全部')
                      setNearby(false)
                      setUserPoint(null)
                      setActiveId(null)
                    }}
                  >
                    全国视图 ×
                  </button>
                )}
              </div>

              {selected && (
                <div className="vx-detail">
                  <button className="vx-detail__close" type="button" aria-label="关闭" onClick={() => setActiveId(null)}>
                    <IconClose size={13} />
                  </button>
                  <div className="vx-detail__tag">{provinceShort(selected.province)} · {venueTypeLabel(selected.type)}</div>
                  <h3 className="vx-detail__name">{selected.name}</h3>
                  <p className={`vx-detail__addr${selected.address ? '' : ' is-todo'}`}>
                    {selected.address || '地址待补充'}
                  </p>
                  {(selected.products ?? []).length > 0 && (
                    <div className="vx-detail__models">
                      {(selected.products ?? []).map((item) => <span className="vx-model" key={item}>{item}</span>)}
                    </div>
                  )}
                  <div className="vx-detail__actions">
                    <a className="vx-btn vx-btn--dark" href={venueNavigationUrl(selected)} target="_blank" rel="noopener noreferrer">
                      <IconNavigate size={14} /> 到这里去
                    </a>
                    <button className="vx-btn" type="button" onClick={handleCopy}>
                      <IconCopy size={14} /> {copied ? '已复制' : '复制地址'}
                    </button>
                    <Link className="vx-btn" to={`/business/venues/${selected.id}`}>查看详情</Link>
                  </div>
                </div>
              )}
            </section>
          )}

          <section className="vx-list-card" aria-label="体验点列表">
            <div className="vx-list-head">
              <span className="vx-list-title">
                {nearby ? '离你最近' : city !== '全部' ? `${city}体验点` : province !== '全部' ? `${provinceShort(province)}体验点` : query || model !== '全部' ? '筛选结果' : '全部体验点'}
              </span>
              <span className="vx-list-hint">{nearby ? '按距离排序' : '点击查看位置与导航'}</span>
            </div>
            <div className="vx-list">
              {filtered.length === 0 ? (
                <div className="vx-empty">
                  <div className="vx-empty__icon"><IconSearch size={18} /></div>
                  <div className="vx-empty__title">没有找到匹配的体验点</div>
                  <p className="vx-empty__desc">试试更换机型，或查看全国门店。</p>
                  <button className="vx-btn vx-btn--dark" type="button" onClick={resetFilters}>查看全国体验点</button>
                </div>
              ) : grouped ? (
                groups.map((group) => (
                  <div className="vx-group" key={group.province}>
                    <div className="vx-group__head">
                      {venueRegionName(group.province)} · {provinceShort(group.province)}
                      <b>{group.items.length}</b>
                    </div>
                    {group.items.map((venue) => (
                      <VenueRow
                        key={venue.id}
                        venue={venue}
                        active={venue.id === activeId}
                        nearby={nearby}
                        userPoint={userPoint}
                        onClick={() => selectVenue(venue.id)}
                      />
                    ))}
                  </div>
                ))
              ) : (
                filtered.map((venue) => (
                  <VenueRow
                    key={venue.id}
                    venue={venue}
                    active={venue.id === activeId}
                    nearby={nearby}
                    userPoint={userPoint}
                    onClick={() => selectVenue(venue.id)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      {cityOpen && createPortal(
        <div className="vx-modal" role="presentation">
          <div className="vx-modal__backdrop" onClick={() => setCityOpen(false)} />
          <div className="vx-city-dialog" role="dialog" aria-modal="true" aria-labelledby="vx-city-title">
            <div className="vx-city-head">
              <div className="vx-city-head__row">
                <h2 className="vx-city-title" id="vx-city-title">选择城市</h2>
                <button className="vx-modal__close" type="button" aria-label="关闭" onClick={() => setCityOpen(false)}>
                  <IconClose size={14} />
                </button>
              </div>
              <label className="vx-city-search">
                <IconSearch size={14} />
                <input
                  value={cityQuery}
                  onChange={(event) => setCityQuery(event.target.value)}
                  placeholder="搜索省市，例如：广东 / 成都"
                  aria-label="搜索省市"
                />
              </label>
            </div>
            <div className="vx-city-body">
              <aside className="vx-city-regions">
                {['全部', ...VENUE_REGIONS.map((region) => region.name)].map((name) => (
                  <button
                    className={`vx-city-region${cityRegion === name ? ' is-active' : ''}`}
                    type="button"
                    key={name}
                    onClick={() => setCityRegion(name)}
                  >
                    {name}
                    <span>{regionCounts.get(name) ?? 0}</span>
                  </button>
                ))}
              </aside>
              <div className="vx-city-list">
                <button className="vx-city-all" type="button" onClick={() => pickProvince('全部')}>
                  全国 <span>{total} 家体验点</span>
                </button>
                {cityRegion === '全部' && quickFiltered.length > 0 && (
                  <div className="vx-city-group">
                    <div className="vx-city-group__name">快速查看</div>
                    <div className="vx-city-grid">
                      {quickFiltered.map((item) => (
                        <button
                          className={`vx-city-item${city === item.name ? ' is-active' : ''}`}
                          type="button"
                          key={item.name}
                          onClick={() => pickCity(item.name)}
                        >
                          {item.name}<span>{item.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {cityGroups.map((group) => (
                  <div className="vx-city-group" key={group.name}>
                    <div className="vx-city-group__name">{group.name}</div>
                    <div className="vx-city-grid">
                      {group.provinces.map((item) => (
                        <button
                          className={`vx-city-item${province === item ? ' is-active' : ''}`}
                          type="button"
                          key={item}
                          onClick={() => pickProvince(item)}
                        >
                          {provinceShort(item)}<span>{provinceCounts.get(item) ?? 0}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {cityGroups.length === 0 && quickFiltered.length === 0 && (
                  <p className="vx-city-empty">没有找到匹配的省市</p>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}

/** 老虎机式数字滚动：每位数字一条 0–9 轨道，挂载后滚动到目标位。 */
function Odometer({ value }: { value: number }) {
  const [run, setRun] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setRun(true), 120)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <span className={`vx-odo${run ? ' is-run' : ''}`} role="img" aria-label={String(value)}>
      {Array.from(String(value)).map((char, index) =>
        /\d/.test(char) ? (
          <span className="vx-odo__digit" aria-hidden="true" key={`${char}-${index}`}>
            <span className="vx-odo__track" style={{ '--d': Number(char) } as CSSProperties}>
              {Array.from({ length: 20 }, (_, n) => (
                <span className="vx-odo__cell" key={n}>{n % 10}</span>
              ))}
            </span>
          </span>
        ) : (
          <span aria-hidden="true" key={`${char}-${index}`}>{char}</span>
        ),
      )}
    </span>
  )
}

/** 门店列表行：展示名称、地址与距离，点击切换当前选中门店 */
function VenueRow({
  venue,
  active,
  nearby,
  userPoint,
  onClick,
}: {
  venue: VenueSummary
  active: boolean
  nearby: boolean
  userPoint: GeoPoint | null
  onClick: () => void
}) {
  const distance = nearby && userPoint ? distanceKm(userPoint, venue) : null
  return (
    <button className={`vx-row${active ? ' is-active' : ''}`} type="button" onClick={onClick}>
      <span className="vx-row__main">
        <span className="vx-row__top">
          <span className="vx-row__name">{venue.name}</span>
          <span className="vx-row__badge">{venueTypeLabel(venue.type)}</span>
        </span>
        <span className={`vx-row__addr${venue.address ? '' : ' is-todo'}`}>{venue.address || '地址待补充'}</span>
        <span className="vx-row__foot">
          {(venue.products ?? []).map((item) => <span className="vx-model" key={item}>{item}</span>)}
          {nearby && (
            <span className="vx-row__dist">{distance === null ? '距离未知' : formatDistance(distance)}</span>
          )}
        </span>
      </span>
      <span className="vx-row__arrow">›</span>
    </button>
  )
}
