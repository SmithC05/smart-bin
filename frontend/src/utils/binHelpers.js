// Shared fill-level helpers used by all pages

export function fillColor(pct) {
  if (pct >= 80) return '#dc2626'
  if (pct >= 60) return '#d97706'
  return '#16a34a'
}

export function fillLabel(pct) {
  if (pct >= 80) return 'Full'
  if (pct >= 60) return 'High'
  return 'OK'
}

export function fillBadgeClass(pct) {
  if (pct >= 80) return 'bg-red-100 text-red-700'
  if (pct >= 60) return 'bg-amber-100 text-amber-700'
  return 'bg-green-100 text-green-700'
}

/** Format an ISO date string as "DD MMM, HH:mm" */
export function formatDate(isoStr) {
  const d = new Date(isoStr)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** Return a "X min/hr ago" relative string */
export function timeAgo(isoStr) {
  const diff = Math.floor((Date.now() - new Date(isoStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} day(s) ago`
}
