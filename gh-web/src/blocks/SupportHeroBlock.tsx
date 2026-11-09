/**
 * 服务支持页头（区块）：标题 + 搜索 + 热门词 + 登录引导。
 *
 * 取代原先 SupportPage.tsx 里硬编码的 hero，所有文案由后台「页面装修」维护。
 * 搜索统一跳到全站搜索结果页（/search?q=），与站内搜索保持同一入口。
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IconSearch } from '../components/ui/Icon'
import { asBool, asString, asStringArray } from './blockUtils'

export function SupportHeroBlock({ props }: { props: Record<string, unknown> }) {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const title = asString(props.title, '服务与支持')
  const desc = asString(props.desc)
  const showSearch = asBool(props.showSearch, true)
  const placeholder = asString(props.searchPlaceholder, '搜索型号、资料或问题关键词')
  const hotKeywords = asStringArray(props.hotKeywords)
  const loginLabel = asString(props.loginLabel)
  const loginHref = asString(props.loginHref, '/me/devices')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const query = keyword.trim()
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search')
  }

  return (
    <section className="support-hero">
      <div className="container support-hero__inner">
        <h1 className="support-hero__title">{title}</h1>
        {desc ? <p className="support-hero__desc">{desc}</p> : null}

        {showSearch ? (
          <form className="support-hero__search" onSubmit={submit} role="search">
            <IconSearch size={18} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
            />
            <button type="submit">搜索</button>
          </form>
        ) : null}

        {hotKeywords.length ? (
          <div className="support-hero__hot">
            <span>热门：</span>
            {hotKeywords.map((word) => (
              <Link key={word} to={`/search?q=${encodeURIComponent(word)}`}>
                {word}
              </Link>
            ))}
          </div>
        ) : null}

        {loginLabel ? (
          <p className="support-hero__login">
            已购买？<Link to={loginHref}>{loginLabel}</Link>
          </p>
        ) : null}
      </div>
    </section>
  )
}
