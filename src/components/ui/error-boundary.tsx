"use client"

import React, { Component, ReactNode } from "react"
import { ErrorState } from "./error-state"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorState
          title="Something went wrong"
          description="An unexpected error occurred. Please try refreshing the page."
          onRetry={() => {
            this.setState({ hasError: false, error: undefined })
            window.location.reload()
          }}
          fullPage
        />
      )
    }

    return this.props.children
  }
}
