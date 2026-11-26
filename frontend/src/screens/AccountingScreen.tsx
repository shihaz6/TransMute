import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building,
  CheckCircle2,
  Landmark,
  Sparkles,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import {
  Button,
  Card,
  cn,
  ConfidenceBadge,
  PageHeader,
  StatusChip,
} from '@/components/ui/Primitives';
import { ChequeStatus } from '@/types/erp';
import { formatRs } from '@/utils/format';

export function AccountingScreen() {
  const { ledger, payments, bankRecon, updateChequeStatus, acceptBankMatch } = useErp();
  const [tab, setTab] = useState<'ledger' | 'payments' | 'reconcile'>('ledger');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'Cash' | 'Bank Transfer' | 'Cheque'>('all');

  const matchedCount = bankRecon.filter((b) => b.status === 'matched').length;
  const reconPct = Math.round((matchedCount / bankRecon.length) * 100);

  const chequeStatusChip = (status: ChequeStatus) => {
    switch (status) {
      case 'cleared':
        return <StatusChip label="Cleared" tone="green" />;
      case 'deposited':
        return <StatusChip label="Deposited" tone="blue" />;
      case 'received':
        return <StatusChip label="Received" tone="amber" />;
      case 'bounced':
        return <StatusChip label="Bounced" tone="red" />;
    }
  };

  const filteredPayments = payments.filter(
    (p) => paymentFilter === 'all' || p.method === paymentFilter
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting & Banking"
        subtitle="Plain-English money in & out, post-dated cheque clearance tracking, and AI-assisted Commercial Bank statement reconciliation."
      />

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        {(
          [
            { id: 'ledger', label: 'Simple Ledger' },
            { id: 'payments', label: `Payments & Cheque Tracker (${payments.filter((p) => p.method === 'Cheque').length} cheques)` },
            {
              id: 'reconcile',
              label: `Bank Reconciliation (${bankRecon.filter((b) => b.status !== 'matched').length} to match)`,
            },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3.5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors',
              tab === t.id
                ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Simple Ledger */}
      {tab === 'ledger' && (
        <Card className="overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Owner&apos;s Simple Cash & Bank Ledger
              </h2>
              <p className="text-xs text-slate-500">
                No accounting jargon — clear Money In, Money Out, and running cash balance in Rs.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500">Current Balance</div>
              <div className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatRs(ledger[0]?.runningBalance ?? 4860000)}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description & Party</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium text-right">Money In</th>
                  <th className="px-4 py-3 font-medium text-right">Money Out</th>
                  <th className="px-5 py-3 font-medium text-right">Balance (Rs.)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {row.description}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.party} · {row.category}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusChip
                        label={row.source}
                        tone={row.source === 'Manual' ? 'slate' : 'gold'}
                        dot={false}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {row.type === 'in' ? `+ ${formatRs(row.amount)}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-red-600 dark:text-red-400 whitespace-nowrap">
                      {row.type === 'out' ? `- ${formatRs(row.amount)}` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {formatRs(row.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Payments & Cheque Status Tracker */}
      {tab === 'payments' && (
        <div className="space-y-4">
          {/* Cheque Pipeline Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['received', 'deposited', 'cleared', 'bounced'] as ChequeStatus[]).map((st) => {
              const list = payments.filter((p) => p.method === 'Cheque' && p.chequeStatus === st);
              const sum = list.reduce((s, p) => s + p.amount, 0);
              return (
                <Card key={st} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs capitalize text-slate-500">Cheques {st}</span>
                    {chequeStatusChip(st)}
                  </div>
                  <div className="text-lg font-bold tabular-nums mt-2">{formatRs(sum)}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{list.length} cheque(s)</div>
                </Card>
              );
            })}
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-1.5">
                {(['all', 'Cheque', 'Bank Transfer', 'Cash'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentFilter(m)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer',
                      paymentFilter === m
                        ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                        : 'text-zinc-600 hover:bg-stone-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    )}
                  >
                    {m === 'all' ? 'All Methods' : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 dark:bg-slate-950/70 text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date & Customer</th>
                    <th className="px-4 py-3 font-medium">Method & Ref</th>
                    <th className="px-4 py-3 font-medium text-right">Amount (Rs.)</th>
                    <th className="px-4 py-3 font-medium">Cheque / Payment Status</th>
                    <th className="px-5 py-3 font-medium text-right">Update Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {p.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {p.date} · Against {p.invoiceRef}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {p.method}
                          {p.chequeBank ? ` (${p.chequeBank})` : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Ref: {p.reference}
                          {p.chequeDueDate ? ` · Due ${p.chequeDueDate}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold tabular-nums whitespace-nowrap">
                        {formatRs(p.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        {p.method === 'Cheque' && p.chequeStatus ? (
                          chequeStatusChip(p.chequeStatus)
                        ) : (
                          <StatusChip label="Settled" tone="green" />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {p.method === 'Cheque' && p.chequeStatus === 'received' && (
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => updateChequeStatus(p.id, 'deposited')}
                          >
                            Mark Deposited
                          </Button>
                        )}
                        {p.method === 'Cheque' && p.chequeStatus === 'deposited' && (
                          <div className="inline-flex gap-1.5">
                            <Button
                              variant="success"
                              size="xs"
                              onClick={() => updateChequeStatus(p.id, 'cleared')}
                            >
                              Cleared
                            </Button>
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => updateChequeStatus(p.id, 'bounced')}
                            >
                              Bounced
                            </Button>
                          </div>
                        )}
                        {p.method === 'Cheque' && p.chequeStatus === 'bounced' && (
                          <span className="text-[11px] text-red-600 font-medium">
                            Flagged on customer risk
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Bank Statement Reconciliation */}
      {tab === 'reconcile' && (
        <div className="space-y-4">
          <Card className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#18181B] dark:bg-[#EA581A]/20 text-[#FF9E66] flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Commercial Bank Current A/C (····8821-01) — Live Statement Sync
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {matchedCount} of {bankRecon.length} statement lines reconciled ({reconPct}%)
                </p>
              </div>
            </div>
            <div className="w-full sm:w-56">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${reconPct}%` }}
                />
              </div>
            </div>
          </Card>

          <div className="space-y-3">
            {bankRecon.map((row) => (
              <Card key={row.id} className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  {/* Bank Statement Side */}
                  <div className="lg:col-span-5 flex items-start gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        row.type === 'credit'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50'
                          : 'bg-red-50 text-red-600 dark:bg-red-950/50'
                      )}
                    >
                      {row.type === 'credit' ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        <Building className="w-3 h-3" /> Bank Statement · {row.date}
                      </div>
                      <div className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-0.5 break-all">
                        {row.bankDescription}
                      </div>
                      <div
                        className={cn(
                          'text-sm font-bold tabular-nums mt-1',
                          row.type === 'credit'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-slate-900 dark:text-white'
                        )}
                      >
                        {row.type === 'credit' ? '+' : '-'} {formatRs(row.amount)}
                      </div>
                    </div>
                  </div>

                  {/* AI Suggested Match */}
                  <div className="lg:col-span-5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800">
                    {row.aiSuggestion && (
                      <>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-[#C2410C] dark:text-[#FF9E66] flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            AI Suggested Match
                          </span>
                          <ConfidenceBadge score={row.aiSuggestion.confidence} compact />
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {row.aiSuggestion.matchRef}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          {row.aiSuggestion.reason}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Action */}
                  <div className="lg:col-span-2 flex lg:justify-end">
                    {row.status === 'matched' ? (
                      <StatusChip
                        label="Reconciled"
                        tone="green"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      />
                    ) : (
                      <Button
                        variant="gold"
                        size="sm"
                        onClick={() => acceptBankMatch(row.id)}
                      >
                        Accept Match
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
