import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  FileCheck2,
  Package,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useErp } from '@/context/ErpContext';
import { Button, Card, cn, PageHeader, StatusChip } from '@/components/ui/Primitives';
import { TransmuteMark } from '@/components/ui/TransmuteLogo';
import { CASHFLOW_FORECAST, DASHBOARD_SPARKLINES } from '@/data/mockData';
import { formatRs } from '@/utils/format';

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div className="w-24 h-10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardScreen() {
  const {
    language,
    setRoute,
    navigateToEntity,
    setAiLogOpen,
    documents,
    customers,
    inventory,
    alerts,
    createDraftPoFromInventory,
  } = useErp();

  const [forecastHorizon, setForecastHorizon] = useState<30 | 60 | 90>(30);

  const greeting =
    language === 'si'
      ? 'ආයුබෝවන්, රොහාන් — අද දින සාරාංශය'
      : language === 'ta'
      ? 'வணக்கம், ரோஹான் — இன்றைய சுருக்கம்'
      : 'Good morning, Rohan — Daily Digest';

  const docsReviewCount = documents.filter((d) => d.status === 'needs-review').length;
  const overdue30Count = customers.filter((c) => c.daysOverdue >= 30).length;
  const openAlertsCount = alerts.filter((a) => a.status === 'open').length;

  const totalReceivables = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const topDebtors = [...customers]
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 5);

  const lowStockItems = inventory.filter(
    (i) => i.warehouseStock + i.shopStock + i.vanStock <= i.reorderLevel
  );

  const forecastData = CASHFLOW_FORECAST[forecastHorizon];
  const projectedEndBalance = forecastData[forecastData.length - 1].balance * 1000;

  const kpis = [
    {
      label: 'Cash Position',
      value: formatRs(4860000),
      delta: '+6.2% vs last wk',
      positive: true,
      spark: DASHBOARD_SPARKLINES.cash,
      color: '#10B981',
      sub: 'ComBank + Sampath + Cash',
      onClick: () => setRoute('accounting'),
    },
    {
      label: "Today's Sales",
      value: formatRs(642500),
      delta: '+14.8% vs avg',
      positive: true,
      spark: DASHBOARD_SPARKLINES.sales,
      color: '#EA581A',
      sub: '14 orders (8 via WhatsApp)',
      onClick: () => setRoute('orders'),
    },
    {
      label: 'Receivables (Owed to You)',
      value: formatRs(totalReceivables),
      delta: `${overdue30Count} accounts 30+ days`,
      positive: false,
      spark: DASHBOARD_SPARKLINES.receivables,
      color: '#D97706',
      sub: 'Rs. 1.46M overdue >30d',
      onClick: () => setRoute('collections'),
    },
    {
      label: 'Payables (You Owe)',
      value: formatRs(1940000),
      delta: 'Rs. 695k due this week',
      positive: true,
      spark: DASHBOARD_SPARKLINES.payables,
      color: '#64748B',
      sub: '5 open supplier bills',
      onClick: () => setRoute('documents'),
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={greeting}
        subtitle="Tuesday, 14 April 2026 · Everything synced across Peliyagoda Stores, Pettah Shop, Van 1 & ComBank"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4 text-[#EA581A]" />}
              onClick={() => setAiLogOpen(true)}
            >
              AI Action Log
            </Button>
            <Button
              variant="gold"
              size="sm"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => setRoute('reports')}
            >
              Ask Transmute
            </Button>
          </>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5" onClick={kpi.onClick}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {kpi.label}
                </p>
                <p className="text-[24px] font-semibold tracking-[-0.025em] text-zinc-900 dark:text-white mt-1.5 tabular-nums">
                  {kpi.value}
                </p>
              </div>
              <MiniSparkline data={kpi.spark} color={kpi.color} />
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-medium',
                  kpi.positive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                )}
              >
                {kpi.positive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {kpi.delta}
              </span>
              <span className="text-zinc-400 truncate">{kpi.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Structured AI Morning Digest Bar */}
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#FF9E66] to-[#EA581A]" />
        <div className="pl-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <TransmuteMark size={24} />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                  Needs Your Attention Today
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Transmute auto-posted 2 matched bills & reconciled Rs. 218,000 from Nugegoda Fresh Mart overnight.
                </p>
              </div>
            </div>
            <button
              onClick={() => setAiLogOpen(true)}
              className="text-xs font-medium text-[#EA581A] dark:text-[#FF9E66] hover:underline self-start sm:self-auto cursor-pointer"
            >
              View AI audit trail →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => navigateToEntity('documents', 'DOC-9041')}
              className="group p-3.5 rounded-xl bg-stone-50/90 hover:bg-[#FFF4EE]/70 dark:bg-zinc-900/70 dark:hover:bg-[#EA581A]/10 border border-stone-200/80 dark:border-zinc-800 hover:border-[#FFD5BE] dark:hover:border-[#EA581A]/35 text-left transition-all flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <FileCheck2 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {docsReviewCount} invoices need review
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    Marina Oils rate variance & Serendib bill
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#EA581A] shrink-0 transition-colors" />
            </button>

            <button
              onClick={() => setRoute('collections')}
              className="group p-3.5 rounded-xl bg-stone-50/90 hover:bg-[#FFF4EE]/70 dark:bg-zinc-900/70 dark:hover:bg-[#EA581A]/10 border border-stone-200/80 dark:border-zinc-800 hover:border-[#FFD5BE] dark:hover:border-[#EA581A]/35 text-left transition-all flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {overdue30Count} customers 30+ days overdue
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    Rs. 1.46M ready for WhatsApp reminders
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#EA581A] shrink-0 transition-colors" />
            </button>

            <button
              onClick={() => setRoute('alerts')}
              className="group p-3.5 rounded-xl bg-stone-50/90 hover:bg-[#FFF4EE]/70 dark:bg-zinc-900/70 dark:hover:bg-[#EA581A]/10 border border-stone-200/80 dark:border-zinc-800 hover:border-[#FFD5BE] dark:hover:border-[#EA581A]/35 text-left transition-all flex items-center justify-between gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#FFF4EE] dark:bg-[#EA581A]/15 text-[#EA581A] dark:text-[#FF9E66] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                    {openAlertsCount} active anomaly alerts
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    Bank account change & duplicate bill check
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#EA581A] shrink-0 transition-colors" />
            </button>
          </div>
        </div>
      </Card>

      {/* Forecast Chart + Who Owes Me Most */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cash-Flow Forecast */}
        <Card className="xl:col-span-2 p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">
                  Cash-Flow Forecast
                </h2>
                <StatusChip label="AI Projected" tone="gold" dot={false} />
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Based on open invoices, historical customer pay speed, and scheduled supplier bills (in Rs. thousands)
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-stone-100 dark:bg-zinc-900 p-1 self-start border border-stone-200/60 dark:border-zinc-800">
              {([30, 60, 90] as const).map((days) => (
                <button
                  key={days}
                  onClick={() => setForecastHorizon(days)}
                  className={cn(
                    'px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer',
                    forecastHorizon === days
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                  )}
                >
                  {days} Days
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5 p-4 rounded-xl bg-stone-50/90 dark:bg-[#121214] border border-stone-200/60 dark:border-zinc-800/80">
            <div>
              <div className="text-[11px] text-zinc-500">Current Cash</div>
              <div className="text-sm font-semibold tabular-nums mt-0.5 text-zinc-900 dark:text-white">Rs. 4,860,000</div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500">Projected ({forecastHorizon}d)</div>
              <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums mt-0.5 flex items-center gap-1">
                {formatRs(projectedEndBalance)}
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-[11px] text-zinc-500">Confidence Band</div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white mt-0.5">
                ±6.5% <span className="text-[11px] font-normal text-zinc-400">(High)</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EA581A" stopOpacity={0.24} />
                    <stop offset="95%" stopColor="#FF9E66" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="emeraldIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#a8a29e" opacity={0.18} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#71717a' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}M`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(168,162,158,0.25)',
                    fontSize: 12,
                  }}
                  formatter={(value, name) => [
                    `Rs. ${(Number(value ?? 0) * 1000).toLocaleString()}`,
                    name === 'balance' ? 'Projected Balance' : name === 'inflow' ? 'Cash In' : 'Cash Out',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="#EA581A"
                  strokeWidth={2.5}
                  fill="url(#goldBalance)"
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#10B981"
                  strokeWidth={1.75}
                  fill="url(#emeraldIn)"
                />
                <Line
                  type="monotone"
                  dataKey="outflow"
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-5 mt-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA581A]" /> Net Cash Balance
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Expected Cash In
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-red-500" /> Scheduled Outflows
            </span>
          </div>
        </Card>

        {/* Who Owes Me Most */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Who Owes Me Most
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click a customer to view timeline or send reminder
              </p>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setRoute('collections')}>
              Collect <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2.5 flex-1">
            {topDebtors.map((c) => {
              const util = Math.round((c.outstandingBalance / c.creditLimit) * 100);
              return (
                <button
                  key={c.id}
                  onClick={() => navigateToEntity('customers', c.id)}
                  className="w-full p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {c.name}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">
                      {formatRs(c.outstandingBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1.5">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {util}% of {formatRs(c.creditLimit, true)} limit
                    </span>
                    {c.daysOverdue >= 30 ? (
                      <StatusChip label={`${c.daysOverdue}d overdue`} tone="red" />
                    ) : c.daysOverdue > 0 ? (
                      <StatusChip label={`${c.daysOverdue}d overdue`} tone="amber" />
                    ) : (
                      <StatusChip label="Current" tone="green" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts + Today's AI Automation Highlights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low-Stock Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Low-Stock Alerts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Items below reorder threshold across Warehouse, Shop & Van
                </p>
              </div>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setRoute('inventory')}>
              All Stock <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-3">
            {lowStockItems.map((item) => {
              const totalQty = item.warehouseStock + item.shopStock + item.vanStock;
              const pct = Math.min(100, Math.round((totalQty / item.reorderLevel) * 100));
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {item.name}
                      </p>
                      <StatusChip
                        label={`${item.daysUntilStockout ?? 2}d left`}
                        tone={totalQty < item.reorderLevel * 0.45 ? 'red' : 'amber'}
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                        {totalQty} {item.unit} left
                      </span>
                      <span>·</span>
                      <span>Reorder at {item.reorderLevel}</span>
                      <span>·</span>
                      <span className="hidden sm:inline">
                        WH {item.warehouseStock} / Shop {item.shopStock} / Van {item.vanStock}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          pct < 45 ? 'bg-red-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => createDraftPoFromInventory(item)}
                  >
                    Draft PO ({item.suggestedReorderQty ?? 60})
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick Actions & What AI Handled Today */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    Handled by Transmute Today
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Every automated step follows your approval rules
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="xs" onClick={() => setAiLogOpen(true)}>
                Full Log <ArrowRight className="w-3 h-3" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  title: 'Auto-posted Ceylon Leaf Tea invoice CLT-7729 (Rs. 202,400)',
                  meta: '98% confidence · Exact 3-way match with PO-2026-111 & GRN-878',
                  route: 'documents' as const,
                  id: 'DOC-9039',
                },
                {
                  title: 'Transcribed Nugegoda Fresh Mart WhatsApp voice note (0:14)',
                  meta: 'Created Order SO-4820 (Rs. 299,600) · Stock verified in Peliyagoda Stores',
                  route: 'orders' as const,
                  id: 'SO-4820',
                },
                {
                  title: 'Blocked payment on Serendib Flour bill #SFM-4412',
                  meta: 'Fraud check caught changed supplier bank A/C (····9183 vs verified ····4409)',
                  route: 'alerts' as const,
                  id: 'ALT-01',
                },
                {
                  title: 'Matched 3 ComBank CEFTS transfers ready for 1-click reconciliation',
                  meta: 'Rs. 530,800 matched at ≥92% confidence',
                  route: 'accounting' as const,
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => navigateToEntity(item.route, item.id)}
                  className="w-full p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {item.meta}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-[#EA581A]" />
              Estimated time saved this week: <strong className="text-zinc-900 dark:text-white">9.4 hours</strong>
            </span>
            <button
              onClick={() => setRoute('settings')}
              className="text-[#EA581A] dark:text-[#FF9E66] font-medium hover:underline cursor-pointer"
            >
              Automation rules
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
