import { Button, Result, Space } from 'antd'
import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ERROR } from '@/components/fallback/constants.ts'
import styles from '@/components/fallback/error-boundary.module.scss'

interface ErrorBoundaryProps {
  children: ReactNode
  title?: string
  subTitle?: string
  onError?: (error: Error, info: ErrorInfo) => void
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleRetry = this.handleRetry.bind(this)
    this.handleReload = this.handleReload.bind(this)
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  handleRetry() {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }

  handleReload() {
    window.location.reload()
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    const title = this.props.title ?? ERROR.TITLE
    const subTitle = this.props.subTitle ?? ERROR.SUBTITLE

    return (
      <div
        className={styles.root}
        role="alert"
        aria-live="assertive">
        <Result
          status="error"
          title={title}
          subTitle={subTitle}
          extra={
            <Space size="middle">
              <Button
                type="primary"
                onClick={this.handleRetry}>
                {ERROR.RETRY}
              </Button>
              <Button onClick={this.handleReload}>{ERROR.RELOAD}</Button>
            </Space>
          }
        />
      </div>
    )
  }
}
