import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Download,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  PageHeader,
  SkeletonBlock,
  StatusChip,
} from '@/components/ui/Primitives';
import { ReportResult } from '@/types/erp';

const SUGGESTED_PROMPTS = [
  'Top 10 slow-paying customers this quarter',
  'Which products had the highest margin last month?',
  'Compare warehouse vs shop sales over the past 6 months',
  'Suppliers who increased prices in the last 90 days',
];

function generateReportForQuery(query: string): ReportResult {
  const q = query.toLowerCase();
  if (q.includes('margin') || q.includes('product')) {
    return {
      id: `REP-${Date.now()}`,
      query,
      timestamp: 'Just now',
      title: 'Top Margin Products — March / April 2026',
      summary:
        'Knuckles Mineral Water 1.5L (20.9% gross margin) and Ceylon Ginger Beer (13.0%) led margin percentage, while Coconut Oil & Keeri Samba Rice drove 54% of total rupee gross profit (Rs. 812,400 combined).',
      methodology:
        'Gross margin computed as (Net Sales - Weighted Avg Landed Cost) across 418 invoiced orders over the past 30 days.',
      chartType: 'bar',
      valueLabel: 'Gross Margin %',
      chartData: [
        { name: 'Water 1.5L', value: 20.9 },
        { name: 'Ginger Beer', value: 13.0 },
        { name: 'Prima Flour', value: 11.1 },
        { name: 'Red Chilli', value: 9.7 },
        { name: 'Anchor Milk', value: 8.2 },
        { name: 'Keeri Samba', value: 7.8 },
        { name: 'Marina Oil', value: 7.3 },
      ],
      columns: ['Product', 'Units Sold', 'Revenue (Rs.)', 'Gross Profit (Rs.)', 'Margin %'],
      rows: [
        ['Knuckles Mineral Water 1.5L x 6', '940 Packs', 'Rs. 404,200', 'Rs. 84,600', '20.9%'],
        ['Ceylon Ginger Beer 1.5L x 6', '520 Cases', 'Rs. 478,400', 'Rs. 62,400', '13.0%'],
        ['Prima Baker Wheat Flour 25kg', '460 Bags', 'Rs. 1,242,000', 'Rs. 138,000', '11.1%'],
        ['Roasted Red Chilli Powder 1kg', '58 Cartons', 'Rs. 719,200', 'Rs. 69,600', '9.7%'],
        ['Marina Coconut Oil 1L Case', '410 Cases', 'Rs. 1,336,600', 'Rs. 98,400', '7.3%'],
      ],
      saved: false,
    };
  }
  if (q.includes('warehouse') || q.includes('shop') || q.includes('6 month')) {
    return {
      id: `REP-${Date.now()}`,
      query,
      timestamp: 'Just now',
      title: 'Warehouse Wholesale vs Main Shop Sales (6 Months)',
      summary:
        'Warehouse wholesale dispatches grew +24% since November (reaching Rs. 11.4M in April), while Main Shop walk-in sales stayed steady around Rs. 4.1M/month. WhatsApp orders now represent 58% of Warehouse volume.',
      methodology:
        'Aggregated invoiced sales in Rs. millions grouped by fulfillment location (Main Warehouse vs Main Shop Counter).',
      chartType: 'line',
      valueLabel: 'Warehouse (Rs. M)',
      secondaryLabel: 'Main Shop (Rs. M)',
      chartData: [
        { name: 'Nov', value: 9.2, secondary: 3.8 },
        { name: 'Dec', value: 9.8, secondary: 4.0 },
        { name: 'Jan', value: 10.1, secondary: 3.9 },
        { name: 'Feb', value: 10.4, secondary: 4.1 },
        { name: 'Mar', value: 10.9, secondary: 4.2 },
        { name: 'Apr', value: 11.4, secondary: 4.1 },
      ],
      columns: ['Month', 'Warehouse Sales', 'Main Shop Sales', 'Combined Total', 'WhatsApp Share'],
      rows: [
        ['April 2026 (MTD)', 'Rs. 11,400,000', 'Rs. 4,100,000', 'Rs. 15,500,000', '58%'],
        ['March 2026', 'Rs. 10,900,000', 'Rs. 4,200,000', 'Rs. 15,100,000', '54%'],
        ['February 2026', 'Rs. 10,400,000', 'Rs. 4,100,000', 'Rs. 14,500,000', '49%'],
        ['January 2026', 'Rs. 10,100,000', 'Rs. 3,900,000', 'Rs. 14,000,000', '44%'],
      ],
      saved: false,
    };
  }
  if (q.includes('supplier') || q.includes('price')) {
    return {
      id: `REP-${Date.now()}`,
      query,
      timestamp: 'Just now',
      title: 'Supplier Price Increases — Last 90 Days',
      summary:
        '3 suppliers raised unit rates above inflation in the last 90 days. Marina Edible Oils (+6.4% on Coconut Oil 1L) has the largest projected profit impact of Rs. 75,600/month if wholesale selling rates remain unchanged.',
      methodology:
        'Compared invoiced unit costs from Jan–Apr 2026 across 86 verified supplier bills.',
      chartType: 'bar',
      valueLabel: 'Price Increase %',
      chartData: [
        { name: 'Marina Oils', value: 6.4 },
        { name: 'Serendib Mills', value: 4.6 },
        { name: 'Matale Spices', value: 3.2 },
        { name: 'Ranala Bev', value: 2.5 },
        { name: 'Ceylon Tea', value: 1.1 },
      ],
      columns: ['Supplier', 'SKU Impacted', 'Old Rate', 'New Rate', 'Change %'],
      rows: [
        ['Marina Edible Oils', 'Marina Coconut Oil 1L Case', 'Rs. 2,840', 'Rs. 3,020', '+6.4%'],
        ['Serendib Flour & Rice Mills', 'White Sugar 50kg Bag', 'Rs. 6,550', 'Rs. 6,850', '+4.6%'],
        ['Matale Spice & Curry Mills', 'Roasted Chilli Powder 1kg', 'Rs. 10,850', 'Rs. 11,200', '+3.2%'],
        ['Ranala Beverage Bottlers', 'Ceylon Ginger Beer 1.5L', 'Rs. 780', 'Rs. 800', '+2.5%'],
      ],
      saved: false,
    };
  }
  return {
    id: `REP-${Date.now()}`,
    query,
    timestamp: 'Just now',
    title: `Transmute Analysis — "${query}"`,
    summary:
      'Analyzed live ledger, sales orders, and receivables across Lanka Crest Wholesale. Wijesinghe Super Centre (39 avg pay days, Rs. 845,000 balance) and Kandy City Stores (34 days, Rs. 620,000) represent the largest cash-flow opportunity.',
    methodology:
      'Queried live ERP tables (Sales Invoices, Payments, Customer Ledger) as of 14 April 2026.',
    chartType: 'bar',
    valueLabel: 'Balance (Rs. k)',
    chartData: [
      { name: 'Wijesinghe', value: 845 },
      { name: 'Kandy City', value: 620 },
      { name: 'Gampaha TM', value: 540 },
      { name: 'Rathnayake', value: 385 },
      { name: 'Ruhunu Mart', value: 350 },
      { name: 'Nugegoda FM', value: 245 },
    ],
    columns: ['Customer', 'Outstanding (Rs.)', 'Avg Pay Days', 'Overdue Days', 'Risk'],
    rows: [
      ['Wijesinghe Super Centre', 'Rs. 845,000', '39 days', '38 days', 'High Risk'],
      ['Kandy City Stores', 'Rs. 620,000', '34 days', '33 days', 'High Risk'],
      ['Gampaha Trade Mart', 'Rs. 540,000', '22 days', '19 days', 'Watch'],
      ['Rathnayake Grocery & Stores', 'Rs. 385,000', '25 days', '24 days', 'Watch'],
      ['Ruhunu Wholesale Mart', 'Rs. 350,000', '16 days', '7 days', 'Low Risk'],
    ],
    saved: false,
  };
}

