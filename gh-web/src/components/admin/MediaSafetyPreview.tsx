/**
 * 海报 / 产品矩阵图片字段的「安全区」示意预览框。
 * ============================================================
 * - 外框：该区块**当前比例**的半透明虚线框（无投影，尺寸随容器自适应，窄屏不溢出）；
 * - 内框：安全区虚线框（向内缩约 7%），提示「文字与主体请放在安全区内」；
 * - 框内以极简文字标出「比例 + 建议尺寸」，如 `21:9 · 2520×1080`。
 *
 * 比例与建议尺寸均由 `mediaHints.ts` 按区块当前配置解析后传入，
 * 避免此处再自行推断。样式沿用后台既有令牌与 class 风格（见 admin.css `.media-safety`）。
 */
import { ratioToAspect } from './mediaHints'

export function MediaSafetyPreview({ ratio, size }: { ratio: string; size: string }) {
  return (
    <div className="media-safety">
      <div className="media-safety__frame" style={{ aspectRatio: ratioToAspect(ratio) }}>
        <div className="media-safety__safe">
          <span className="media-safety__tag">
            {ratio} · {size}
          </span>
        </div>
      </div>
      <span className="field__hint">文字与主体请放在安全区内</span>
    </div>
  )
}
