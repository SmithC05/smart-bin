export default function StatusBadge({ status, type = 'bin' }) {
  let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status?.toUpperCase() || 'UNKNOWN';

  if (type === 'bin') {
    switch (status?.toLowerCase()) {
      case 'ok':
      case 'normal':
        colorClass = 'bg-green-50 text-green-700 border-green-200';
        label = 'NORMAL';
        break;
      case 'high':
      case 'warning':
        colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
        label = 'WARNING';
        break;
      case 'full':
      case 'critical':
        colorClass = 'bg-red-50 text-red-700 border-red-200';
        label = 'CRITICAL';
        break;
      case 'offline':
        colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'alert') {
    switch (status?.toLowerCase()) {
      case 'open':
        colorClass = 'bg-red-50 text-red-700 border-red-200';
        break;
      case 'acknowledged':
        colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'resolved':
        colorClass = 'bg-slate-50 text-slate-600 border-slate-200';
        break;
    }
  } else if (type === 'route') {
    switch (status?.toLowerCase()) {
      case 'planned':
        colorClass = 'bg-blue-50 text-blue-700 border-blue-200';
        break;
      case 'dispatched':
        colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
        break;
      case 'completed':
        colorClass = 'bg-green-50 text-green-700 border-green-200';
        break;
      case 'cancelled':
        colorClass = 'bg-slate-100 text-slate-600 border-slate-200';
        break;
    }
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-none text-[11px] font-bold uppercase tracking-wider border ${colorClass}`}>
      {label}
    </span>
  );
}
