'use client'
import { Component, type ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode; fallback?: ReactNode; sectionName?: string }
interface State { hasError: boolean; error: string | null }

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, error: err.message }
  }

  componentDidCatch(error: Error) {}

  handleReset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-red-700">
              {this.props.sectionName || 'Section'} failed to load
            </p>
            {this.state.error && (
              <p className="text-xs text-red-500 mt-0.5 truncate">{this.state.error}</p>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium shrink-0"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
