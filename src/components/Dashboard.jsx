import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList,
} from 'recharts';
import { Menu } from 'lucide-react';

import Sidebar from './Sidebar';
import KPICard from './KPICard';
import FilterBar from './FilterBar';
import ChartCard from './ChartCard';
import Insights from './Insights';
import ExecutiveSummary from './ExecutiveSummary';
import {
  parseCSVData,
  getFilterOptions,
  applyFilters,
  calculateKPIsWithTrends,
  getMonthlyTrend,
  aggregateByField,
  getTopProducts,
  getDiscountProfitAnalysis,
  generateAnalystInsights,
  generateExecutiveSummary,
  formatCurrency,
  formatNumber,
  formatPercent,
} from '../utils/dataProcessing';

const CHART = {
  grid: '#f1f3f5',
  axis: '#e8eaed',
  tick: '#9ca3af',
  line: '#4b5563',
  profit: '#5c6b5a',
  bar: '#7c8da0',
  positive: '#4a6b55',
  negative: '#9b5a62',
};

const PIE_COLORS = ['#4b5563', '#6b7280', '#9ca3af', '#b8c0cc', '#d1d5db'];

const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 0 };

const DEFAULT_FILTERS = {
  region: 'All',
  category: 'All',
  segment: 'All',
  year: 'All',
};

const SECTION_IDS = {
  overview: 'overview',
  sales: 'sales',
  products: 'products',
  regions: 'regions',
  insights: 'insights',
};

function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-1">
      <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight">{title}</h2>
      {subtitle && (
        <p className="text-[13px] text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}

function getMonthlyOrders(data) {
  const monthly = {};
  data.forEach((row) => {
    const key = row.monthLabel;
    if (!monthly[key]) {
      monthly[key] = { sortKey: row.year * 100 + row.month, orders: new Set() };
    }
    monthly[key].orders.add(row.orderId);
  });
  return Object.entries(monthly)
    .sort(([, a], [, b]) => a.sortKey - b.sortKey)
    .map(([, m]) => ({ value: m.orders.size }));
}

function getMonthlyMargin(data) {
  const monthly = {};
  data.forEach((row) => {
    const key = row.monthLabel;
    if (!monthly[key]) {
      monthly[key] = { sortKey: row.year * 100 + row.month, sales: 0, profit: 0 };
    }
    monthly[key].sales += row.sales;
    monthly[key].profit += row.profit;
  });
  return Object.values(monthly)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((m) => ({
      value: m.sales > 0 ? Math.round((m.profit / m.sales) * 1000) / 10 : 0,
    }));
}

function getMonthlyAOV(data) {
  const monthly = {};
  data.forEach((row) => {
    const key = row.monthLabel;
    if (!monthly[key]) {
      monthly[key] = { sortKey: row.year * 100 + row.month, sales: 0, orders: new Set() };
    }
    monthly[key].sales += row.sales;
    monthly[key].orders.add(row.orderId);
  });
  return Object.values(monthly)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map((m) => ({
      value: m.orders.size > 0 ? Math.round((m.sales / m.orders.size) * 100) / 100 : 0,
    }));
}

function truncateName(name, max = 20) {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

function ProductYAxisTick({ x, y, payload }) {
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill="#9ca3af"
      fontSize={11}
      fontWeight={500}
    >
      <tspan style={{ fontVariantNumeric: 'tabular-nums' }}>{payload.value}</tspan>
    </text>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-[12px]">
      {label && <p className="font-medium text-slate-800 mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name ?? entry.dataKey} className="text-slate-600 tabular-nums">
          {entry.name ? `${entry.name}: ` : ''}
          {entry.value}
        </p>
      ))}
    </div>
  );
}

function ValueTooltip({ active, payload, label, formatter = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm text-[12px]">
      {label && <p className="font-medium text-slate-800 mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name ?? entry.dataKey} className="text-slate-600 tabular-nums">
          {entry.name ? `${entry.name}: ` : ''}
          {formatter(entry.value, entry.name)}
        </p>
      ))}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">Loading dashboard</p>
        <p className="mt-1 text-xs text-slate-400">Preparing analytics…</p>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] flex items-center justify-center px-6">
      <div className="card max-w-sm w-full p-8 text-center">
        <h2 className="text-sm font-semibold text-slate-900">Unable to load dashboard</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">{message}</p>
        <button
          onClick={onRetry}
          className="mt-5 h-9 px-4 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
        >
          Reload data
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onReset }) {
  return (
    <div className="card px-6 py-16 text-center">
      <p className="text-sm font-medium text-slate-700">No records match the selected filters</p>
      <p className="mt-1 text-xs text-slate-400">Adjust or reset filters to continue.</p>
      <button
        onClick={onReset}
        className="mt-4 h-9 px-4 text-sm text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
      >
        Reset filters
      </button>
    </div>
  );
}

