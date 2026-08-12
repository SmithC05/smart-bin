export function Card({ children, className = '', title, action }) {
  return (
    <div className={`bg-white border border-slate-300 rounded-none overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-300 bg-slate-100">
          {title && <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">
        {children}
      </div>
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return (
    <div className={`px-4 py-3 border-b border-slate-300 bg-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-sm font-bold text-slate-800 uppercase tracking-wide ${className}`}>
      {children}
    </h3>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

export default Card;
