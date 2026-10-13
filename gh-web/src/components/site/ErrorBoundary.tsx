import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  /** 渲染兜底 UI；入参 reset 用于清除错误并重新渲染子树 */
  renderFallback: (reset: () => void) => ReactNode
}

type State = { hasError: boolean }

/**
 * 路由级错误边界：捕获子树渲染异常，避免整页白屏。
 * 由调用方通过 renderFallback 注入兜底 UI（以便复用 i18n 文案）；
 * 路由变化时由调用方更换 key 重置本边界。
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 先落控制台便于定位；接入监控后在此上报
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false })

  render() {
    if (this.state.hasError) return this.props.renderFallback(this.reset)
    return this.props.children
  }
}