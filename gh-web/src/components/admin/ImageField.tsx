/**
 * 图片字段控件（后台表单 / 区块编辑器共用）。
 * ============================================================
 * 由 `FileField`（通用文件 / 图片控件）在 `variant="image"` 模式下的薄封装：
 * - 仅接受图片类型（png / jpg / jpeg / webp / gif / svg）；非图片文件给出可见错误；
 * - 素材库选择弹窗只列图片缩略图；
 * - 填好地址后展示预览缩略图（复用 MediaImg 兜底）。
 *
 * 通用实现与素材库弹窗见 `FileField.tsx`（支持任意允许类型文件），此处不再重复。
 */
import { FileField } from './FileField'

export type ImageFieldProps = {
  /** 当前图片地址（受控） */
  value: string
  /** 地址变化回调（手动输入 / 上传成功 / 素材库选择） */
  onChange: (url: string) => void
  /** 地址输入框 id（用于与 label 关联） */
  inputId?: string
  /** 字段名（用于 alt / 无障碍标签） */
  label?: string
  /** 输入框占位文案 */
  placeholder?: string
  /** 预览图额外 class（如区块编辑器的既有预览样式） */
  previewClassName?: string
}

export function ImageField(props: ImageFieldProps) {
  return <FileField variant="image" {...props} />
}

/**
 * 媒体字段控件（图片 / GIF / 视频）。
 * 用于区块编辑器里标注「媒体（图/视频/GIF）」的字段：上传与素材库选择均支持视频，
 * 预览按类型呈现缩略图或视频播放器。
 */
export function MediaField(props: ImageFieldProps) {
  return <FileField variant="media" {...props} />
}