function formatLastUpdated() {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date());
}

export default function Dashboard() {
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [loadKey, setLoadKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(formatLastUpdated());
  const [activeSection, setActiveSection] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);

    Papa.parse('/superstore.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsed = parseCSVData(results.data);
          if (parsed.length === 0) {
            throw new Error('The dataset contains no valid sales records.');
          }
          setRawData(parsed);
          setLastUpdated(formatLastUpdated());
          setLoading(false);
        } catch (err) {
          setError(err.message || 'Failed to process the dataset.');
          setLoading(false);
        }
      },
      error: (err) => {
        setError(err.message || 'The sales data file could not be loaded.');
        setLoading(false);
      },
    });
  }, [loadKey]);

  const filterOptions = useMemo(() => getFilterOptions(rawData), [rawData]);

  const filteredData = useMemo(
    () => applyFilters(rawData, filters),
    [rawData, filters],
  );

  const kpis = useMemo(() => calculateKPIsWithTrends(filteredData), [filteredData]);

  const chartData = useMemo(() => ({
    monthlyRevenue: getMonthlyTrend(filteredData, 'sales'),
    monthlyProfit: getMonthlyTrend(filteredData, 'profit'),
    salesByRegion: aggregateByField(filteredData, 'region'),
    salesByCategory: aggregateByField(filteredData, 'category'),
    salesBySegment: aggregateByField(filteredData, 'segment'),
    topProducts: getTopProducts(filteredData, 8),
    profitBySubCategory: aggregateByField(filteredData, 'subCategory', 'profit'),
    discountAnalysis: getDiscountProfitAnalysis(filteredData),
  }), [filteredData]);

  const sparklines = useMemo(() => ({
    revenue: getMonthlyTrend(filteredData, 'sales').slice(-12),
    profit: getMonthlyTrend(filteredData, 'profit').slice(-12),
    orders: getMonthlyOrders(filteredData).slice(-12),
    margin: getMonthlyMargin(filteredData).slice(-12),
    aov: getMonthlyAOV(filteredData).slice(-12),
  }), [filteredData]);

  const rankedProducts = useMemo(
    () => chartData.topProducts.slice(0, 8).map((p, i) => ({
      ...p,
      rank: i + 1,
      displayName: `#${i + 1}  ${truncateName(p.fullName, 20)}`,
    })),
    [chartData.topProducts],
  );

  const analystInsights = useMemo(
    () => generateAnalystInsights(filteredData, kpis),
    [filteredData, kpis],
  );

  const summaryInsights = useMemo(
    () => generateExecutiveSummary(filteredData, kpis),
    [filteredData, kpis],
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  const navigateTo = (id) => {
    setActiveSection(id);
    setSidebarOpen(false);
    document.getElementById(SECTION_IDS[id])?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) return <LoadingState />;
  if (error) {
    return <ErrorState message={error} onRetry={() => setLoadKey((k) => k + 1)} />;
  }

  const isEmpty = filteredData.length === 0;

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <Sidebar
        activeSection={activeSection}
        onNavigate={navigateTo}
        mobileOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-slate-200">
          <div className="px-6 lg:px-10 py-6">
            <div className="flex items-start gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 cursor-pointer text-slate-600"
              >
                <Menu className="w-5 h-5" strokeWidth={1.75} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">
                      Executive Sales Analytics
                    </h1>
                    <p className="mt-1 text-[14px] text-slate-500">
                      Performance overview across revenue, profit, products, and regions
                    </p>
                  </div>
                  <p className="text-[12px] text-slate-400 shrink-0">
                    Last updated {lastUpdated}
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <FilterBar
                    filters={filters}
                    options={filterOptions}
                    onFilterChange={handleFilterChange}
                    onReset={handleReset}
                    resultCount={filteredData.length}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="px-6 lg:px-10 py-8 space-y-10">
          {isEmpty ? (
            <EmptyState onReset={handleReset} />
          ) : (
            <>
              {/* Overview */}
              <div id={SECTION_IDS.overview} className="scroll-mt-24 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  <KPICard
                    title="Total Revenue"
                    value={formatCurrency(kpis.totalRevenue)}
                    trend={kpis.trends?.totalRevenue}
                    trendLabel={kpis.trendLabel}
                    sparklineData={sparklines.revenue}
                  />
                  <KPICard
                    title="Total Profit"
                    value={formatCurrency(kpis.totalProfit)}
                    trend={kpis.trends?.totalProfit}
                    trendLabel={kpis.trendLabel}
                    sparklineData={sparklines.profit}
                  />
                  <KPICard
                    title="Total Orders"
                    value={formatNumber(kpis.totalOrders)}
                    trend={kpis.trends?.totalOrders}
                    trendLabel={kpis.trendLabel}
                    sparklineData={sparklines.orders}
                  />
                  <KPICard
                    title="Profit Margin"
                    value={formatPercent(kpis.profitMargin)}
                    trend={kpis.trends?.profitMargin}
                    trendLabel={kpis.trendLabel}
                    sparklineData={sparklines.margin}
                  />
                  <KPICard
                    title="Avg Order Value"
                    value={formatCurrency(kpis.averageOrderValue)}
                    trend={kpis.trends?.averageOrderValue}
                    trendLabel={kpis.trendLabel}
                    sparklineData={sparklines.aov}
                  />
                </div>

                {/* Revenue trend + Executive Summary */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
                  <div className="xl:col-span-8">
                    <ChartCard
                      title="Revenue Trend"
                      description="Monthly sales revenue"
                      className="h-full"
                    >
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData.monthlyRevenue} margin={CHART_MARGIN}>
                          <CartesianGrid stroke={CHART.grid} vertical={false} />
                          <XAxis
                            dataKey="month"
                            tick={{ fontSize: 11, fill: CHART.tick }}
                            tickLine={false}
                            axisLine={{ stroke: CHART.axis }}
                            interval="preserveStartEnd"
                            dy={8}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: CHART.tick }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => formatCurrency(v)}
                            width={60}
                          />
                          <Tooltip content={<ValueTooltip formatter={formatCurrency} />} />
                          <Line
                            type="monotone"
                            dataKey="value"
                            name="Revenue"
                            stroke={CHART.line}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: CHART.line, stroke: '#fff', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>

                  <div className="xl:col-span-4">
                    <ExecutiveSummary items={summaryInsights} />
                  </div>
                </div>

                <ChartCard title="Revenue by Category" description="Sales by product category">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData.salesByCategory} barSize={36} margin={CHART_MARGIN}>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: CHART.tick }}
                        tickLine={false}
                        axisLine={{ stroke: CHART.axis }}
                        dy={8}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: CHART.tick }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => formatCurrency(v)}
                        width={60}
                      />
                      <Tooltip content={<ValueTooltip formatter={formatCurrency} />} />
                      <Bar dataKey="value" name="Revenue" fill={CHART.bar} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* Sales Performance */}
              <div id={SECTION_IDS.sales} className="scroll-mt-24 space-y-5">
                <SectionHeader
                  title="Sales Performance"
                  subtitle="Profit trends, discount impact, and segment revenue"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ChartCard title="Monthly Profit" description="Net profit over time">
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={chartData.monthlyProfit} margin={CHART_MARGIN}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={{ stroke: CHART.axis }}
                          interval="preserveStartEnd"
                          dy={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCurrency(v)}
                          width={60}
                        />
                        <Tooltip content={<ValueTooltip formatter={formatCurrency} />} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name="Profit"
                          stroke={CHART.profit}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: CHART.profit, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Discount vs. Profit" description="Average profit by discount level">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData.discountAnalysis} barSize={32} margin={CHART_MARGIN}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis
                          dataKey="discount"
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={{ stroke: CHART.axis }}
                          dy={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCurrency(v)}
                          width={60}
                        />
                        <Tooltip
                          content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <ChartTooltip
                                label={`Discount: ${label}`}
                                payload={[
                                  { name: 'Avg profit', value: formatCurrency(d.avgProfit) },
                                  { name: 'Line items', value: formatNumber(d.count) },
                                ]}
                              />
                            );
                          }}
                        />
                        <Bar dataKey="avgProfit" name="Avg profit" fill={CHART.bar} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <div className="lg:col-span-2">
                    <ChartCard
                      title="Revenue by Segment"
                      description="Sales across customer segments"
                    >
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={chartData.salesBySegment} barSize={48} margin={CHART_MARGIN}>
                          <CartesianGrid stroke={CHART.grid} vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: CHART.tick }}
                            tickLine={false}
                            axisLine={{ stroke: CHART.axis }}
                            dy={8}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: CHART.tick }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => formatCurrency(v)}
                            width={60}
                          />
                          <Tooltip content={<ValueTooltip formatter={formatCurrency} />} />
                          <Bar dataKey="value" name="Revenue" fill={CHART.bar} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div id={SECTION_IDS.products} className="scroll-mt-24 space-y-5">
                <SectionHeader
                  title="Products"
                  subtitle="Product revenue and profitability performance"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  <ChartCard
                    title="Top Products by Revenue"
                    description="Top 8 products by revenue"
                    tall
                    className="h-full"
                    chartMinHeight={460}
                  >
                    <ResponsiveContainer width="100%" height={420}>
                      <BarChart
                        data={rankedProducts}
                        layout="vertical"
                        margin={{ top: 8, left: 12, right: 72, bottom: 8 }}
                        barSize={28}
                        barCategoryGap={14}
                      >
                        <CartesianGrid stroke={CHART.grid} horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCurrency(v)}
                        />
                        <YAxis
                          type="category"
                          dataKey="displayName"
                          width={172}
                          tick={<ProductYAxisTick />}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const item = payload[0].payload;
                            return (
                              <ChartTooltip
                                label={`#${item.rank} — ${item.fullName}`}
                                payload={[
                                  { name: 'Revenue', value: formatCurrency(item.revenue) },
                                  { name: 'Quantity', value: formatNumber(item.quantity) },
                                ]}
                              />
                            );
                          }}
                          cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                        />
                        <Bar
                          dataKey="revenue"
                          name="Revenue"
                          fill={CHART.bar}
                          radius={[0, 4, 4, 0]}
                          background={{ fill: '#f8fafc', radius: 4 }}
                        >
                          <LabelList
                            dataKey="revenue"
                            position="right"
                            formatter={(v) => formatCurrency(v)}
                            style={{ fontSize: 10, fill: '#6b7280', fontWeight: 500 }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Profit by Sub-Category" description="Net profit breakdown">
                    <ResponsiveContainer width="100%" height={420}>
                      <BarChart
                        data={chartData.profitBySubCategory.slice(0, 10)}
                        barSize={16}
                        margin={{ ...CHART_MARGIN, bottom: 0 }}
                      >
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={{ stroke: CHART.axis }}
                          angle={-35}
                          textAnchor="end"
                          height={60}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCurrency(v)}
                          width={60}
                        />
                        <Tooltip content={<ValueTooltip formatter={formatCurrency} />} />
                        <Bar dataKey="value" name="Profit" radius={[4, 4, 0, 0]}>
                          {chartData.profitBySubCategory.slice(0, 10).map((entry) => (
                            <Cell
                              key={entry.name}
                              fill={entry.value >= 0 ? CHART.positive : CHART.negative}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>

              {/* Regions */}
              <div id={SECTION_IDS.regions} className="scroll-mt-24 space-y-5">
                <SectionHeader
                  title="Regions"
                  subtitle="Regional revenue distribution and comparison"
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  <ChartCard
                    title="Revenue by Region"
                    description="Regional distribution"
                    className="h-full"
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.salesByRegion}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={58}
                          outerRadius={88}
                          paddingAngle={2}
                          stroke="#fff"
                          strokeWidth={2}
                        >
                          {chartData.salesByRegion.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <ChartTooltip
                                label={d.name}
                                payload={[{ name: 'Revenue', value: formatCurrency(d.value) }]}
                              />
                            );
                          }}
                        />
                        <Legend
                          layout="vertical"
                          align="right"
                          verticalAlign="middle"
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 11, color: CHART.tick, lineHeight: '20px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Regional Revenue Comparison" description="Total revenue by region">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData.salesByRegion} barSize={40} margin={CHART_MARGIN}>
                        <CartesianGrid stroke={CHART.grid} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={{ stroke: CHART.axis }}
                          dy={8}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: CHART.tick }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatCurrency(v)}
                          width={60}
                        />
                        <Tooltip content={<ValueTooltip formatter={formatCurrency} />} />
                        <Bar dataKey="value" name="Revenue" fill={CHART.bar} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>
              </div>

              {/* Insights */}
              <div id={SECTION_IDS.insights} className="scroll-mt-24 space-y-5">
                <SectionHeader
                  title="Insights"
                  subtitle="Data-backed findings from the current selection"
                />
                <Insights items={analystInsights} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
