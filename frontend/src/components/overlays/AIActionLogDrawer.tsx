import React, { useState } from 'react';
import { CheckCircle2, Clock, ShieldCheck, Sparkles, UserCheck, X } from 'lucide-react';
import { useErp } from '@/context/ErpContext';
import { ConfidenceBadge, StatusChip } from '@/components/ui/Primitives';

export function AIActionLogDrawer() {
  const { aiLogOpen, setAiLogOpen, aiLogs } = useErp();
  const [moduleFilter, setModuleFilter] = useState<string>('All');

  if (!aiLogOpen) return null;

  const modules = ['All', 'Documents', 'Orders', 'Collections', 'Inventory', 'Accounting', 'Alerts', 'Catalyst'];
  const filtered =
    moduleFilter === 'All' ? aiLogs : aiLogs.filter((l) => l.module === moduleFilter);

  const outcomeTone = {
    'auto-executed': 'green' as const,
    approved: 'gold' as const,
    flagged: 'amber' as const,
    rejected: 'red' as const,
  };

  const outcomeLabel = {
    'auto-executed': 'Auto-executed',
    approved: 'Human Approved',
    flagged: 'Held for Review',
    rejected: 'Rejected',
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => setAiLogOpen(false)}
      />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#151517] border-l border-stone-200 dark:border-zinc-800 h-full flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-stone-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF4EE] dark:bg-[#EA581A]/15 border border-[#FFD5BE] dark:border-[#EA581A]/30 flex items-center justify-center text-[#EA581A] dark:text-[#FF9E66]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                AI Action Log & Audit Trail
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every decision Transmute AI made, why it happened, and who approved it.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAiLogOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Module filter strip */}
        <div className="px-6 py-3 border-b border-stone-100 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto">
          {modules.map((m) => (
            <button
              key={m}
              onClick={() => setModuleFilter(m)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                moduleFilter === m
                  ? 'bg-[#EA581A] text-white'
                  : 'bg-stone-100 text-zinc-600 hover:bg-stone-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Log feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#C2410C] dark:text-[#FF9E66]">
                    {entry.module}
                  </span>
                  <StatusChip label={outcomeLabel[entry.outcome]} tone={outcomeTone[entry.outcome]} />
                </div>
                {entry.confidence !== undefined && (
                  <ConfidenceBadge score={entry.confidence} compact />
                )}
              </div>

              <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">
                {entry.action}
              </p>

              <div className="p-2.5 rounded-lg bg-white dark:bg-[#111113] border border-stone-200/70 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-300 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#EA581A] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-800 dark:text-slate-100">Why:</strong> {entry.reason}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                  {entry.approvedBy}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {entry.timestamp}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Zero silent postings · Full auditability enabled
          </span>
        </div>
      </div>
    </div>
  );
}
