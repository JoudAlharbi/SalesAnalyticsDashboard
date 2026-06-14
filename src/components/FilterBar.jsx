function FilterSelect({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px] flex-1 lg:flex-none">
      <label htmlFor={`filter-${label}`} className="text-[11px] font-medium text-slate-500">
        {label}
      </label>
      <select
        id={`filter-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 px-3 text-[13px] text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 cursor-pointer"
      >
        <option value="All">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function FilterBar({ filters, options, onFilterChange, onReset, resultCount }) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== 'All');

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-wrap gap-3 flex-1">
        <FilterSelect
          label="Region"
          value={filters.region}
          options={options.regions}
          onChange={(v) => onFilterChange('region', v)}
        />
        <FilterSelect
          label="Category"
          value={filters.category}
          options={options.categories}
          onChange={(v) => onFilterChange('category', v)}
        />
        <FilterSelect
          label="Segment"
          value={filters.segment}
          options={options.segments}
          onChange={(v) => onFilterChange('segment', v)}
        />
        <FilterSelect
          label="Year"
          value={filters.year}
          options={options.years}
          onChange={(v) => onFilterChange('year', v)}
        />
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="h-9 px-4 text-[13px] text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-end"
          >
            Reset filters
          </button>
        )}
      </div>
      <p className="text-[12px] text-slate-400 tabular-nums shrink-0">
        {resultCount.toLocaleString()} records
      </p>
    </div>
  );
}
