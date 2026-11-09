/**
 * 下游裁切预览（后台图片字段）。
 * ============================================================
 * 上传后按「真实出现位置」的宽高比渲染缩略框，让运营在上传时就看到
 * 这张图在产品卡 / 详情主图 / Center 卡里会不会被裁掉。
 *
 * 只做视觉预览，不参与保存；比例由调用方按槽位给出（与前台 CSS 对齐）。
 * - `cover`：铺满裁切（列表卡、海报、Center 卡）；
 * - `contain`：完整显示（详情页主图，透明底产品图常用）。
 */

/** 一个预览位：标签 + 目标宽高比 + 填充方式 + 底色 */
export type CropPreviewSpec = {
  /** 预览标签，如「产品列表卡 4:3」 */
  label: string
  /** CSS aspect-ratio 取值，如 '4 / 3' */
  ratio: string
  /** 填充方式，默认 cover */
  fit?: 'cover' | 'contain'
  /** 底色：dark 用于深色版式，light 用于浅色版式 */
  tone?: 'dark' | 'light'
}

/** 组件：一组下游裁切预览框 */
export function ImageCropPreview({ src, crops }: { src: string; crops: CropPreviewSpec[] }) {
  if (!src || crops.length === 0) return null
  return (
    <div className="image-crops">
      {crops.map((crop) => (
        <figure className="image-crops__item" key={crop.label}>
          <div
            className={`image-crops__frame${crop.tone === 'dark' ? ' image-crops__frame--dark' : ''}`}
            style={{ aspectRatio: crop.ratio }}
          >
            <img src={src} alt="" loading="lazy" className={crop.fit === 'contain' ? 'is-contain' : undefined} />
          </div>
          <figcaption className="image-crops__label">{crop.label}</figcaption>
        </figure>
      ))}
    </div>
  )
}
