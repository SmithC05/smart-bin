import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Props:
 *  message  – error string to display
 *  onRetry  – callback for the Retry button
 */
export default function ErrorBanner({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1 font-medium">{message ?? 'Something went wrong.'}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition text-xs font-semibold"
        >
          <RefreshCw className="w-3 h-3" />
          Retry
        </button>
      )}
    </div>
  )
}
