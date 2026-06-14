export default function Insights({ items }) {
  if (!items.length) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="text-[13px] text-slate-500">No insights available for the current selection.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.title} className="card px-5 py-5">
          <h3 className="text-[14px] font-semibold text-slate-900">{item.title}</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[11px] font-medium text-slate-500">Finding</p>
              <p className="mt-1 text-[13px] text-slate-800 leading-snug">{item.finding}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Why it matters</p>
              <p className="mt-1 text-[13px] text-slate-600 leading-snug">{item.whyItMatters}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
