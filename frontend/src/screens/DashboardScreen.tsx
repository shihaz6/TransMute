import React, { useEffect, useState } from 'react';
import { erpApi } from '@/api/erp';
import type { DailyHaikuDto } from '@/api/dto';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Package,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { Button, Card, cn, PageHeader, StatusChip } from '@/components/ui/Primitives';
import { TransmuteMark } from '@/components/ui/TransmuteLogo';
import { formatRs } from '@/utils/format';

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400 py-6 text-center">{message}</p>
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
    orders,
    pos,
    ledger,
    aiLogs,
    createDraftPoFromInventory,
  } = useErp();

  const [haiku, setHaiku] = useState<DailyHaikuDto | null>(null);
  useEffect(() => {
    erpApi
      .dailyHaiku()
      .then(setHaiku)
      .catch(() => setHaiku(null));
  }, []);

  const now = new Date();
  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const greeting =
    language === 'si'
      ? 'ආයුබෝවන් — අද දින සාරාංශය'
      : language === 'ta'
      ? 'வணக்கம் — இன்றைய சுருக்கம்'
      : 'Good morning — Daily Digest';

  const docsReviewCount = documents.filter((d) => d.status === 'needs-review').length;
  const overdueCustomers = customers.filter((c) => c.daysOverdue >= 30);
  const overdue30Count = overdueCustomers.length;
  const overdue30Total = overdueCustomers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const openAlerts = alerts.filter((a) => a.status === 'open');

  const totalReceivables = customers.reduce((sum, c) => sum + c.outstandingBalance, 0);
  const topDebtors = [...customers]
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 5);

  const openPos = pos.filter((p) => p.status === 'draft' || p.status === 'sent' || p.status === 'partial-received');
  const openPayables = openPos.reduce((sum, p) => sum + p.total, 0);

  const salesOrders = orders.filter((o) => o.type === 'order');
  const salesTotal = salesOrders.reduce((sum, o) => sum + o.total, 0);

  // Ledger is kept newest-first; its latest running balance is the cash position.
  const cashPosition = ledger.length > 0 ? ledger[0].runningBalance : null;

  const lowStockItems = inventory.filter(
    (i) => i.warehouseStock + i.shopStock + i.vanStock <= i.reorderLevel
  );

  const kpis = [
    {
      label: 'Cash Position',
      value: cashPosition === null ? '—' : formatRs(cashPosition),
      delta: ledger.length > 0 ? `${ledger.length} ledger entries` : 'No ledger entries yet',
      positive: true,
      sub: 'Latest ledger balance',
      onClick: () => setRoute('accounting'),
    },
    {
      label: 'Sales Orders',
      value: formatRs(salesTotal),
      delta: `${salesOrders.length} sales orders`,
      positive: true,
      sub: 'Total of recorded orders',
      onClick: () => setRoute('orders'),
    },
    {
      label: 'Receivables (Owed to You)',
      value: formatRs(totalReceivables),
      delta: `${overdue30Count} accounts 30+ days`,
      positive: false,
      sub: overdue30Count > 0 ? `${formatRs(overdue30Total)} overdue >30d` : 'Nothing overdue >30d',
      onClick: () => setRoute('collections'),
    },
    {
      label: 'Payables (You Owe)',
      value: formatRs(openPayables),
      delta: `${openPos.length} open purchase orders`,
      positive: true,
      sub: 'Draft, sent or partly received POs',
      onClick: () => setRoute('documents'),
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title={greeting}
        subtitle={dateLabel}
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

      {/* Daily haiku from the backend. Hidden when the backend cannot be reached. */}
      {haiku && (
        <Card className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#C2410C] dark:text-[#FF9E66]">
            Haiku of the day
            <span className="ml-2 normal-case tracking-normal font-normal text-zinc-400">
              {haiku.source === 'ai' ? 'written by AI today' : 'from the built-in set'}
            </span>
          </p>
          <blockquote className="mt-2 text-sm italic text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {haiku.lines.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </blockquote>
        </Card>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-5" onClick={kpi.onClick}>
            <div className="min-w-0">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{kpi.label}</p>
              <p className="text-[24px] font-semibold tracking-[-0.025em] text-zinc-900 dark:text-white mt-1.5 tabular-nums">
                {kpi.value}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-xs">
              <span
                className={cn(
                  'inline-flex items-center font-medium',
                  kpi.positive
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                )}
              >
                {kpi.delta}
              </span>
              <span className="text-zinc-400 truncate">{kpi.sub}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Needs Attention */}
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
                  {docsReviewCount + overdue30Count + openAlerts.length === 0
                    ? 'Nothing is waiting on you right now.'
                    : `${docsReviewCount} to review · ${overdue30Count} overdue accounts · ${openAlerts.length} open alerts`}
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
              onClick={() => setRoute('documents')}
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
                    Incoming supplier documents
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
                    {overdue30Count > 0 ? `${formatRs(overdue30Total)} ready for reminders` : 'No reminders due'}
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
                    {openAlerts.length} active anomaly alerts
                  </div>
                  <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                    {openAlerts[0]?.title ?? 'No open alerts'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-[#EA581A] shrink-0 transition-colors" />
            </button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cash-Flow Forecast: needs real ledger and open-invoice history */}
        <Card className="xl:col-span-2 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-[15px] font-semibold text-zinc-900 dark:text-white">Cash-Flow Forecast</h2>
            <StatusChip label="AI Projected" tone="gold" dot={false} />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            Built from open invoices, customer pay speed and scheduled supplier bills.
          </p>
          <EmptyState message="No forecast yet. It appears once ledger entries and open invoices are recorded." />
        </Card>

        {/* Who Owes Me Most */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Who Owes Me Most</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click a customer to view timeline or send reminder
              </p>
            </div>
            <Button variant="ghost" size="xs" onClick={() => setRoute('collections')}>
              Collect <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2.5 flex-1">
            {topDebtors.length === 0 && <EmptyState message="No customer balances yet." />}
            {topDebtors.map((c) => {
              const util = c.creditLimit > 0 ? Math.round((c.outstandingBalance / c.creditLimit) * 100) : 0;
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

      {/* Low Stock Alerts + Recent AI Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low-Stock Alerts */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Low-Stock Alerts</h2>
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
            {lowStockItems.length === 0 && <EmptyState message="No items are below their reorder level." />}
            {lowStockItems.map((item) => {
              const totalQty = item.warehouseStock + item.shopStock + item.vanStock;
              const pct = item.reorderLevel > 0 ? Math.min(100, Math.round((totalQty / item.reorderLevel) * 100)) : 0;
              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{item.name}</p>
                      {item.daysUntilStockout !== undefined && (
                        <StatusChip
                          label={`${item.daysUntilStockout}d left`}
                          tone={totalQty < item.reorderLevel * 0.45 ? 'red' : 'amber'}
                        />
                      )}
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
                        className={cn('h-full rounded-full', pct < 45 ? 'bg-red-500' : 'bg-amber-500')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <Button variant="secondary" size="xs" onClick={() => createDraftPoFromInventory(item)}>
                    Draft PO{item.suggestedReorderQty ? ` (${item.suggestedReorderQty})` : ''}
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Recent AI Actions */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Handled by Transmute</h2>
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
              {aiLogs.length === 0 && <EmptyState message="No automated actions recorded yet." />}
              {aiLogs.slice(0, 4).map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setAiLogOpen(true)}
                  className="w-full p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-100/80 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-left transition-colors flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{entry.action}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {entry.module} · {entry.reason}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
