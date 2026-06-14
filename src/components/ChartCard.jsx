export default function ChartCard({ title, description, children, className = '', tall = false, chartMinHeight }) {
  const bodyMinHeight = chartMinHeight ?? (tall ? 320 : 260);

  return (
    <div className={`card flex flex-col h-full ${className}`}>
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
        {description && (
          <p className="text-[12px] text-slate-500 mt-1">{description}</p>
        )}
      </div>
      <div
        className="px-4 py-5 flex-1 min-h-0"
        style={{ minHeight: bodyMinHeight }}
      >
        {children}
      </div>
    </div>
  );
}
