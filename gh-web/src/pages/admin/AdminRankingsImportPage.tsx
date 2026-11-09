import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  fetchRankingMetrics,
  importRankingRows,
  type RankingImportRow,
  type RankingMetricSummary,
} from '../../api/admin'
import { useApi } from '../../hooks/useApi'
import { AdminPageHead } from '../../components/admin/AdminPageHead'
import { useToast } from '../../components/admin/feedback'

/** CSV 表头别名（中英文兼容；比较时统一小写并去空格） */
const HEADER_ALIASES: Record<string, string[]> = {
  model: ['型号', 'model'],
  name: ['品牌', 'name', 'brand'],
  score: ['数值', '分数', 'score', 'value'],
  inf: ['无限', '∞', 'inf', 'infinity'],
  productId: ['产品id', 'productid', 'product'],
  metric: ['指标', '榜单', 'metric'],
}

type ParsedRow = {
  line: number
  /** CSV 中的指标（id 或中文名），空表示使用页面所选指标 */
  metric: string
  row: RankingImportRow
}

type ParseResult = {
  rows: ParsedRow[]
  /** 是否提供了指标列 */
  hasMetric: boolean
  /** 缺失的必填表头 */
  missing: string[]
}

/** 归一化表头：小写 + 去空格 */
function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase()
}

