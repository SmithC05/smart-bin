export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-green-100 border-t-green-600 animate-spin" />
      <p className="text-sm text-gray-400 font-medium">Loading…</p>
    </div>
  )
}
