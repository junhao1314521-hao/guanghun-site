/**
 * 3. video 视频（契约 §4）
 * props: title / desc / url / poster
 *
 * url 为空时仅展示封面占位（不渲染空播放器），保留既有设计语言。
 */
import { MediaImg } from '../components/ui/MediaImg'
import { SectionHeadFromProps } from '../components/home/SectionHead'
import { asString } from './blockUtils'

export function VideoBlock({ props }: { props: Record<string, unknown> }) {
  const title = asString(props.title)
  const url = asString(props.url)
  const poster = asString(props.poster)

  return (
    <div>
      {title && <SectionHeadFromProps props={props} />}
      <div className="blk-video__frame">
        {url ? <video src={url} poster={poster || undefined} controls preload="metadata" /> : <MediaImg src={poster} alt={title} />}
      </div>
    </div>
  )
}