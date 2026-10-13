/** 接口层 · 法律与合规页资源：页面通过本模块取数，不直接 import data/legal */
import { ApiError, transport } from './client'
import { LEGAL_DOCS, type LegalDoc } from '../data/legal'

/** 法律文档列表：一次返回全部文档（覆盖页脚可达的各法律页） */
export function fetchLegalDocs(signal?: AbortSignal): Promise<LegalDoc[]> {
  return transport({ path: '/api/legal', signal }, () => LEGAL_DOCS)
}

/** 单篇法律文档：按 slug 查询，未命中抛 404 供页面区分「不存在」 */
export function fetchLegalDoc(slug: string, signal?: AbortSignal): Promise<LegalDoc> {
  return transport({ path: `/api/legal/${slug}`, signal }, () => {
    const doc = LEGAL_DOCS.find((item) => item.slug === slug)
    if (!doc) throw new ApiError('未找到该法律文档', 404)
    return doc
  })
}