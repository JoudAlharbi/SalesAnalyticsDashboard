const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function parseOrderDate(dateStr) {
  if (!dateStr) return null;
  const [month, day, year] = dateStr.split('/');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function normalizeRow(row) {
  const orderDate = parseOrderDate(row['Order Date']);
  if (!orderDate || isNaN(orderDate.getTime())) return null;

  return {
    orderId: row['Order ID'],
    orderDate,
    year: orderDate.getFullYear(),
    month: orderDate.getMonth(),
    monthLabel: `${MONTHS[orderDate.getMonth()]} ${orderDate.getFullYear()}`,
    segment: row.Segment,
    country: row.Country,
    city: row.City,
    state: row.State,
    region: row.Region,
    category: row.Category,
    subCategory: row['Sub-Category'],
    productName: row['Product Name'],
    sales: parseFloat(row.Sales) || 0,
    quantity: parseInt(row.Quantity, 10) || 0,
    discount: parseFloat(row.Discount) || 0,
    profit: parseFloat(row.Profit) || 0,
  };
}

export function parseCSVData(rawData) {
  return rawData.map(normalizeRow).filter(Boolean);
}

export function getFilterOptions(data) {
  const unique = (key) => [...new Set(data.map((d) => d[key]))].sort();

  return {
    regions: unique('region'),
    categories: unique('category'),
    segments: unique('segment'),
    years: unique('year').sort((a, b) => a - b),
  };
}

export function applyFilters(data, filters) {
  return data.filter((row) => {
    if (filters.region !== 'All' && row.region !== filters.region) return false;
    if (filters.category !== 'All' && row.category !== filters.category) return false;
    if (filters.segment !== 'All' && row.segment !== filters.segment) return false;
    if (filters.year !== 'All' && row.year !== Number(filters.year)) return false;
    return true;
  });
}

export function calculateKPIs(data) {
  const totalRevenue = data.reduce((sum, r) => sum + r.sales, 0);
  const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);
  const totalQuantity = data.reduce((sum, r) => sum + r.quantity, 0);
  const uniqueOrders = new Set(data.map((r) => r.orderId)).size;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const averageOrderValue = uniqueOrders > 0 ? totalRevenue / uniqueOrders : 0;

  return {
    totalRevenue,
    totalProfit,
    totalOrders: uniqueOrders,
    totalQuantity,
    profitMargin,
    averageOrderValue,
  };
}

function calcTrend(current, previous) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function calculateKPIsWithTrends(data) {
  const kpis = calculateKPIs(data);

  const byYear = {};
  data.forEach((row) => {
    if (!byYear[row.year]) byYear[row.year] = [];
    byYear[row.year].push(row);
  });

  const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

  if (years.length < 2) {
    return { ...kpis, trends: {}, trendLabel: null };
  }

  const currentYear = years[years.length - 1];
  const priorYear = years[years.length - 2];
  const currentKpis = calculateKPIs(byYear[currentYear]);
  const priorKpis = calculateKPIs(byYear[priorYear]);

  return {
    ...kpis,
    trends: {
      totalRevenue: calcTrend(currentKpis.totalRevenue, priorKpis.totalRevenue),
      totalProfit: calcTrend(currentKpis.totalProfit, priorKpis.totalProfit),
      totalOrders: calcTrend(currentKpis.totalOrders, priorKpis.totalOrders),
      totalQuantity: calcTrend(currentKpis.totalQuantity, priorKpis.totalQuantity),
      profitMargin: calcTrend(currentKpis.profitMargin, priorKpis.profitMargin),
      averageOrderValue: calcTrend(currentKpis.averageOrderValue, priorKpis.averageOrderValue),
    },
    trendLabel: `${priorYear}`,
  };
}

export function getMonthlyTrend(data, field) {
  const monthly = {};

  data.forEach((row) => {
    const key = row.monthLabel;
    if (!monthly[key]) {
      monthly[key] = { month: key, sortKey: row.year * 100 + row.month, value: 0 };
    }
    monthly[key].value += row[field];
  });

  return Object.values(monthly)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ month, value }) => ({ month, value: Math.round(value * 100) / 100 }));
}