export function ReportsScreen() {
  const { reports, setReports, pendingReportQuery, setPendingReportQuery, addToast } = useErp();
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string>(reports[0]?.id || '');

  const runQuery = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setQueryInput('');
    setTimeout(() => {
      const generated = generateReportForQuery(trimmed);
      setReports((prev) => [generated, ...prev]);
      setActiveReportId(generated.id);
      setLoading(false);
    }, 650);
  };

  useEffect(() => {
    if (pendingReportQuery) {
      runQuery(pendingReportQuery);
      setPendingReportQuery(null);
    }
  }, [pendingReportQuery]);

  const activeReport = reports.find((r) => r.id === activeReportId) || reports[0];

  const toggleSaveReport = (rep: ReportResult) => {
    const nextSaved = !rep.saved;
    setReports((prev) =>
      prev.map((r) => (r.id === rep.id ? { ...r, saved: nextSaved } : r))
    );
    addToast({
      title: nextSaved ? 'Saved to Reports Library' : 'Removed from Saved Reports',
      description: rep.title,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask Transmute — Natural-Language Reports"
        subtitle="Ask business questions in plain English, Sinhala, or Tamil and get instant charts, tables, and transparent calculations."
      />

      {/* Query Bar Card */}
      <Card className="p-5 border-[#FFD5BE] dark:border-[#EA581A]/35 bg-gradient-to-br from-[#FFF4EE]/75 via-white to-white dark:from-[#EA581A]/10 dark:via-[#18181B] dark:to-[#18181B] space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-[#EA581A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runQuery(queryInput)}
              placeholder='Try: "top 10 slow-paying customers this quarter" or "highest margin products"'
              className="w-full pl-10 pr-4 py-3 text-sm rounded-xl bg-white dark:bg-[#111113] border border-stone-200 dark:border-zinc-800 text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#EA581A] focus:ring-2 focus:ring-[#EA581A]/20"
            />
          </div>
          <Button
            variant="gold"
            size="lg"
            icon={<Send className="w-4 h-4" />}
            onClick={() => runQuery(queryInput)}
          >
            Ask Transmute
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-slate-500">Suggested questions:</span>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => runQuery(prompt)}
              className="px-3 py-1 rounded-full text-xs bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#EA581A] hover:text-zinc-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </Card>

      {/* Workspace Split: Saved Reports History + Active Result */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <Card className="xl:col-span-3 p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Saved & Recent Reports ({reports.length})
          </div>
          <div className="space-y-1.5">
            {reports.map((rep) => (
              <button
                key={rep.id}
                onClick={() => setActiveReportId(rep.id)}
                className={cn(
                  'w-full p-3 rounded-xl text-left transition-colors cursor-pointer border',
                  activeReport?.id === rep.id
                    ? 'bg-[#FFF4EE] dark:bg-[#EA581A]/15 border-[#FFD5BE] dark:border-[#EA581A]/35'
                    : 'bg-transparent border-transparent hover:bg-stone-50 dark:hover:bg-zinc-800/60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2">
                    {rep.title}
                  </span>
                  {rep.saved && <BookmarkCheck className="w-3.5 h-3.5 text-[#EA581A] shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{rep.timestamp}</div>
              </button>
            ))}
          </div>
        </Card>

        <div className="xl:col-span-9 space-y-4">
          {loading ? (
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C2410C] dark:text-[#FF9E66]">
                <Sparkles className="w-4 h-4 animate-pulse" />
                Querying live ledger, invoices & customer payments...
              </div>
              <SkeletonBlock className="h-6 w-2/3" />
              <SkeletonBlock className="h-48 w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </Card>
          ) : (
            activeReport && (
              <Card className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusChip label={`Prompt: "${activeReport.query}"`} tone="gold" dot={false} />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white mt-1.5">
                      {activeReport.title}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant={activeReport.saved ? 'secondary' : 'gold'}
                      size="sm"
                      icon={
                        activeReport.saved ? (
                          <BookmarkCheck className="w-4 h-4 text-[#EA581A]" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )
                      }
                      onClick={() => toggleSaveReport(activeReport)}
                    >
                      {activeReport.saved ? 'Saved Report' : 'Save as Report'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Download className="w-4 h-4" />}
                      onClick={() =>
                        addToast({
                          title: 'Report exported to CSV',
                          description: `${activeReport.title}.csv ready.`,
                          variant: 'info',
                        })
                      }
                    >
                      Export
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                    {activeReport.summary}
                  </p>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#EA581A] shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700 dark:text-slate-200">
                        How I calculated this:
                      </strong>{' '}
                      {activeReport.methodology}
                    </span>
                  </div>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {activeReport.chartType === 'bar' ? (
                      <BarChart
                        data={activeReport.chartData}
                        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.16} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Bar
                          dataKey="value"
                          name={activeReport.valueLabel}
                          fill="#EA581A"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    ) : (
                      <LineChart
                        data={activeReport.chartData}
                        margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.16} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                        <Line
                          type="monotone"
                          dataKey="value"
                          name={activeReport.valueLabel}
                          stroke="#EA581A"
                          strokeWidth={2.5}
                        />
                        {activeReport.secondaryLabel && (
                          <Line
                            type="monotone"
                            dataKey="secondary"
                            name={activeReport.secondaryLabel}
                            stroke="#0F172A"
                            strokeWidth={2}
                          />
                        )}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        {activeReport.columns.map((col) => (
                          <th key={col} className="px-4 py-3 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {activeReport.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={cn(
                                'px-4 py-3 tabular-nums',
                                cIdx === 0 && 'font-semibold text-slate-900 dark:text-white'
                              )}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          )}
        </div>
      </div>
    </div>
  );
}
