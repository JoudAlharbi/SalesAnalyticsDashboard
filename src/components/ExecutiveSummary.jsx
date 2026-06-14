export default function ExecutiveSummary({ items }) {
  if (!items.length) return null;

  return (
    <div className="card h-full flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-[14px] font-semibold text-slate-900">Executive Summary</h3>
        <p className="text-[12px] text-slate-500 mt-1">Data-backed observations from the current selection</p>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {items.map((item) => (
          <div key={item.title} className="space-y-2">
            <p className="text-[12px] font-medium text-slate-400">{item.title}</p>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Finding</p>
              <p className="mt-0.5 text-[13px] text-slate-800 leading-snug">{item.finding}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Why it matters</p>
              <p className="mt-0.5 text-[13px] text-slate-600 leading-snug">{item.whyItMatters}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