export function aggregateByField(data, field, valueField = 'sales') {
  const grouped = {};

  data.forEach((row) => {
    const key = row[field];
    if (!grouped[key]) grouped[key] = 0;
    grouped[key] += row[valueField];
  });

  return Object.entries(grouped)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export function getTopProducts(data, limit = 10) {
  const products = {};

  data.forEach((row) => {
    if (!products[row.productName]) {
      products[row.productName] = { name: row.productName, revenue: 0, quantity: 0 };
    }
    products[row.productName].revenue += row.sales;
    products[row.productName].quantity += row.quantity;
  });

  return Object.values(products)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
    .map((p) => ({
      name: p.name.length > 28 ? `${p.name.slice(0, 28)}…` : p.name,
      fullName: p.name,
      revenue: Math.round(p.revenue * 100) / 100,
      quantity: p.quantity,
    }));
}

export function getDiscountProfitAnalysis(data) {
  const buckets = {
    '0%': { discount: '0%', avgProfit: 0, count: 0, totalProfit: 0 },
    '1-10%': { discount: '1-10%', avgProfit: 0, count: 0, totalProfit: 0 },
    '11-20%': { discount: '11-20%', avgProfit: 0, count: 0, totalProfit: 0 },
    '21-30%': { discount: '21-30%', avgProfit: 0, count: 0, totalProfit: 0 },
    '31%+': { discount: '31%+', avgProfit: 0, count: 0, totalProfit: 0 },
  };

  data.forEach((row) => {
    let bucket;
    const d = row.discount * 100;
    if (d === 0) bucket = '0%';
    else if (d <= 10) bucket = '1-10%';
    else if (d <= 20) bucket = '11-20%';
    else if (d <= 30) bucket = '21-30%';
    else bucket = '31%+';

    buckets[bucket].totalProfit += row.profit;
    buckets[bucket].count += 1;
  });

  return Object.values(buckets).map((b) => ({
    discount: b.discount,
    avgProfit: b.count > 0 ? Math.round((b.totalProfit / b.count) * 100) / 100 : 0,
    totalProfit: Math.round(b.totalProfit * 100) / 100,
    count: b.count,
  }));
}

export function generateExecutiveSummary(data, kpis) {
  if (data.length === 0) return [];

  const byRegion = aggregateByField(data, 'region', 'sales');
  const byCategoryProfit = aggregateByField(data, 'category', 'profit');
  const topProduct = getTopProducts(data, 1)[0];
  const items = [];

  if (byRegion[0]) {
    const share = kpis.totalRevenue > 0
      ? (byRegion[0].value / kpis.totalRevenue) * 100
      : 0;
    items.push({
      title: 'Regional Revenue',
      finding: `${byRegion[0].name} generated the highest revenue at ${formatCurrency(byRegion[0].value)}.`,
      whyItMatters: `This region accounts for ${share.toFixed(0)}% of revenue in the current selection.`,
    });
  }

  items.push({
    title: 'Overall Performance',
    finding: `Total revenue is ${formatCurrency(kpis.totalRevenue)} with a ${kpis.profitMargin.toFixed(1)}% profit margin across ${formatNumber(kpis.totalOrders)} orders.`,
    whyItMatters: `Net profit for the selection totals ${formatCurrency(kpis.totalProfit)}.`,
  });

  if (byCategoryProfit[0]) {
    items.push({
      title: 'Category Profit',
      finding: `${byCategoryProfit[0].name} produced the highest profit at ${formatCurrency(byCategoryProfit[0].value)}.`,
      whyItMatters: `This category leads all others on profit within the filtered data.`,
    });
  }

  const lowestSub = aggregateByField(data, 'subCategory', 'profit');
  const worstSub = lowestSub[lowestSub.length - 1];
  if (worstSub && worstSub.value < 0 && items.length < 4) {
    items.push({
      title: 'Sub-Category Loss',
      finding: `${worstSub.name} recorded a net loss of ${formatCurrency(Math.abs(worstSub.value))}.`,
      whyItMatters: `This sub-category reduces total profit despite generating sales volume.`,
    });
  } else if (topProduct && items.length < 4) {
    items.push({
      title: 'Top Product',
      finding: `${topProduct.fullName} had the highest revenue at ${formatCurrency(topProduct.revenue)}.`,
      whyItMatters: `${formatNumber(topProduct.quantity)} units were sold for this product in the selection.`,
    });
  }

  const discountAnalysis = getDiscountProfitAnalysis(data);
  const noDiscount = discountAnalysis.find((d) => d.discount === '0%');
  const heavyDiscount = discountAnalysis.find((d) => d.discount === '31%+');
  if (noDiscount && heavyDiscount && heavyDiscount.count > 0 && items.length < 4) {
    items.push({
      title: 'Discount Impact',
      finding: `Non-discounted lines averaged ${formatCurrency(noDiscount.avgProfit)} profit; lines at 31%+ discount averaged ${formatCurrency(heavyDiscount.avgProfit)}.`,
      whyItMatters: `Higher discount levels in the data correspond to lower average profit per line item.`,
    });
  }

  return items.slice(0, 4);
}

export function generateAnalystInsights(data, kpis) {
  if (data.length === 0) return [];

  const byRegion = aggregateByField(data, 'region', 'sales');
  const byCategoryProfit = aggregateByField(data, 'category', 'profit');
  const bySubCategoryProfit = aggregateByField(data, 'subCategory', 'profit');
  const bySegment = aggregateByField(data, 'segment', 'sales');
  const topProducts = getTopProducts(data, 1);
  const discountAnalysis = getDiscountProfitAnalysis(data);

  const insights = [];

  if (byRegion[0]) {
    const share = kpis.totalRevenue > 0
      ? (byRegion[0].value / kpis.totalRevenue) * 100
      : 0;
    insights.push({
      title: 'Regional Revenue',
      finding: `${byRegion[0].name} generated the highest revenue at ${formatCurrency(byRegion[0].value)}.`,
      whyItMatters: `A large share of sales (${share.toFixed(0)}%) comes from one region, increasing reliance on its performance.`,
    });
  }

  if (byCategoryProfit[0]) {
    const categoryShare = kpis.totalProfit > 0
      ? (byCategoryProfit[0].value / kpis.totalProfit) * 100
      : 0;
    insights.push({
      title: 'Category Profitability',
      finding: `${byCategoryProfit[0].name} produced the highest profit at ${formatCurrency(byCategoryProfit[0].value)}.`,
      whyItMatters: `This category represents ${categoryShare.toFixed(0)}% of total profit in the current selection.`,
    });
  }

  const lowestSub = bySubCategoryProfit[bySubCategoryProfit.length - 1];
  if (lowestSub && lowestSub.value < 0) {
    insights.push({
      title: 'Sub-Category Loss',
      finding: `${lowestSub.name} generated a net loss of ${formatCurrency(Math.abs(lowestSub.value))}.`,
      whyItMatters: `This sub-category reduces overall profit despite generating sales in the dataset.`,
    });
  }

  if (topProducts[0]) {
    insights.push({
      title: 'Top Product',
      finding: `${topProducts[0].fullName} ranked first by revenue at ${formatCurrency(topProducts[0].revenue)}.`,
      whyItMatters: `No other product in the selection exceeded this revenue total.`,
    });
  }

  if (bySegment[0] && bySegment[1]) {
    insights.push({
      title: 'Customer Segment',
      finding: `${bySegment[0].name} segment generated ${formatCurrency(bySegment[0].value)} in revenue, ahead of ${bySegment[1].name} at ${formatCurrency(bySegment[1].value)}.`,
      whyItMatters: `Revenue is unevenly distributed across the three customer segments in the data.`,
    });
  }

  const noDiscount = discountAnalysis.find((d) => d.discount === '0%');
  const heavyDiscount = discountAnalysis.find((d) => d.discount === '31%+');
  if (noDiscount && heavyDiscount && heavyDiscount.count > 0) {
    insights.push({
      title: 'Discount and Profit',
      finding: `Non-discounted lines averaged ${formatCurrency(noDiscount.avgProfit)} profit per item; 31%+ discounted lines averaged ${formatCurrency(heavyDiscount.avgProfit)} across ${formatNumber(heavyDiscount.count)} records.`,
      whyItMatters: `Higher discount levels in the data are associated with lower average profit per line item.`,
    });
  }

  return insights.slice(0, 6);
}

export function generateInsights(data, kpis) {
  if (data.length === 0) {
    return {
      highestRevenueRegion: 'N/A',
      highestProfitCategory: 'N/A',
      lowestProfitSubCategory: 'N/A',
      bestSellingProduct: 'N/A',
      profitMarginPerformance: 'No data available for the selected filters.',
      discountImpact: 'No data available for the selected filters.',
    };
  }

  const byRegion = aggregateByField(data, 'region', 'sales');
  const byCategoryProfit = aggregateByField(data, 'category', 'profit');
  const bySubCategoryProfit = aggregateByField(data, 'subCategory', 'profit');
  const topProducts = getTopProducts(data, 1);

  const highestRevenueRegion = byRegion[0]?.name ?? 'N/A';
  const highestProfitCategory = byCategoryProfit[0]?.name ?? 'N/A';
  const lowestProfitSubCategory = bySubCategoryProfit[bySubCategoryProfit.length - 1]?.name ?? 'N/A';
  const bestSellingProduct = topProducts[0]?.fullName ?? 'N/A';

  let marginLabel;
  if (kpis.profitMargin >= 15) marginLabel = 'strong';
  else if (kpis.profitMargin >= 8) marginLabel = 'healthy';
  else if (kpis.profitMargin >= 0) marginLabel = 'moderate';
  else marginLabel = 'negative';

  const profitMarginPerformance =
    `Profit margin is ${kpis.profitMargin.toFixed(1)}%, indicating ${marginLabel} profitability across filtered transactions.`;

  const discountAnalysis = getDiscountProfitAnalysis(data);
  const noDiscount = discountAnalysis.find((d) => d.discount === '0%');
  const highDiscount = discountAnalysis.find((d) => d.discount === '31%+');
  const avgNoDiscount = noDiscount?.avgProfit ?? 0;
  const avgHighDiscount = highDiscount?.avgProfit ?? 0;
  const profitDrop = avgNoDiscount > 0
    ? ((avgNoDiscount - avgHighDiscount) / Math.abs(avgNoDiscount)) * 100
    : 0;

  const discountImpact = avgHighDiscount < avgNoDiscount
    ? `High discounts (31%+) reduce average profit by ~${profitDrop.toFixed(0)}% compared to non-discounted orders ($${avgHighDiscount.toFixed(2)} vs $${avgNoDiscount.toFixed(2)} per line item).`
    : `Discount levels show mixed profit impact; non-discounted orders average $${avgNoDiscount.toFixed(2)} profit per line item.`;

  return {
    highestRevenueRegion,
    highestProfitCategory,
    lowestProfitSubCategory,
    bestSellingProduct,
    profitMarginPerformance,
    discountImpact,
  };
}

export function formatCurrency(value, compact = true) {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 10_000) {
      return `$${(value / 1_000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}