/** 解析 CSV（支持引号转义、CRLF、BOM） */
function parseCsv(input: string): string[][] {
  const src = input.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < src.length; index += 1) {
    const char = src[index]
    if (quoted) {
      if (char === '"') {
        if (src[index + 1] === '"') {
          cell += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else if (char !== '\r') {
      cell += char
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((line) => line.some((item) => item.trim() !== ''))
}

/** 把 CSV 文本解析为导入行（表头缺失时返回 missing，供前端提示） */
function parseRows(csv: string): ParseResult {
  const table = parseCsv(csv)
  if (table.length === 0) return { rows: [], hasMetric: false, missing: [] }
  const headers = table[0].map(normalizeHeader)
  const indexOf = (field: keyof typeof HEADER_ALIASES): number =>
    headers.findIndex((header) => HEADER_ALIASES[field].includes(header))
  const positions = {
    model: indexOf('model'),
    name: indexOf('name'),
    score: indexOf('score'),
    inf: indexOf('inf'),
    productId: indexOf('productId'),
    metric: indexOf('metric'),
  }
  const missing: string[] = []
  if (positions.model < 0) missing.push('型号')
  if (positions.name < 0) missing.push('品牌')
  if (positions.score < 0 && positions.inf < 0) missing.push('数值 / 无限')
  if (missing.length > 0) return { rows: [], hasMetric: positions.metric >= 0, missing }

  const rows: ParsedRow[] = table.slice(1).map((cells, index) => {
    const at = (position: number): string => (position >= 0 ? (cells[position] ?? '').trim() : '')
    return {
      line: index + 2,
      metric: at(positions.metric),
      row: {
        model: at(positions.model),
        name: at(positions.name),
        score: at(positions.score),
        inf: at(positions.inf),
        productId: at(positions.productId),
      },
    }
  })
  return { rows, hasMetric: positions.metric >= 0, missing }
}

/** 指标解析：id 或中文名 */
function resolveMetric(metrics: RankingMetricSummary[], key: string): RankingMetricSummary | undefined {
  return metrics.find((metric) => metric.id === key) ?? metrics.find((metric) => metric.label === key)
}

/**
 * 后台 · 天梯榜批量导入：上传 CSV 覆盖 / 追加某个指标的榜单条目。
 * 名次由服务端按指标方向自动重排，CSV 只需提供型号、品牌与数值（对比度 ∞ 用「无限」列标记）。
 */
export function AdminRankingsImportPage() {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const { data, loading, error } = useApi((signal) => fetchRankingMetrics(signal), [reloadKey])
  const metrics = data?.items ?? []

  const [metricKey, setMetricKey] = useState('overall')
  const [mode, setMode] = useState<'replace' | 'append'>('replace')
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)

  const parsed = useMemo(() => parseRows(csv), [csv])
  const effectiveMetric = resolveMetric(metrics, metricKey) ?? metrics[0]
  const preview = parsed.rows.slice(0, 12)

  /** 读取 CSV 文件（UTF-8） */
  const pickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsv(typeof reader.result === 'string' ? reader.result : '')
      setFileName(file.name)
    }
    reader.onerror = () => toast.error('文件读取失败，请重新选择')
    reader.readAsText(file, 'utf-8')
  }

  /** 下载模板（含当前所选指标） */
  const downloadTemplate = () => {
    const label = effectiveMetric?.label ?? '综合'
    const content = `\uFEFF指标,型号,品牌,数值,无限,产品ID\n${label},示例型号A,示例品牌,1200,,\n${label},示例型号B,示例品牌,,是,\n`
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = '天梯榜导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  /** 按指标分组后逐个提交（CSV 无指标列时全部归入所选指标） */
  const submit = async () => {
    if (!parsed.rows.length) {
      toast.error('请先选择或粘贴 CSV 内容')
      return
    }
    const groups = new Map<string, RankingImportRow[]>()
    for (const item of parsed.rows) {
      const key = item.metric || effectiveMetric?.id || ''
      if (!resolveMetric(metrics, key)) {
        toast.error(`第 ${item.line} 行：无法识别指标「${item.metric}」`)
        return
      }
      if (!item.row.model || !item.row.name) {
        toast.error(`第 ${item.line} 行：型号与品牌不能为空`)
        return
      }
      const list = groups.get(key) ?? []
      list.push(item.row)
      groups.set(key, list)
    }

    setImporting(true)
    try {
      let imported = 0
      const labels: string[] = []
      for (const [key, rows] of groups) {
        const result = await importRankingRows({ metric: key, mode, rows })
        imported += result.imported
        labels.push(`${result.metric.label} ${result.metric.total} 条`)
      }
      toast.success(`导入成功：${imported} 条（${labels.join('，')}）`)
      setReloadKey((value) => value + 1)
    } catch (ex) {
      toast.error(ex instanceof Error ? ex.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="admin-page">
      <AdminPageHead
        title="天梯榜导入"
        desc="用 CSV 批量导入榜单条目：名次按数值自动重排，对比度 ∞ 用「无限」列标记；覆盖模式会替换该指标的全部条目。"
      />

      <div className="admin-form">
        <section className="admin-form__section">
          <div className="admin-form__grid">
            <div className="field">
              <label className="field__label" htmlFor="rankingMetric">
                目标指标
              </label>
              <select
                className="input"
                id="rankingMetric"
                value={effectiveMetric?.id ?? metricKey}
                onChange={(event) => setMetricKey(event.target.value)}
                disabled={loading || metrics.length === 0}
              >
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.label}（{metric.unit}，{metric.count} 条）
                  </option>
                ))}
              </select>
              <span className="field__hint">CSV 含「指标」列时，以每行的指标为准，可一次导入多个榜单。</span>
            </div>
            <div className="field">
              <label className="field__label" htmlFor="rankingMode">
                导入方式
              </label>
              <select
                className="input"
                id="rankingMode"
                value={mode}
                onChange={(event) => setMode(event.target.value === 'append' ? 'append' : 'replace')}
              >
                <option value="replace">覆盖：替换该指标全部条目</option>
                <option value="append">追加：同型号更新，其余保留</option>
              </select>
            </div>
            <div className="field admin-form__field--full">
              <label className="field__label" htmlFor="rankingFile">
                CSV 文件
              </label>
              <input
                ref={fileRef}
                className="input"
                id="rankingFile"
                type="file"
                accept=".csv,text/csv"
                onChange={pickFile}
              />
              <span className="field__hint">
                {fileName ? `已选择：${fileName}` : 'UTF-8 编码；必填列：型号、品牌、数值（或「无限」列）。'}
              </span>
            </div>
            <div className="field admin-form__field--full">
              <label className="field__label" htmlFor="rankingCsv">
                或直接粘贴 CSV
              </label>
              <textarea
                className="input"
                id="rankingCsv"
                rows={8}
                spellCheck={false}
                placeholder={'指标,型号,品牌,数值,无限,产品ID\n综合,三星OLEDG8,三星,77.2,,\n综合,外星人AW2725DF,外星人,64.8,,'}
                value={csv}
                onChange={(event) => {
                  setCsv(event.target.value)
                  setFileName('')
                }}
              />
            </div>
          </div>

          <div className="row" style={{ marginTop: 'var(--gh-space-4)', gap: 'var(--gh-space-2)', flexWrap: 'wrap' }}>
            <button className="btn btn--secondary btn--sm" type="button" onClick={downloadTemplate}>
              下载模板
            </button>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => {
                setCsv('')
                setFileName('')
                if (fileRef.current) fileRef.current.value = ''
              }}
            >
              清空
            </button>
            <span className="admin-toolbar__spacer" />
            <button
              className={`btn btn--primary${importing ? ' btn--loading' : ''}`}
              type="button"
              disabled={importing || !parsed.rows.length || parsed.missing.length > 0}
              onClick={() => void submit()}
            >
              开始导入{parsed.rows.length > 0 ? `（${parsed.rows.length} 条）` : ''}
            </button>
          </div>
        </section>

        {error && (
          <p className="field__error" style={{ marginTop: 'var(--gh-space-4)' }}>
            榜单加载失败：{error.message}
          </p>
        )}
        {parsed.missing.length > 0 && (
          <p className="field__error" style={{ marginTop: 'var(--gh-space-4)' }}>
            缺少必填列：{parsed.missing.join('、')}
          </p>
        )}

        {preview.length > 0 && (
          <section className="admin-form__section">
            <h3 className="admin-form__section-title">预览（前 {preview.length} 条）</h3>
            <div className="admin-table-wrap">
              <div className="admin-table-scroll">
                <table className="table admin-table">
                  <thead>
                    <tr>
                      <th scope="col">行号</th>
                      {parsed.hasMetric && <th scope="col">指标</th>}
                      <th scope="col">型号</th>
                      <th scope="col">品牌</th>
                      <th scope="col">数值</th>
                      <th scope="col">∞</th>
                      <th scope="col">产品 ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((item) => (
                      <tr key={item.line}>
                        <td>{item.line}</td>
                        {parsed.hasMetric && <td>{item.metric || effectiveMetric?.label || '—'}</td>}
                        <td>{item.row.model || '—'}</td>
                        <td>{item.row.name || '—'}</td>
                        <td>{item.row.inf ? '∞' : item.row.score || '—'}</td>
                        <td>{item.row.inf ? '是' : '—'}</td>
                        <td>{item.row.productId || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
