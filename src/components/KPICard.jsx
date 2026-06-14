function Sparkline({ data, color = '#64748b' }) {
  if (!data?.length) return <div className="h-8" />;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1 || 1)) * (w - padding * 2);
    const y = padding + (1 - (v - min) / range) * (h - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendBadge({ value, label }) {
  if (value === null || value === undefined) {
    return <span className="text-[11px] text-slate-400">—</span>;
  }

  const positive = value > 0;
  const negative = value < 0;
  const color = positive ? 'text-emerald-600' : negative ? 'text-red-600' : 'text-slate-500';

  return (
    <span className={`text-[11px] font-medium tabular-nums ${color}`}>
      {positive ? '+' : ''}{value.toFixed(1)}%
      {label && <span className="text-slate-400 font-normal"> vs {label}</span>}
    </span>
  );
}

export default function KPICard({ title, value, trend, trendLabel, sparklineData }) {
  return (
    <div className="card px-5 py-5 h-full flex flex-col">
      <p className="text-[12px] font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-[28px] font-semibold text-slate-900 tabular-nums tracking-tight leading-none">
        {value}
      </p>
      <div className="mt-2">
        <TrendBadge value={trend} label={trendLabel} />
      </div>
      <div className="mt-auto pt-4">
        <Sparkline data={sparklineData} />
      </div>
    </div>
  );
}
