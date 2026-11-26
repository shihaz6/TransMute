import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCheck,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { Button, Card, cn, PageHeader, StatusChip } from '@/components/ui/Primitives';
import { CollectionItem, ReminderStatus } from '@/types/erp';
import { formatRs } from '@/utils/format';

export function CollectionsScreen() {
  const { collections, setCollections, addAiLog, addToast, navigateToEntity } = useErp();
  const [selectedId, setSelectedId] = useState<string>(collections[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<'all' | ReminderStatus>('all');

  const selected = collections.find((c) => c.id === selectedId) || collections[0];

  const filtered = collections.filter(
    (c) => statusFilter === 'all' || c.status === statusFilter
  );

  const totalOverdue = collections.reduce((s, c) => s + c.overdueAmount, 0);
  const totalPromised = collections
    .filter((c) => c.status === 'promised')
    .reduce((s, c) => s + (c.promisedAmount || c.overdueAmount), 0);

  const updateDraftMessage = (id: string, msg: string) => {
    setCollections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, draftMessage: msg } : c))
    );
  };

  const changeTone = (item: CollectionItem, tone: CollectionItem['tone']) => {
    const templates = {
      friendly: `Hello ${item.contactPerson},\n\nHope business is going well! Gentle reminder that invoices ${item.invoiceRefs.join(', ')} (${formatRs(item.overdueAmount)}) are now ${item.daysOverdue} days past the credit period.\n\nKindly share the payment slip at your convenience. Thank you!`,
      firm: `Dear ${item.contactPerson},\n\nYour overdue balance of ${formatRs(item.overdueAmount)} (${item.invoiceRefs.join(', ')}) is now ${item.daysOverdue} days overdue.\n\nPlease settle at least 50% today so upcoming deliveries aren't held up. Thank you.`,
      final: `Dear ${item.contactPerson},\n\nFinal reminder before credit hold: ${formatRs(item.overdueAmount)} against ${item.invoiceRefs.join(', ')} has been pending for ${item.daysOverdue} days.\n\nKindly confirm an exact settlement date today to avoid pausing credit dispatches.`,
    };
    setCollections((prev) =>
      prev.map((c) =>
        c.id === item.id ? { ...c, tone, draftMessage: templates[tone] } : c
      )
    );
  };

  const handleApproveAndSend = (item: CollectionItem) => {
    setCollections((prev) =>
      prev.map((c) =>
        c.id === item.id
          ? { ...c, status: 'sent', lastContacted: 'Just now', scheduledFor: 'Sent today' }
          : c
      )
    );
    addAiLog({
      module: 'Collections',
      action: `Sent approved WhatsApp reminder to ${item.customerName} (${formatRs(item.overdueAmount)})`,
      reason: `Account ${item.daysOverdue} days overdue; owner reviewed & approved ${item.tone} WhatsApp message.`,
      confidence: 96,
      approvedBy: 'Owner',
      outcome: 'approved',
    });
    addToast({
      title: 'WhatsApp Reminder Sent',
      description: `Delivered to ${item.contactPerson} (${item.phone})`,
      variant: 'success',
    });
  };

  const handleMarkPromised = (item: CollectionItem) => {
    // Default follow-up is one week out; the owner can adjust it in the record.
    const followUp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    setCollections((prev) =>
      prev.map((c) =>
        c.id === item.id
          ? {
              ...c,
              status: 'promised',
              promisedDate: followUp,
              promisedAmount: Math.round(item.overdueAmount * 0.5),
              scheduledFor: `Follow-up ${followUp}`,
            }
          : c
      )
    );
    addToast({
      title: 'Promise to Pay Recorded',
      description: `${item.customerName} scheduled for follow-up on ${followUp}.`,
      variant: 'info',
    });
  };

  const statusChip = (status: ReminderStatus) => {
    if (status === 'promised') return <StatusChip label="Promised to pay" tone="green" />;
    if (status === 'sent') return <StatusChip label="Reminder sent" tone="blue" />;
    if (status === 'scheduled') return <StatusChip label="Scheduled" tone="amber" />;
    return <StatusChip label="Escalated" tone="red" />;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Collections Board"
        subtitle="Collect faster without awkward calls — review, edit, and approve AI-drafted WhatsApp payment reminders."
      />

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500">Total Overdue on Board</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-red-600 dark:text-red-400">
            {formatRs(totalOverdue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{collections.length} overdue accounts</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Promised to Pay</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatRs(totalPromised)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">From recorded promises</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500">Queued for Owner Approval</div>
          <div className="text-2xl font-bold mt-1 tabular-nums text-amber-600 dark:text-amber-400">
            {collections.filter((c) => c.status === 'scheduled').length} reminders
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Never sent without your approval</div>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(
          [
            { id: 'all', label: `All (${collections.length})` },
            { id: 'scheduled', label: `Scheduled (${collections.filter((c) => c.status === 'scheduled').length})` },
            { id: 'sent', label: `Sent (${collections.filter((c) => c.status === 'sent').length})` },
            { id: 'promised', label: `Promised to Pay (${collections.filter((c) => c.status === 'promised').length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer',
              statusFilter === tab.id
                ? 'bg-zinc-900 text-white dark:bg-[#EA581A] dark:text-white'
                : 'bg-white dark:bg-[#18181B] border border-stone-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Board Split: Left Overdue Cards, Right WhatsApp Reminder Editor & Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-5 space-y-3">
          {filtered.length === 0 && (
            <Card className="p-6 text-center text-xs text-slate-500">
              No overdue accounts on the board.
            </Card>
          )}
          {filtered.map((item) => {
            const isSelected = selected?.id === item.id;
            return (
              <Card
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'p-4 transition-all',
                  isSelected &&
                    'ring-2 ring-[#EA581A] border-[#EA581A] bg-[#FFF4EE]/45 dark:bg-[#EA581A]/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.customerName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.contactPerson} · {item.invoiceRefs.join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatRs(item.overdueAmount)}
                    </div>
                    <div
                      className={cn(
                        'text-[11px] font-medium mt-0.5',
                        item.daysOverdue >= 30 ? 'text-red-600' : 'text-amber-700 dark:text-amber-400'
                      )}
                    >
                      {item.daysOverdue} days overdue
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {statusChip(item.status)}
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.promisedDate ? `Promised ${item.promisedDate}` : item.scheduledFor}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Right: Editable WhatsApp Reminder & Preview */}
        {selected && (
          <Card className="xl:col-span-7 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                    WhatsApp Reminder · {selected.customerName}
                  </h2>
                  {statusChip(selected.status)}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  To: {selected.contactPerson} ({selected.phone}) · Invoices {selected.invoiceRefs.join(', ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigateToEntity('customers', selected.customerId)}
              >
                Customer Ledger →
              </Button>
            </div>

            {/* Tone selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#EA581A]" />
                AI Message Tone:
              </span>
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                {(['friendly', 'firm', 'final'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTone(selected, t)}
                    className={cn(
                      'px-3 py-1 rounded-md text-xs font-medium capitalize cursor-pointer',
                      selected.tone === t
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    )}
                  >
                    {t === 'final' ? 'Final Notice' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Editable textarea */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Edit message before sending
              </label>
              <textarea
                rows={6}
                value={selected.draftMessage}
                onChange={(e) => updateDraftMessage(selected.id, e.target.value)}
                className="w-full p-3.5 text-xs rounded-xl bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 focus:outline-none focus:border-[#EA581A] leading-relaxed text-zinc-800 dark:text-zinc-100"
              />
            </div>

            {/* WhatsApp Live Bubble Preview */}
            <div className="rounded-xl p-4 bg-[#EAE6DF] dark:bg-[#0D131F] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-2.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                WhatsApp Recipient Preview
              </div>
              <div className="ml-auto max-w-md rounded-2xl rounded-tr-sm bg-[#DCF8C6] dark:bg-emerald-950/90 border border-emerald-200/80 dark:border-emerald-800/70 p-3.5 text-xs text-slate-900 dark:text-emerald-50 whitespace-pre-line shadow-xs leading-relaxed">
                {selected.draftMessage}
                <div className="flex items-center justify-end gap-1 mt-1.5 text-[10px] text-slate-500 dark:text-emerald-300/70">
                  <span>Ready to send</span>
                  <CheckCheck className="w-3 h-3 text-sky-500" />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<CalendarCheck className="w-4 h-4 text-emerald-600" />}
                onClick={() => handleMarkPromised(selected)}
              >
                Record Promise to Pay
              </Button>
              <Button
                variant="gold"
                size="sm"
                icon={<Send className="w-4 h-4" />}
                onClick={() => handleApproveAndSend(selected)}
              >
                Approve & Send via WhatsApp
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
