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
import { Customer, InventoryItem, PurchaseOrder, ReportResult } from '@/types/erp';
import { formatRs } from '@/utils/format';

const SUGGESTED_PROMPTS = [
  'Who owes me the most?',
  'Which items are low on stock?',
  'Show open purchase orders',
];

interface ReportSource {
  customers: Customer[];
  inventory: InventoryItem[];
  pos: PurchaseOrder[];
}

// Builds a report only from the data the app currently holds. Returns null when the
// question does not match a report that can be computed.
function buildReport(query: string, src: ReportSource): ReportResult | null {
  const q = query.toLowerCase();
  const base = {
    id: `REP-${Date.now()}`,
    query,
    timestamp: new Date().toLocaleString('en-GB'),
    saved: false,
  };

  if (/owe|overdue|receiv|debt|balance|slow/.test(q)) {
    const rows = [...src.customers].sort((a, b) => b.outstandingBalance - a.outstandingBalance);
    const total = rows.reduce((s, c) => s + c.outstandingBalance, 0);
    const over30 = rows.filter((c) => c.daysOverdue >= 30).length;
    return {
      ...base,
      title: 'Receivables by customer',
      summary:
        rows.length === 0
          ? 'No customer balances are recorded yet.'
          : `${formatRs(total)} is owed across ${rows.length} customers. ${over30} of them are 30 or more days overdue.`,
      methodology:
        'Outstanding balance per customer, sorted from highest to lowest. Overdue days and risk come from each customer record.',
      chartType: 'bar',
      valueLabel: 'Outstanding (Rs.)',
      chartData: rows.map((c) => ({ name: c.name, value: c.outstandingBalance })),
      columns: ['Customer', 'Outstanding', 'Days overdue', 'Credit limit', 'Risk'],
      rows: rows.map((c) => [
        c.name,
        formatRs(c.outstandingBalance),
        `${c.daysOverdue} days`,
        formatRs(c.creditLimit),
        c.risk,
      ]),
    };
  }

  if (/stock|inventory|reorder|low/.test(q)) {
    const rows = src.inventory;
    const totalOf = (i: InventoryItem) => i.warehouseStock + i.shopStock + i.vanStock;
    const low = rows.filter((i) => totalOf(i) <= i.reorderLevel).length;
    return {
      ...base,
      title: 'Stock on hand by item',
      summary:
        rows.length === 0
          ? 'No inventory items are recorded yet.'
          : `${low} of ${rows.length} items are at or below their reorder level.`,
      methodology: 'Units on hand summed across warehouse, shop and van. Compared with each item’s reorder level.',
      chartType: 'bar',
      valueLabel: 'Units on hand',
      chartData: rows.map((i) => ({ name: i.name, value: totalOf(i) })),
      columns: ['Item', 'Warehouse', 'Shop', 'Van', 'Total', 'Reorder level'],
      rows: rows.map((i) => [i.name, i.warehouseStock, i.shopStock, i.vanStock, totalOf(i), i.reorderLevel]),
    };
  }

  if (/purchase|supplier|\bpo\b|\bpos\b/.test(q)) {
    const rows = src.pos;
    const total = rows.reduce((s, p) => s + p.total, 0);
    return {
      ...base,
      title: 'Purchase orders',
      summary:
        rows.length === 0
          ? 'No purchase orders are recorded yet.'
          : `${rows.length} purchase orders totalling ${formatRs(total)}.`,
      methodology: 'Each purchase order with its status and total value.',
      chartType: 'bar',
      valueLabel: 'PO total (Rs.)',
      chartData: rows.map((p) => ({ name: p.id, value: p.total })),
      columns: ['PO', 'Supplier', 'Status', 'Total'],
      rows: rows.map((p) => [p.id, p.supplierName, p.status, formatRs(p.total)]),
    };
  }

  return null;
}

function downloadCsv(rep: ReportResult) {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [rep.columns.map(esc).join(','), ...rep.rows.map((r) => r.map(esc).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${rep.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsScreen() {
  const {
    reports,
    setReports,
    customers,
    inventory,
    pos,
    pendingReportQuery,
    setPendingReportQuery,
    addToast,
  } = useErp();
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeReportId, setActiveReportId] = useState<string>(reports[0]?.id || '');

  const runQuery = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setLoading(true);
    setQueryInput('');
    setTimeout(() => {
      const generated = buildReport(trimmed, { customers, inventory, pos });
      setLoading(false);
      if (!generated) {
        addToast({
          title: 'No report for that question yet',
          description: 'Try "who owes me the most", "low stock items" or "open purchase orders".',
          variant: 'info',
        });
        return;
      }
      setReports((prev) => [generated, ...prev]);
      setActiveReportId(generated.id);
    }, 300);
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
        title="Ask Transmute — Reports"
        subtitle="Ask about receivables, stock or purchase orders. Reports are calculated from your current data."
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
              placeholder='Try: "who owes me the most" or "low stock items"'
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
          {reports.length === 0 && (
            <p className="text-xs text-slate-500 py-2">No reports yet. Ask a question to create one.</p>
          )}
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
                Building report from current data...
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
                      onClick={() => downloadCsv(activeReport)}
                    >
                      Export CSV
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
                        How this was calculated:
                      </strong>{' '}
                      {activeReport.methodology}
                    </span>
                  </div>
                </div>

                {activeReport.chartData.length > 0 && (
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
                )}

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
                      {activeReport.rows.length === 0 && (
                        <tr>
                          <td colSpan={activeReport.columns.length} className="px-4 py-6 text-center text-slate-500">
                            No rows to show yet.
                          </td>
                        </tr>
                      )}
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
