/**
 * 商品评价：后台录入 + 审核，详情页仅下发「已通过」的评价（最多 3 条）。
 * 记录本体存集合存储（key: product-reviews）；本模块只定义形状、seed 与筛选逻辑，
 * 不新造评价事实（seed 为空，由运营在后台录入真实评价）。
 */

/** 后台评价记录（product-reviews 集合的规范形状） */
export type ProductReviewRecord = {
  id: string
  /** 关联产品 ID（products 集合的 id） */
  productId: string
  /** 评价人昵称 */
  nickname: string
  /** 评分 1–5 */
  rating: number
  /** 评价正文 */
  content: string
  /** 购买型号（可选，前台展示在昵称后） */
  purchasedModel?: string
  /** 标签（可选，如：色彩 / 做工） */
  tags?: string[]
  /** 审核状态：待审核 / 已通过 / 已拒绝 */
  status: string
  /** 提交时间（YYYY-MM-DD） */
  createdAt?: string
}

/** 详情页评价（前台结构，不含后台审核字段） */
export type ProductReviewView = {
  id: string
  nickname: string
  rating: number
  content: string
  purchasedModel?: string
  tags?: string[]
}

/** 审核通过状态文案（后台下拉与详情筛选共用，避免拼写漂移） */
export const APPROVED_REVIEW_STATUS = '已通过'

/** seed：空集合（评价必须来自真实用户，不造假数据） */
export const PRODUCT_REVIEWS: ProductReviewRecord[] = []

/** 取某产品已通过的评价（按集合顺序，最多 take 条）→ 详情页结构 */
export function approvedReviewsFor(
  reviews: ProductReviewRecord[],
  productId: string,
  take = 3,
): ProductReviewView[] {
  return reviews
    .filter((item) => item.productId === productId && item.status === APPROVED_REVIEW_STATUS)
    .slice(0, take)
    .map((item) => {
      const view: ProductReviewView = {
        id: item.id,
        nickname: item.nickname,
        rating: Number(item.rating) || 5,
        content: item.content,
      }
      if (item.purchasedModel) view.purchasedModel = item.purchasedModel
      if (item.tags?.length) view.tags = item.tags
      return view
    })
}
